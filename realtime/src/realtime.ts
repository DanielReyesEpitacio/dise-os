// ============================================================================
// SCOPE TYPES - ✅ NUEVA FEATURE
// ============================================================================

/**
 * Scope para filtrado de eventos - valores simples
 */
export type RealtimeScope = Record<string, string | number | boolean>;

/**
 * Filtros de scope para listeners
 */
export interface RealtimeScopeFilter {
  only?: RealtimeScope;
  any?: RealtimeScope[];
  exclude?: RealtimeScope;
}

// ============================================================================
// SCOPE MATCHERS - ✅ UTILIDADES PARA SCOPES
// ============================================================================

export const RealtimeScopeMatchers = {
  matches(scope: RealtimeScope | undefined, filter?: RealtimeScopeFilter): boolean {
    if (!filter) return true;
    if (!filter.only && !filter.any && !filter.exclude) return true;
    
    if (filter.exclude && scope && this.exactMatch(scope, filter.exclude)) {
      return false;
    }
    
    if (filter.only) {
      if (!scope) return false;
      return this.exactMatch(scope, filter.only);
    }
    
    if (filter.any) {
      if (!scope) return false;
      return filter.any.some(s => this.exactMatch(scope, s));
    }
    
    return true;
  },
  
  exactMatch(scope: RealtimeScope, target: RealtimeScope): boolean {
    return Object.entries(target).every(
      ([key, value]) => scope[key] === value
    );
  },
  
  only(scope: RealtimeScope): RealtimeScopeFilter {
    return { only: scope };
  },
  
  any(...scopes: RealtimeScope[]): RealtimeScopeFilter {
    return { any: scopes };
  },
  
  exclude(scope: RealtimeScope): RealtimeScopeFilter {
    return { exclude: scope };
  }
};

// ============================================================================
// TYPES ORIGINALES - SIN MODIFICAR
// ============================================================================

export type RealtimeEventCallback<T> = (data: T) => void;
export type RealtimeGuard<T> = (context: RealtimeApplicationContext<T>) => boolean;
export type RealtimeRoute<T> = (context: RealtimeApplicationContext<T>) => void;
export type RealtimePayloadFormatterFunction<T, U> = (data: U) => T;
export type RealtimeMiddleware<TContext = unknown> = (
  context: RealtimeApplicationContext<TContext>,
  next: () => void | Promise<void>
) => void | Promise<void>;

export class RealtimeRouteDefinition<T> {
    route!: RealtimeRoute<T>;
    guards?: RealtimeGuard<T>[];
}

export interface RealtimeAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    onMessage(): void;
    subscribe(type: string, callback: () => void, channelName: string): void;
}

// ✅ INTERFACE MODIFICADA: on/off ahora aceptan filtro de scope opcional
export interface Realtime {
    on<T>(eventName: string, callback: RealtimeEventCallback<T>, filter?: RealtimeScopeFilter): void;
    off<T>(eventName: string, callback: RealtimeEventCallback<T>): void;
}

// ✅ CONTEXT MODIFICADO: emit ahora acepta scope opcional
export class RealtimeApplicationContext<T> {
    private applicationIdentifier!: string;
    private applicationContext!: T;
    private _emitFn?: (eventName: string, data: any, scope?: RealtimeScope) => void;

    // ✅ MODIFICADO: emit acepta scope opcional
    emit<U>(eventName: string, data: U, scope?: RealtimeScope): void {
        if (this._emitFn) {
            this._emitFn(eventName, data, scope);
        }
    }

    // ✅ NUEVO: Método interno para inyectar la función emit
    _setEmitFunction(fn: (eventName: string, data: any, scope?: RealtimeScope) => void): void {
        this._emitFn = fn;
    }

    getContext(): T {
        return this.applicationContext;
    }

    setContext(context: T): void {
        this.applicationContext = context;
    }

    getApplicationIdentifier(): string {
        return this.applicationIdentifier;
    }
    
    setApplicationIdentifier(identifier: string): void {
        this.applicationIdentifier = identifier;
    }
}

export interface RealtimePayloadFormatter<T, U> {
    format(data: U): T;
}

export class RealtimeConfiguration<
    ApplicationContextDefintion,
    RealtimeRawContent
> {
    adapter!: RealtimeAdapter;
    payloadFormatter!: RealtimePayloadFormatter<ApplicationContextDefintion, RealtimeRawContent> | RealtimePayloadFormatterFunction<ApplicationContextDefintion, RealtimeRawContent>;
    routes!: Array<RealtimeRouteDefinition<ApplicationContextDefintion>>;
    middlewares?: Array<RealtimeMiddleware<ApplicationContextDefintion>>;
}

// ============================================================================
// IMPLEMENTATION - ✅ CON SOPORTE DE SCOPES
// ============================================================================

interface RealtimeListener {
    callback: RealtimeEventCallback<any>;
    filter?: RealtimeScopeFilter;  // ✅ Filtro de scope
}

class RealtimeImpl implements Realtime {
    private listeners: Map<string, RealtimeListener[]> = new Map();

    on<T>(eventName: string, callback: RealtimeEventCallback<T>, filter?: RealtimeScopeFilter): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        
        this.listeners.get(eventName)!.push({
            callback: callback as RealtimeEventCallback<T>,
            filter  // ✅ Guardar el filtro
        });
    }

    off<T>(eventName: string, callback: RealtimeEventCallback<T>): void {
        const listeners = this.listeners.get(eventName);
        if (!listeners) return;
        
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    // ✅ MÉTODO INTERNO: Emitir con scope
    _emitToListeners<T>(eventName: string, data: T, scope?: RealtimeScope): void {
        const listeners = this.listeners.get(eventName);
        if (!listeners) return;
        
        for (const listener of listeners) {
            // ✅ Verificar si el scope coincide con el filtro
            if (RealtimeScopeMatchers.matches(scope, listener.filter)) {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error('[Realtime] Error in listener:', error);
                }
            }
        }
    }
}

export function createRealtime<
    ApplicationContextDefintion,
    RealtimeRawContent
>(
    config: RealtimeConfiguration<ApplicationContextDefintion, RealtimeRawContent>
): Realtime {
    const impl = new RealtimeImpl();
    
    // Aquí iría tu lógica de inicialización:
    // - Configurar adapter
    // - Configurar routes
    // - Inyectar la función emit en el contexto
    
    // Ejemplo de cómo inyectar emit en el contexto cuando se procesa una ruta:
    /*
    for (const routeDef of config.routes) {
        const context = new RealtimeApplicationContext<ApplicationContextDefintion>();
        
        // ✅ Inyectar función emit que usa _emitToListeners con scope
        context._setEmitFunction((eventName, data, scope) => {
            impl._emitToListeners(eventName, data, scope);
        });
        
        // Ejecutar la ruta
        routeDef.route(context);
    }
    */
    
    return impl;
}

// ============================================================================
// EJEMPLO DE USO
// ============================================================================

class ApplicationRealtimeContext {
    userId!: string;
    currentSession?: string;
}

class RawRealtimePayload {
    user_id!: string;
    chat_id?: number;
    workspace_id?: number;
}

class ClientConnectedRealtimeEvent {
    public clientId!: string;
}

class MessageReceivedEvent {
    public messageId!: string;
    public content!: string;
    public from!: string;
}

const realtime = createRealtime<ApplicationRealtimeContext, RawRealtimePayload>({
    payloadFormatter: (data: RawRealtimePayload) => {
        const ctx = new ApplicationRealtimeContext();
        ctx.userId = data.user_id;
        return ctx;
    },
    adapter: {} as RealtimeAdapter,
    routes: [
        {
            route: (context: RealtimeApplicationContext<ApplicationRealtimeContext>) => {

                // Sin scope (todos los listeners lo reciben)
                context.emit<ClientConnectedRealtimeEvent>("client_connected", {
                    clientId: "12345"
                });
            }
        },
        {
            route: (context: RealtimeApplicationContext<ApplicationRealtimeContext>) => {
                // ✅ CON SCOPE: Solo listeners del chat 1 lo reciben
                context.emit<MessageReceivedEvent>("message_received", {
                    messageId: "msg_123",
                    content: "Hello!",
                    from: context.getContext().userId
                }, {
                    chatId: 1,
                    workspaceId: 5
                });
            }
        }
    ],
    middlewares: []
});

// ============================================================================
// USO DE LISTENERS CON SCOPES
// ============================================================================

// Listener sin filtro - recibe TODOS los eventos
realtime.on<ClientConnectedRealtimeEvent>("client_connected", (data) => {
    console.log(data.clientId);
});

// ✅ Listener solo para chat 1
realtime.on<MessageReceivedEvent>("message_received", (data) => {
    console.log('Message in chat 1:', data.content);
}, RealtimeScopeMatchers.only({ chatId: 1 }));

// ✅ Listener para chat 1 O chat 2
realtime.on<MessageReceivedEvent>("message_received", (data) => {
    console.log('Message in chat 1 or 2:', data.content);
}, RealtimeScopeMatchers.any({ chatId: 1 }, { chatId: 2 }));

// ✅ Listener para TODO excepto workspace 5
realtime.on<MessageReceivedEvent>("message_received", (data) => {
    console.log('Message NOT in workspace 5:', data.content);
}, RealtimeScopeMatchers.exclude({ workspaceId: 5 }));

// ✅ Filtro complejo: workspace 5 pero NO chat 999
realtime.on<MessageReceivedEvent>("message_received", (data) => {
    console.log('Complex filter:', data.content);
}, {
    only: { workspaceId: 5 },
    exclude: { chatId: 999 }
});