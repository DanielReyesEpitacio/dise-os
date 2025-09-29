export function createCoreRealtime() {
    const globalMiddleware = [];
    const routes = new Map();
    const eventListeners = new Map();
    let transport;
    let globalAppContext = {};
    let instanceClientId = Math.random().toString(36).slice(2,10);

    function registerGlobalMiddleware(middlewareList) {
        globalMiddleware.push(...middlewareList);
        return api;
    }

    function registerRoutes(routeList) {
        for (const { event, guards = [], middleware = [], handler } of routeList) {
            if (!event || !handler) throw new Error("Ruta inválida");
            routes.set(event, { guards, middleware, handler });
        }
        return api;
    }

    function adapter(instance) {
        transport = instance;
        return api;
    }

    function setAppContext(ctx) {
        globalAppContext = ctx || {};
        return api;
    }

    function start() {
        if (!transport) throw new Error("Adapter no definido");

        transport.onMessage(async (type, payload) => {
            const ctx = createContext(type, payload);

            try {
                const accepted = await runMiddleware(globalMiddleware, ctx);
                if (!accepted) return;

                const route = routes.get(type);
                if (!route) return;

                const allowed = await runGuards(route.guards, ctx);
                if (!allowed) return;

                const passed = await runMiddleware(route.middleware, ctx);
                if (!passed) return;

                // await route.handler(ctx);

                await Promise.resolve().then(()=>route.handler(ctx));

            } catch (err) {
                console.error(`Error en evento [${type}]:`, err);
                ctx.send?.('error', { message: err.message });
            }
        });

        return api;
    }

    async function runGuards(guards, ctx) {
        for (const guard of guards) {
            let allowed = false;
            // await Promise.resolve().then(() =>
            //     guard(ctx, () => (allowed = true))
            // );

            await Promise.resolve().then(()=> allowed = guard(ctx));

            if (!allowed) return false;
        }
        return true;
    }

    async function runMiddleware(middleware, ctx) {
        let i = -1;

        async function next(j = 0) {
            if (j <= i) throw new Error("next() llamado múltiples veces");
            i = j;
            const fn = middleware[j];
            if (fn) {
                await fn(ctx, ()=>next(j+1));
                // return Promise.resolve().then(() => fn(ctx, () => next(j + 1)));
            }
        }

        try {
            await next();
            // return true;
            if(ctx.isStopped?.())return false;
            return true;
        } catch (err) {
            console.error("Middleware error:", err);
            return false;
        }
    }

    function createContext(type, fullPayload) {
        const {
            clientId,
            payload,
            channel,
            applicationId,
            emitterClientId,
        } = fullPayload || {};


        let stopped = false;

        return {
            type,
            payload,
            applicationId,
            channel,
            remoteClient: clientId,     // quien emitió el mensaje
            localClientId: instanceClientId,        // cliente actual (receptor)
            send: transport.send,
            broadcast: transport.broadcast,
            emit,
            meta: {},
            appContext: globalAppContext,  // contexto inyectado
            stop:()=>{stopped = true},
            isStopped:()=> stopped,
            emitterClientId:emitterClientId,
        };
    }

    function on(event, callback) {
        if (!eventListeners.has(event)) {
            eventListeners.set(event, []);
        }
        eventListeners.get(event).push(callback);
    }

    function emit(event, data) {
        const callbacks = eventListeners.get(event) || [];
        for (const cb of callbacks) cb(data);
    }

    function off(event, callback, channelName) {
        if (!eventListeners.has(event)) return;
        const callbacks = eventListeners.get(event);
        const idx = callbacks.indexOf(callback);
        if (idx === -1) return;
        callbacks.splice(idx, 1);

        if (typeof transport?.off === 'function') {
            transport.off(event, callback, channelName);
        }
    }

    const api = {
        registerGlobalMiddleware,
        registerRoutes,
        adapter,
        setAppContext,
        start,
        on,
        off,
        emit,
    };

    return api;
}