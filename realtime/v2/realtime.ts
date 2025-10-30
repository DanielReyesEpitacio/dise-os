// ==================== TIPOS Y INTERFACES ====================

/**
 * Configuración del sistema CoreRealtime
 */
export interface CoreRealtimeConfig {
    /** Activar logs de debug */
    debug?: boolean;
    /** Reconectar automáticamente */
    autoReconnect?: boolean;
    /** Máximo de intentos de reconexión */
    maxReconnectAttempts?: number;
    /** Delay entre reconexiones (ms) */
    reconnectDelay?: number;
    /** Modo estricto: valida adapters */
    strictMode?: boolean;
}

/**
 * Payload normalizado que recibe el sistema
 */
export interface NormalizedPayload<T = any> {
    /** ID del cliente que envió el mensaje */
    clientId?: string;
    /** Datos del mensaje */
    payload: T;
    /** Canal de comunicación */
    channel?: string;
    /** ID de la aplicación */
    applicationId?: string;
    /** ID del cliente emisor original */
    emitterClientId?: string;
}

/**
 * Contrato que debe cumplir un Transport Adapter
 */
export interface TransportAdapter<T = any> {
    /** Registrar callback para mensajes entrantes */
    onMessage: (callback: (type: string, payload: T) => void) => void;
    /** Enviar mensaje a un destinatario específico */
    send: (type: string, payload: any, ...args: any[]) => void | Promise<void>;
    /** Enviar mensaje a todos los clientes */
    broadcast: (type: string, payload: any, ...args: any[]) => void | Promise<void>;
    /** Normalizar payload entrante (opcional) */
    normalizePayload?: (rawPayload: any) => NormalizedPayload<T>;
    /** Limpiar recursos al desconectar (opcional) */
    disconnect?: () => void | Promise<void>;
    /** Remover listener específico (opcional) */
    off?: (event: string, callback: Function, ...args: any[]) => void;
}

/**
 * Contexto disponible en handlers, middleware y guards
 */
export interface Context<TPayload = any, TAppContext = any> {
    /** Tipo de evento */
    type: string;
    /** Datos del mensaje */
    payload: TPayload;
    /** ID de la aplicación */
    applicationId?: string;
    /** Canal del mensaje */
    channel?: string;
    /** ID del cliente remoto (emisor) */
    remoteClient?: string;
    /** ID del cliente local (receptor) */
    localClientId: string;
    /** Enviar mensaje a un cliente */
    send: (type: string, payload: any) => void | Promise<void>;
    /** Broadcast a todos */
    broadcast: (type: string, payload: any) => void | Promise<void>;
    /** Emitir evento interno */
    emit: (event: string, data?: any) => void;
    /** Metadata custom */
    meta: Record<string, any>;
    /** Contexto de la aplicación */
    appContext: TAppContext;
    /** Detener propagación */
    stop: () => void;
    /** Verificar si está detenido */
    isStopped: () => boolean;
    /** ID del emisor original */
    emitterClientId?: string;
}

/**
 * Función middleware
 */
export type Middleware<TPayload = any, TAppContext = any> = (
    ctx: Context<TPayload, TAppContext>,
    next: () => Promise<void>
) => void | Promise<void>;

/**
 * Función guard - retorna boolean o objeto con razón
 */
export type Guard<TPayload = any, TAppContext = any> = (
    ctx: Context<TPayload, TAppContext>
) => boolean | GuardResult | Promise<boolean | GuardResult>;

/**
 * Resultado de un guard
 */
export interface GuardResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Función handler de ruta
 */
export type RouteHandler<TPayload = any, TAppContext = any> = (
    ctx: Context<TPayload, TAppContext>
) => void | Promise<void>;

/**
 * Definición de una ruta
 */
export interface Route<TPayload = any, TAppContext = any> {
    /** Nombre del evento */
    event: string;
    /** Guards de validación */
    guards?: Guard<TPayload, TAppContext>[];
    /** Middleware específico de la ruta */
    middleware?: Middleware<TPayload, TAppContext>[];
    /** Handler principal */
    handler: RouteHandler<TPayload, TAppContext>;
}

/**
 * Ruta interna (con valores por defecto)
 */
interface InternalRoute<TPayload = any, TAppContext = any> {
    guards: Guard<TPayload, TAppContext>[];
    middleware: Middleware<TPayload, TAppContext>[];
    handler: RouteHandler<TPayload, TAppContext>;
}

/**
 * Error handler personalizado
 */
export type ErrorHandler<TAppContext = any> = (
    error: Error,
    ctx?: Context<any, TAppContext>
) => void;

/**
 * Serializador de datos
 */
export interface Serializer {
    encode: (data: any) => any;
    decode: (data: any) => any;
}

/**
 * Event emitter personalizado
 */
export interface EventEmitter {
    on: (event: string, callback: Function) => void;
    off: (event: string, callback: Function) => void;
    emit: (event: string, data?: any) => void;
}

/**
 * Nombres de lifecycle hooks disponibles
 */
export type LifecycleHookName = 
    | 'beforeStart'
    | 'afterStart'
    | 'beforeMessage'
    | 'afterMessage'
    | 'onError';

/**
 * Callback de lifecycle hook
 */
export type LifecycleHook = (...args: any[]) => void | Promise<void>;

/**
 * Plugin como función
 */
export type PluginFunction = (api: CoreRealtimeAPI, utils: PluginUtils) => void;

/**
 * Plugin como objeto
 */
export interface PluginObject {
    install: (api: CoreRealtimeAPI, utils: PluginUtils) => void;
}

/**
 * Plugin (función u objeto)
 */
export type Plugin = PluginFunction | PluginObject;

/**
 * Utilidades disponibles para plugins
 */
export interface PluginUtils {
    getTransport: () => TransportAdapter | null;
    getRoutes: () => Map<string, InternalRoute>;
    getContext: () => any;
    getConfig: () => CoreRealtimeConfig;
}

/**
 * API pública de CoreRealtime
 */
export interface CoreRealtimeAPI<TAppContext = any> {
    // Core
    registerGlobalMiddleware: (middlewareList: Middleware[]) => CoreRealtimeAPI<TAppContext>;
    registerRoutes: (routeList: Route[]) => CoreRealtimeAPI<TAppContext>;
    adapter: (instance: TransportAdapter) => CoreRealtimeAPI<TAppContext>;
    setAppContext: (ctx: TAppContext) => CoreRealtimeAPI<TAppContext>;
    start: () => Promise<CoreRealtimeAPI<TAppContext>>;
    stop: () => CoreRealtimeAPI<TAppContext>;
    reset: () => CoreRealtimeAPI<TAppContext>;

    // Eventos
    on: (event: string, callback: Function) => CoreRealtimeAPI<TAppContext>;
    off: (event: string, callback: Function) => CoreRealtimeAPI<TAppContext>;
    emit: (event: string, data?: any) => void;

    // Extensibilidad
    use: (plugin: Plugin) => CoreRealtimeAPI<TAppContext>;
    hook: (name: LifecycleHookName, callback: LifecycleHook) => CoreRealtimeAPI<TAppContext>;
    configure: (options: Partial<CoreRealtimeConfig>) => CoreRealtimeAPI<TAppContext>;

    // Personalización
    setErrorHandler: (handler: ErrorHandler<TAppContext>) => CoreRealtimeAPI<TAppContext>;
    setSerializer: (serializer: Serializer) => CoreRealtimeAPI<TAppContext>;
    setEventEmitter: (emitter: EventEmitter) => CoreRealtimeAPI<TAppContext>;

    // Utilidades
    getTransport: () => TransportAdapter | null;
    getClientId: () => string;
    isStarted: () => boolean;
    getConfig: () => CoreRealtimeConfig;
}

// ==================== IMPLEMENTACIÓN ====================

/**
 * CoreRealtime - Sistema de comunicación en tiempo real agnóstico
 */
export function createCoreRealtime<TAppContext = any>(
    options: CoreRealtimeConfig = {}
): CoreRealtimeAPI<TAppContext> {
    // ==================== ESTADO INTERNO ====================
    const globalMiddleware: Middleware[] = [];
    const routes = new Map<string, InternalRoute>();
    const eventListeners = new Map<string, Function[]>();
    const plugins: Plugin[] = [];
    const lifecycleHooks: Record<LifecycleHookName, LifecycleHook[]> = {
        beforeStart: [],
        afterStart: [],
        beforeMessage: [],
        afterMessage: [],
        onError: []
    };

    let transport: TransportAdapter | null = null;
    let globalAppContext: TAppContext = {} as TAppContext;
    let instanceClientId: string = Math.random().toString(36).slice(2, 10);
    let isActive: boolean = false;

    // Configuración por defecto
    const defaultConfig: CoreRealtimeConfig = {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        debug: false,
        strictMode: true
    };

    let config: CoreRealtimeConfig = { ...defaultConfig, ...options };

    // Serializador por defecto (identity)
    let serializer: Serializer = {
        encode: (data: any) => data,
        decode: (data: any) => data
    };

    // Error handler por defecto
    let errorHandler: ErrorHandler<TAppContext> = (err: Error, ctx?: Context<any, TAppContext>) => {
        if (config.debug) {
            console.error(`[CoreRealtime] Error en evento [${ctx?.type}]:`, err);
        }
        ctx?.send?.('error', { message: err.message });
    };

    // Event emitter custom (opcional)
    let customEventEmitter: EventEmitter | null = null;

    // ==================== MÉTODOS PRIVADOS ====================

    /**
     * Valida que un adapter cumpla con el contrato mínimo
     */
    function validateAdapter(instance: TransportAdapter): void {
        const REQUIRED_METHODS: (keyof TransportAdapter)[] = ['onMessage', 'send', 'broadcast'];
        
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
    function wrapTransport(originalTransport: TransportAdapter): TransportAdapter {
        return {
            ...originalTransport,
            send: (type: string, payload: any, ...args: any[]) => {
                const encoded = serializer.encode(payload);
                return originalTransport.send(type, encoded, ...args);
            },
            broadcast: (type: string, payload: any, ...args: any[]) => {
                const encoded = serializer.encode(payload);
                return originalTransport.broadcast(type, encoded, ...args);
            },
            onMessage: (callback: (type: string, payload: any) => void) => {
                originalTransport.onMessage((type: string, payload: any) => {
                    const decoded = serializer.decode(payload);
                    callback(type, decoded);
                });
            }
        };
    }

    /**
     * Ejecuta hooks del lifecycle
     */
    async function runHooks(hookName: LifecycleHookName, ...args: any[]): Promise<void> {
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
    async function runGuards<TPayload = any>(
        guards: Guard<TPayload, TAppContext>[],
        ctx: Context<TPayload, TAppContext>
    ): Promise<boolean> {
        for (const guard of guards) {
            try {
                const result = await Promise.resolve().then(() => guard(ctx));
                
                // Soporta boolean o {allowed: boolean, reason?: string}
                const allowed = typeof result === 'boolean' 
                    ? result 
                    : (result as GuardResult)?.allowed;

                if (!allowed) {
                    if (config.debug) {
                        const reason = typeof result === 'object' 
                            ? result.reason || 'Sin razón especificada'
                            : 'Sin razón especificada';
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
    async function runMiddleware<TPayload = any>(
        middleware: Middleware<TPayload, TAppContext>[],
        ctx: Context<TPayload, TAppContext>
    ): Promise<boolean> {
        let i = -1;

        async function next(j: number = 0): Promise<void> {
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
    function createContext<TPayload = any>(
        type: string,
        fullPayload: any
    ): Context<TPayload, TAppContext> {
        // Permitir que el transport normalice el payload
        const normalized: NormalizedPayload<TPayload> = transport?.normalizePayload
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
            payload: payload as TPayload,
            applicationId,
            channel,
            remoteClient: clientId,
            localClientId: instanceClientId,
            send: transport!.send,
            broadcast: transport!.broadcast,
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
    function internalEmit(event: string, data?: any): void {
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
     */
    function registerGlobalMiddleware(
        middlewareList: Middleware[]
    ): CoreRealtimeAPI<TAppContext> {
        if (!Array.isArray(middlewareList)) {
            throw new Error('middlewareList debe ser un array');
        }
        globalMiddleware.push(...middlewareList);
        return api;
    }

    /**
     * Registra rutas con sus handlers, guards y middleware
     */
    function registerRoutes(routeList: Route[]): CoreRealtimeAPI<TAppContext> {
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
     * Configura el adapter de transporte
     */
    function adapter(instance: TransportAdapter): CoreRealtimeAPI<TAppContext> {
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
     */
    function setAppContext(ctx: TAppContext): CoreRealtimeAPI<TAppContext> {
        globalAppContext = ctx || ({} as TAppContext);
        return api;
    }

    /**
     * Inicia el sistema de comunicación
     */
    async function start(): Promise<CoreRealtimeAPI<TAppContext>> {
        if (!transport) {
            throw new Error('Adapter no definido. Usa .adapter() primero');
        }

        if (isActive) {
            console.warn('[CoreRealtime] Ya está iniciado');
            return api;
        }

        await runHooks('beforeStart');

        transport.onMessage(async (type: string, payload: any) => {
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
                errorHandler(err as Error, ctx);
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
     */
    function stop(): CoreRealtimeAPI<TAppContext> {
        if (!isActive) return api;

        eventListeners.clear();

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
     */
    function reset(): CoreRealtimeAPI<TAppContext> {
        stop();
        routes.clear();
        globalMiddleware.length = 0;
        globalAppContext = {} as TAppContext;
        transport = null;
        plugins.length = 0;
        
        for (const key in lifecycleHooks) {
            lifecycleHooks[key as LifecycleHookName].length = 0;
        }

        if (config.debug) {
            console.log('[CoreRealtime] Sistema reseteado');
        }

        return api;
    }

    /**
     * Registra un listener para eventos internos
     */
    function on(event: string, callback: Function): CoreRealtimeAPI<TAppContext> {
        if (customEventEmitter) {
            customEventEmitter.on(event, callback);
        } else {
            if (!eventListeners.has(event)) {
                eventListeners.set(event, []);
            }
            eventListeners.get(event)!.push(callback);
        }
        return api;
    }

    /**
     * Remueve un listener de eventos internos
     */
    function off(event: string, callback: Function): CoreRealtimeAPI<TAppContext> {
        if (customEventEmitter) {
            customEventEmitter.off(event, callback);
        } else {
            if (!eventListeners.has(event)) return api;
            const callbacks = eventListeners.get(event)!;
            const idx = callbacks.indexOf(callback);
            if (idx !== -1) {
                callbacks.splice(idx, 1);
            }
        }

        if (typeof transport?.off === 'function') {
            transport.off(event, callback);
        }

        return api;
    }

    /**
     * Emite un evento interno
     */
    function emit(event: string, data?: any): void {
        internalEmit(event, data);
    }

    /**
     * Instala un plugin
     */
    function use(plugin: Plugin): CoreRealtimeAPI<TAppContext> {
        const utils: PluginUtils = {
            getTransport: () => transport,
            getRoutes: () => routes,
            getContext: () => globalAppContext,
            getConfig: () => ({ ...config })
        };

        if (typeof plugin === 'function') {
            plugin(api, utils);
        } else if (typeof plugin?.install === 'function') {
            plugin.install(api, utils);
        } else {
            throw new Error('Plugin debe ser función o tener método install');
        }
        
        plugins.push(plugin);
        return api;
    }

    /**
     * Registra un hook del lifecycle
     */
    function hook(
        name: LifecycleHookName,
        callback: LifecycleHook
    ): CoreRealtimeAPI<TAppContext> {
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
     */
    function configure(options: Partial<CoreRealtimeConfig>): CoreRealtimeAPI<TAppContext> {
        config = { ...config, ...options };
        return api;
    }

    /**
     * Establece un error handler personalizado
     */
    function setErrorHandler(
        handler: ErrorHandler<TAppContext>
    ): CoreRealtimeAPI<TAppContext> {
        if (typeof handler !== 'function') {
            throw new Error('Error handler debe ser una función');
        }
        errorHandler = handler;
        return api;
    }

    /**
     * Establece un serializador personalizado
     */
    function setSerializer(custom: Serializer): CoreRealtimeAPI<TAppContext> {
        if (!custom.encode || !custom.decode) {
            throw new Error('Serializer debe tener métodos encode y decode');
        }
        serializer = custom;
        return api;
    }

    /**
     * Establece un event emitter personalizado
     */
    function setEventEmitter(emitter: EventEmitter): CoreRealtimeAPI<TAppContext> {
        if (!emitter.on || !emitter.emit || !emitter.off) {
            throw new Error('Event emitter debe implementar on, emit, off');
        }
        customEventEmitter = emitter;
        return api;
    }

    /**
     * Obtiene el transport actual
     */
    function getTransport(): TransportAdapter | null {
        return transport;
    }

    /**
     * Obtiene el ID del cliente local
     */
    function getClientId(): string {
        return instanceClientId;
    }

    /**
     * Verifica si el sistema está activo
     */
    function isStarted(): boolean {
        return isActive;
    }

    /**
     * Obtiene la configuración actual
     */
    function getConfig(): CoreRealtimeConfig {
        return { ...config };
    }

    // ==================== API EXPORTADA ====================
    const api: CoreRealtimeAPI<TAppContext> = {
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