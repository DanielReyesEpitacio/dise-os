/**
 * CoreRealtime - Sistema de comunicación en tiempo real agnóstico
 * @param {Object} options - Configuración inicial
 * @returns {Object} API del sistema
 */
export function createCoreRealtime(options = {}) {
    // ==================== ESTADO INTERNO ====================
    const globalMiddleware = [];
    const routes = new Map();
    const eventListeners = new Map();
    const plugins = [];
    const lifecycleHooks = {
        beforeStart: [],
        afterStart: [],
        beforeMessage: [],
        afterMessage: [],
        onError: []
    };

    let transport = null;
    let globalAppContext = {};
    let instanceClientId = Math.random().toString(36).slice(2, 10);
    let isActive = false;

    // Configuración por defecto
    const defaultConfig = {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        debug: false,
        strictMode: true
    };

    let config = { ...defaultConfig, ...options };

    // Serializador por defecto (identity)
    let serializer = {
        encode: (data) => data,
        decode: (data) => data
    };

    // Error handler por defecto
    let errorHandler = (err, ctx) => {
        if (config.debug) {
            console.error(`[CoreRealtime] Error en evento [${ctx?.type}]:`, err);
        }
        ctx?.send?.('error', { message: err.message });
    };

    // Event emitter custom (opcional)
    let customEventEmitter = null;

    // ==================== MÉTODOS PRIVADOS ====================

    /**
     * Valida que un adapter cumpla con el contrato mínimo
     */
    function validateAdapter(instance) {
        const REQUIRED_METHODS = ['onMessage', 'send', 'broadcast'];
        
        for (const method of REQUIRED_METHODS) {
            if (typeof instance[method] !== 'function') {
                throw new Error(
                    `Adapter inválido: método "${method}" es requerido`
                );
            }
        }
    }

    /**
     * Envuelve el transport con serialización
     */
    function wrapTransport(originalTransport) {
        return {
            ...originalTransport,
            send: (type, payload, ...args) => {
                const encoded = serializer.encode(payload);
                return originalTransport.send(type, encoded, ...args);
            },
            broadcast: (type, payload, ...args) => {
                const encoded = serializer.encode(payload);
                return originalTransport.broadcast(type, encoded, ...args);
            },
            onMessage: (callback) => {
                originalTransport.onMessage((type, payload) => {
                    const decoded = serializer.decode(payload);
                    callback(type, decoded);
                });
            }
        };
    }

    /**
     * Ejecuta hooks del lifecycle
     */
    async function runHooks(hookName, ...args) {
        const hooks = lifecycleHooks[hookName] || [];
        for (const hook of hooks) {
            try {
                await hook(...args);
            } catch (err) {
                console.error(`Error en hook ${hookName}:`, err);
            }
        }
    }

    /**
     * Ejecuta guards de una ruta
     */
    async function runGuards(guards, ctx) {
        for (const guard of guards) {
            try {
                const result = await Promise.resolve().then(() => guard(ctx));
                
                // Soporta boolean o {allowed: boolean, reason?: string}
                const allowed = typeof result === 'boolean' 
                    ? result 
                    : result?.allowed;

                if (!allowed) {
                    if (config.debug) {
                        const reason = result?.reason || 'Sin razón especificada';
                        console.log(`[CoreRealtime] Guard rechazado: ${reason}`);
                    }
                    return false;
                }
            } catch (err) {
                console.error('[CoreRealtime] Error en guard:', err);
                return false;
            }
        }
        return true;
    }

    /**
     * Ejecuta middleware en cadena
     */
    async function runMiddleware(middleware, ctx) {
        let i = -1;

        async function next(j = 0) {
            if (j <= i) {
                throw new Error("next() llamado múltiples veces");
            }
            i = j;
            const fn = middleware[j];
            if (fn) {
                await fn(ctx, () => next(j + 1));
            }
        }

        try {
            await next();
            if (ctx.isStopped?.()) return false;
            return true;
        } catch (err) {
            console.error("[CoreRealtime] Error en middleware:", err);
            return false;
        }
    }

    /**
     * Crea el contexto para cada mensaje
     */
    function createContext(type, fullPayload) {
        // Permitir que el transport normalice el payload
        const normalized = transport.normalizePayload
            ? transport.normalizePayload(fullPayload)
            : fullPayload;

        const {
            clientId,
            payload,
            channel,
            applicationId,
            emitterClientId,
        } = normalized || {};

        let stopped = false;

        return {
            type,
            payload,
            applicationId,
            channel,
            remoteClient: clientId,
            localClientId: instanceClientId,
            send: transport.send,
            broadcast: transport.broadcast,
            emit: internalEmit,
            meta: {},
            appContext: globalAppContext,
            stop: () => { stopped = true; },
            isStopped: () => stopped,
            emitterClientId: emitterClientId,
        };
    }

    /**
     * Emit interno (usa custom emitter si existe)
     */
    function internalEmit(event, data) {
        if (customEventEmitter) {
            customEventEmitter.emit(event, data);
        } else {
            const callbacks = eventListeners.get(event) || [];
            for (const cb of callbacks) cb(data);
        }
    }

    // ==================== API PÚBLICA ====================

    /**
     * Registra middleware global que se ejecuta en todos los mensajes
     * @param {Array<Function>} middlewareList - Lista de funciones middleware
     * @returns {Object} API (chainable)
     */
    function registerGlobalMiddleware(middlewareList) {
        if (!Array.isArray(middlewareList)) {
            throw new Error('middlewareList debe ser un array');
        }
        globalMiddleware.push(...middlewareList);
        return api;
    }

    /**
     * Registra rutas con sus handlers, guards y middleware
     * @param {Array<Object>} routeList - Lista de rutas
     * @returns {Object} API (chainable)
     */
    function registerRoutes(routeList) {
        if (!Array.isArray(routeList)) {
            throw new Error('routeList debe ser un array');
        }

        for (const route of routeList) {
            const { event, guards = [], middleware = [], handler } = route;
            
            if (!event || !handler) {
                throw new Error('Ruta inválida: "event" y "handler" son requeridos');
            }

            if (typeof handler !== 'function') {
                throw new Error(`Handler para evento "${event}" debe ser una función`);
            }

            routes.set(event, { guards, middleware, handler });
        }
        return api;
    }

    /**
     * Configura el adapter de transporte (websocket, SSE, etc)
     * @param {Object} instance - Instancia del adapter
     * @returns {Object} API (chainable)
     */
    function adapter(instance) {
        if (!instance) {
            throw new Error('Adapter no puede ser null o undefined');
        }

        if (config.strictMode) {
            validateAdapter(instance);
        }

        transport = wrapTransport(instance);
        return api;
    }

    /**
     * Establece el contexto global de la aplicación
     * @param {Object} ctx - Contexto a inyectar
     * @returns {Object} API (chainable)
     */
    function setAppContext(ctx) {
        globalAppContext = ctx || {};
        return api;
    }

    /**
     * Inicia el sistema de comunicación
     * @returns {Object} API (chainable)
     */
    async function start() {
        if (!transport) {
            throw new Error('Adapter no definido. Usa .adapter() primero');
        }

        if (isActive) {
            console.warn('[CoreRealtime] Ya está iniciado');
            return api;
        }

        await runHooks('beforeStart');

        transport.onMessage(async (type, payload) => {
            const ctx = createContext(type, payload);

            await runHooks('beforeMessage', ctx);

            try {
                // Middleware global
                const accepted = await runMiddleware(globalMiddleware, ctx);
                if (!accepted) return;

                // Buscar ruta
                const route = routes.get(type);
                if (!route) {
                    if (config.debug) {
                        console.log(`[CoreRealtime] Sin handler para evento: ${type}`);
                    }
                    return;
                }

                // Guards
                const allowed = await runGuards(route.guards, ctx);
                if (!allowed) return;

                // Middleware de ruta
                const passed = await runMiddleware(route.middleware, ctx);
                if (!passed) return;

                // Handler
                await Promise.resolve().then(() => route.handler(ctx));

                await runHooks('afterMessage', ctx);

            } catch (err) {
                await runHooks('onError', err, ctx);
                errorHandler(err, ctx);
            }
        });

        isActive = true;
        await runHooks('afterStart');

        if (config.debug) {
            console.log('[CoreRealtime] Sistema iniciado');
        }

        return api;
    }

    /**
     * Detiene el sistema y limpia recursos
     * @returns {Object} API (chainable)
     */
    function stop() {
        if (!isActive) return api;

        // Limpiar listeners
        eventListeners.clear();

        // Desconectar transport si soporta cleanup
        if (typeof transport?.disconnect === 'function') {
            transport.disconnect();
        }

        isActive = false;

        if (config.debug) {
            console.log('[CoreRealtime] Sistema detenido');
        }

        return api;
    }

    /**
     * Resetea completamente el sistema
     * @returns {Object} API (chainable)
     */
    function reset() {
        stop();
        routes.clear();
        globalMiddleware.length = 0;
        globalAppContext = {};
        transport = null;
        plugins.length = 0;
        
        // Limpiar hooks
        for (const key in lifecycleHooks) {
            lifecycleHooks[key].length = 0;
        }

        if (config.debug) {
            console.log('[CoreRealtime] Sistema reseteado');
        }

        return api;
    }

    /**
     * Registra un listener para eventos internos
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función a ejecutar
     * @returns {Object} API (chainable)
     */
    function on(event, callback) {
        if (customEventEmitter) {
            customEventEmitter.on(event, callback);
        } else {
            if (!eventListeners.has(event)) {
                eventListeners.set(event, []);
            }
            eventListeners.get(event).push(callback);
        }
        return api;
    }

    /**
     * Remueve un listener de eventos internos
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función a remover
     * @returns {Object} API (chainable)
     */
    function off(event, callback) {
        if (customEventEmitter) {
            customEventEmitter.off(event, callback);
        } else {
            if (!eventListeners.has(event)) return api;
            const callbacks = eventListeners.get(event);
            const idx = callbacks.indexOf(callback);
            if (idx !== -1) {
                callbacks.splice(idx, 1);
            }
        }

        // Notificar al transport si soporta cleanup
        if (typeof transport?.off === 'function') {
            transport.off(event, callback);
        }

        return api;
    }

    /**
     * Emite un evento interno
     * @param {string} event - Nombre del evento
     * @param {*} data - Datos a enviar
     */
    function emit(event, data) {
        internalEmit(event, data);
    }

    /**
     * Instala un plugin
     * @param {Object|Function} plugin - Plugin a instalar
     * @returns {Object} API (chainable)
     */
    function use(plugin) {
        if (typeof plugin === 'function') {
            plugin(api, {
                getTransport: () => transport,
                getRoutes: () => routes,
                getContext: () => globalAppContext,
                getConfig: () => ({ ...config })
            });
        } else if (typeof plugin?.install === 'function') {
            plugin.install(api, {
                getTransport: () => transport,
                getRoutes: () => routes,
                getContext: () => globalAppContext,
                getConfig: () => ({ ...config })
            });
        } else {
            throw new Error('Plugin debe ser función o tener método install');
        }
        
        plugins.push(plugin);
        return api;
    }

    /**
     * Registra un hook del lifecycle
     * @param {string} name - Nombre del hook
     * @param {Function} callback - Función a ejecutar
     * @returns {Object} API (chainable)
     */
    function hook(name, callback) {
        if (!lifecycleHooks[name]) {
            throw new Error(
                `Hook "${name}" no existe. Disponibles: ${Object.keys(lifecycleHooks).join(', ')}`
            );
        }
        lifecycleHooks[name].push(callback);
        return api;
    }

    /**
     * Actualiza la configuración
     * @param {Object} options - Opciones a actualizar
     * @returns {Object} API (chainable)
     */
    function configure(options) {
        config = { ...config, ...options };
        return api;
    }

    /**
     * Establece un error handler personalizado
     * @param {Function} handler - Función (err, ctx) => void
     * @returns {Object} API (chainable)
     */
    function setErrorHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('Error handler debe ser una función');
        }
        errorHandler = handler;
        return api;
    }

    /**
     * Establece un serializador personalizado
     * @param {Object} custom - Objeto con métodos encode y decode
     * @returns {Object} API (chainable)
     */
    function setSerializer(custom) {
        if (!custom.encode || !custom.decode) {
            throw new Error('Serializer debe tener métodos encode y decode');
        }
        serializer = custom;
        return api;
    }

    /**
     * Establece un event emitter personalizado
     * @param {Object} emitter - Objeto con métodos on, off, emit
     * @returns {Object} API (chainable)
     */
    function setEventEmitter(emitter) {
        if (!emitter.on || !emitter.emit || !emitter.off) {
            throw new Error('Event emitter debe implementar on, emit, off');
        }
        customEventEmitter = emitter;
        return api;
    }

    /**
     * Obtiene el transport actual
     * @returns {Object|null}
     */
    function getTransport() {
        return transport;
    }

    /**
     * Obtiene el ID del cliente local
     * @returns {string}
     */
    function getClientId() {
        return instanceClientId;
    }

    /**
     * Verifica si el sistema está activo
     * @returns {boolean}
     */
    function isStarted() {
        return isActive;
    }

    /**
     * Obtiene la configuración actual
     * @returns {Object}
     */
    function getConfig() {
        return { ...config };
    }

    // ==================== API EXPORTADA ====================
    const api = {
        // Core
        registerGlobalMiddleware,
        registerRoutes,
        adapter,
        setAppContext,
        start,
        stop,
        reset,

        // Eventos
        on,
        off,
        emit,

        // Extensibilidad
        use,
        hook,
        configure,

        // Personalización
        setErrorHandler,
        setSerializer,
        setEventEmitter,

        // Utilidades
        getTransport,
        getClientId,
        isStarted,
        getConfig,
    };

    return api;
}