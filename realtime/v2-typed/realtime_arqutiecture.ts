// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Mensaje crudo del adapter
 */
export interface RealtimeRawMessage<T = unknown> {
  type: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

/**
 * Contexto que fluye por toda la aplicación
 */
export interface RealtimeContext<TAppContext = unknown> {
  // Data de la aplicación (mutable por middlewares)
  data: TAppContext;
  
  // Info del mensaje original
  readonly eventType: string;
  readonly rawPayload: unknown;
  readonly timestamp: Date;
  
  // Para pasar info entre middlewares
  state: Map<string | symbol, unknown>;
  
  // Flag para abortar ejecución
  aborted: boolean;
}

/**
 * Middleware clásico con next() - SIMPLE
 */
export type RealtimeMiddleware<TContext = unknown> = (
  context: RealtimeContext<TContext>,
  next: () => void | Promise<void>
) => void | Promise<void>;

/**
 * Guard - retorna boolean
 */
export type RealtimeGuard<TContext = unknown> = (
  context: RealtimeContext<TContext>
) => boolean | Promise<boolean>;

/**
 * Event emitter para que las rutas propaguen eventos
 */
export interface RealtimeEventEmitter {
  emit<T = unknown>(eventName: string, payload: T): void;
}

/**
 * Route handler - recibe contexto Y emitter para propagar
 */
export type RealtimeRouteHandler<TContext = unknown> = (
  context: RealtimeContext<TContext>,
  emit: RealtimeEventEmitter
) => void | Promise<void>;

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export type RealtimeRouteMatcher = 
  | string 
  | RegExp 
  | ((eventType: string) => boolean);

export interface RealtimeRouteDefinition<TContext = unknown> {
  // Identificador único
  id?: string;
  
  // Matcher del evento
  match: RealtimeRouteMatcher;
  
  // Handler que procesa y propaga
  handler: RealtimeRouteHandler<TContext>;
  
  // Guards opcionales (se ejecutan antes del handler)
  guards?: RealtimeGuard<TContext>[];
  
  // Middlewares específicos de esta ruta (se ejecutan después de los globales)
  middlewares?: RealtimeMiddleware<TContext>[];
}

// ============================================================================
// ADAPTER
// ============================================================================

export interface RealtimeAdapter<TRaw = unknown> {
  // Conectar/desconectar
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Callback cuando llega un mensaje
  onMessage(handler: (message: RealtimeRawMessage<TRaw>) => void): void;
  
  // Opcional: enviar mensajes
  send?(type: string, payload: unknown): Promise<void>;
  
  // Estado
  isConnected(): boolean;
}

// ============================================================================
// TRANSFORMER
// ============================================================================

export type RealtimePayloadTransformer<TContext, TRaw = unknown> = (
  raw: RealtimeRawMessage<TRaw>
) => TContext | Promise<TContext>;

// ============================================================================
// ERROR HANDLER
// ============================================================================

export type RealtimeErrorHandler<TContext = unknown> = (
  error: Error,
  context?: RealtimeContext<TContext>
) => void;

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface RealtimeConfiguration<TAppContext = unknown, TRaw = unknown> {
  // Adapter de transporte
  adapter: RealtimeAdapter<TRaw>;
  
  // Transformer de payload crudo → contexto app
  transformer: RealtimePayloadTransformer<TAppContext, TRaw>;
  
  // Rutas que procesan y propagan eventos
  routes: RealtimeRouteDefinition<TAppContext>[];
  
  // Middlewares globales (se ejecutan para todos los mensajes)
  middlewares?: RealtimeMiddleware<TAppContext>[];
  
  // Guards globales
  guards?: RealtimeGuard<TAppContext>[];
  
  // Error handler
  onError?: RealtimeErrorHandler<TAppContext>;
}

// ============================================================================
// EVENT CALLBACK
// ============================================================================

export type RealtimeEventCallback<T = unknown> = (payload: T) => void;

export type RealtimeUnsubscribe = () => void;

// ============================================================================
// MAIN INTERFACE
// ============================================================================

export interface Realtime {
  // Suscribirse a eventos (los que las rutas emiten)
  on<T = unknown>(
    eventName: string,
    callback: RealtimeEventCallback<T>
  ): RealtimeUnsubscribe;
  
  once<T = unknown>(
    eventName: string,
    callback: RealtimeEventCallback<T>
  ): RealtimeUnsubscribe;
  
  off<T = unknown>(
    eventName: string,
    callback: RealtimeEventCallback<T>
  ): void;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Runtime - agregar/remover rutas
  addRoute<T = unknown>(route: RealtimeRouteDefinition<T>): void;
  removeRoute(id: string): void;
  
  // Runtime - middlewares
  use(middleware: RealtimeMiddleware): void;
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRealtime<TAppContext = unknown, TRaw = unknown>(
  config: RealtimeConfiguration<TAppContext, TRaw>
): Realtime {
  // Implementation
  return {} as Realtime;
}

// ============================================================================
// HELPERS PARA MATCHERS
// ============================================================================

export const RealtimeMatchers = {
  exact: (type: string): RealtimeRouteMatcher => type,
  
  prefix: (prefix: string): RealtimeRouteMatcher => 
    (type) => type.startsWith(prefix),
  
  regex: (pattern: RegExp): RealtimeRouteMatcher => pattern,
  
  wildcard: (pattern: string): RealtimeRouteMatcher => {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return (type) => regex.test(type);
  },
  
  any: (): RealtimeRouteMatcher => () => true,
  
  oneOf: (...types: string[]): RealtimeRouteMatcher => 
    (type) => types.includes(type),
};

// ============================================================================
// MIDDLEWARES COMUNES
// ============================================================================

/**
 * Logger middleware
 */
export const RealtimeLoggerMiddleware = <T>(): RealtimeMiddleware<T> => 
  async (context, next) => {
    console.log(`[Realtime] Event: ${context.eventType}`, {
      timestamp: context.timestamp,
      payload: context.rawPayload
    });
    await next();
  };

/**
 * Timing middleware
 */
export const RealtimeTimingMiddleware = <T>(): RealtimeMiddleware<T> => 
  async (context, next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    console.log(`[Realtime] Processing time: ${duration.toFixed(2)}ms`);
  };

/**
 * Error catching middleware
 */
export const RealtimeErrorCatcherMiddleware = <T>(
  onError: (error: Error, context: RealtimeContext<T>) => void
): RealtimeMiddleware<T> => 
  async (context, next) => {
    try {
      await next();
    } catch (error) {
      onError(error as Error, context);
      throw error;
    }
  };

/**
 * State injection middleware
 */
export const RealtimeStateMiddleware = <T>(
  key: string | symbol,
  value: unknown
): RealtimeMiddleware<T> => 
  async (context, next) => {
    context.state.set(key, value);
    await next();
  };

// ============================================================================
// GUARDS COMUNES
// ============================================================================

/**
 * Auth guard
 */
export const RealtimeAuthGuard = <T extends { userId?: string }>(): RealtimeGuard<T> =>
  (context) => !!context.data.userId;

/**
 * Permission guard
 */
export const RealtimePermissionGuard = <T extends { permissions?: string[] }>(
  requiredPermission: string
): RealtimeGuard<T> =>
  (context) => context.data.permissions?.includes(requiredPermission) ?? false;

/**
 * Custom guard factory
 */
export const RealtimeCustomGuard = <T>(
  predicate: (context: RealtimeContext<T>) => boolean | Promise<boolean>
): RealtimeGuard<T> => predicate;

// ============================================================================
// EJEMPLO DE USO COMPLETO
// ============================================================================

// Definir el contexto de la aplicación
interface RealtimeAppContext {
  userId: string;
  sessionId?: string;
  connectedAt: Date;
  permissions: string[];
}

// Definir el payload crudo del adapter
interface RealtimeWebSocketPayload {
  user_id: string;
  session_id?: string;
  timestamp: number;
  data: unknown;
}

// Eventos que las rutas emitirán
interface RealtimeClientConnectedEvent {
  clientId: string;
  timestamp: Date;
}

interface RealtimeClientDisconnectedEvent {
  clientId: string;
  reason: string;
}

interface RealtimeMessageReceivedEvent {
  from: string;
  content: string;
  timestamp: Date;
}

// Crear la instancia de realtime
const realtime = createRealtime<RealtimeAppContext, RealtimeWebSocketPayload>({
  // Adapter (WebSocket, SSE, etc.)
  adapter: {
    connect: async () => {
      // Implementación de conexión
    },
    disconnect: async () => {
      // Implementación de desconexión
    },
    onMessage: (handler) => {
      // Registrar handler para mensajes entrantes
    },
    isConnected: () => true
  },
  
  // Transformer: convierte el payload crudo en contexto de app
  transformer: (raw) => ({
    userId: raw.payload.user_id,
    sessionId: raw.payload.session_id,
    connectedAt: new Date(raw.payload.timestamp),
    permissions: [] // Cargar desde DB o cache
  }),
  
  // Middlewares globales (se ejecutan para TODOS los mensajes)
  middlewares: [
    RealtimeLoggerMiddleware<RealtimeAppContext>(),
    RealtimeTimingMiddleware<RealtimeAppContext>(),
    
    // Middleware personalizado
    async (context, next) => {
      // Enriquecer contexto con datos adicionales
      context.state.set('requestId', crypto.randomUUID());
      await next();
    }
  ],
  
  // Guards globales
  guards: [
    RealtimeAuthGuard<RealtimeAppContext>(),
    
    // Guard personalizado
    (context) => {
      // Verificar que el usuario no esté bloqueado
      return context.data.userId !== 'blocked-user';
    }
  ],
  
  // Rutas: aquí es donde se propagan los eventos a los listeners
  routes: [
    {
      id: 'client-connected',
      match: RealtimeMatchers.exact('client.connected'),
      handler: (context, emit) => {
        // La ruta procesa y PROPAGA el evento
        emit.emit<RealtimeClientConnectedEvent>('client_connected', {
          clientId: context.data.userId,
          timestamp: context.data.connectedAt
        });
      },
      guards: [
        // Guard específico de esta ruta
        (context) => !!context.data.sessionId
      ]
    },
    
    {
      id: 'client-disconnected',
      match: RealtimeMatchers.exact('client.disconnected'),
      handler: (context, emit) => {
        emit.emit<RealtimeClientDisconnectedEvent>('client_disconnected', {
          clientId: context.data.userId,
          reason: 'User initiated'
        });
      },
      middlewares: [
        // Middleware específico de esta ruta
        async (context, next) => {
          console.log('Handling disconnect for:', context.data.userId);
          await next();
        }
      ]
    },
    
    {
      id: 'message-received',
      match: RealtimeMatchers.wildcard('message.*'),
      handler: (context, emit) => {
        const messageData = context.rawPayload as any;
        
        emit.emit<RealtimeMessageReceivedEvent>('message_received', {
          from: context.data.userId,
          content: messageData.content,
          timestamp: new Date()
        });
      },
      guards: [
        RealtimePermissionGuard<RealtimeAppContext>('send_messages')
      ]
    },
    
    {
      id: 'catch-all',
      match: RealtimeMatchers.any(),
      handler: (context, emit) => {
        console.log('Unhandled event:', context.eventType);
      }
    }
  ],
  
  // Error handler global
  onError: (error, context) => {
    console.error('Realtime error:', error);
    if (context) {
      console.error('Context:', {
        eventType: context.eventType,
        userId: context.data.userId,
        timestamp: context.timestamp
      });
    }
  }
});

// ============================================================================
// USO DE LA API PÚBLICA
// ============================================================================

// Conectar
await realtime.connect();

// Suscribirse a eventos (los que las rutas emiten)
const unsubscribe1 = realtime.on<RealtimeClientConnectedEvent>(
  'client_connected',
  (event) => {
    console.log('Client connected:', event.clientId, event.timestamp);
  }
);

const unsubscribe2 = realtime.on<RealtimeMessageReceivedEvent>(
  'message_received',
  (event) => {
    console.log('Message from:', event.from, 'Content:', event.content);
  }
);

// Escuchar solo una vez
realtime.once<RealtimeClientDisconnectedEvent>(
  'client_disconnected',
  (event) => {
    console.log('Client disconnected:', event.clientId, event.reason);
  }
);

// Agregar una ruta en runtime
realtime.addRoute<RealtimeAppContext>({
  id: 'new-route',
  match: 'custom.event',
  handler: (context, emit) => {
    emit.emit('custom_event_processed', { success: true });
  }
});

// Agregar middleware en runtime
realtime.use(async (context, next) => {
  console.log('Runtime middleware executed');
  await next();
});

// Desuscribirse
unsubscribe1();
unsubscribe2();

// O usando off
realtime.off('client_connected', unsubscribe1);

// Desconectar
await realtime.disconnect();

// ============================================================================
// EJEMPLO CON BUILDER PATTERN (OPCIONAL)
// ============================================================================

export interface RealtimeBuilder<TAppContext = unknown, TRaw = unknown> {
  withAdapter(adapter: RealtimeAdapter<TRaw>): this;
  withTransformer(transformer: RealtimePayloadTransformer<TAppContext, TRaw>): this;
  
  addRoute(route: RealtimeRouteDefinition<TAppContext>): this;
  addRoutes(...routes: RealtimeRouteDefinition<TAppContext>[]): this;
  
  addMiddleware(middleware: RealtimeMiddleware<TAppContext>): this;
  addMiddlewares(...middlewares: RealtimeMiddleware<TAppContext>[]): this;
  
  addGuard(guard: RealtimeGuard<TAppContext>): this;
  addGuards(...guards: RealtimeGuard<TAppContext>[]): this;
  
  onError(handler: RealtimeErrorHandler<TAppContext>): this;
  
  build(): Realtime;
}

export function buildRealtime<TAppContext = unknown, TRaw = unknown>(): RealtimeBuilder<TAppContext, TRaw> {
  // Implementation
  return {} as RealtimeBuilder<TAppContext, TRaw>;
}

// Uso del builder
const realtime2 = buildRealtime<RealtimeAppContext, RealtimeWebSocketPayload>()
  .withAdapter({
    connect: async () => {},
    disconnect: async () => {},
    onMessage: () => {},
    isConnected: () => true
  })
  .withTransformer((raw) => ({
    userId: raw.payload.user_id,
    sessionId: raw.payload.session_id,
    connectedAt: new Date(),
    permissions: []
  }))
  .addMiddleware(RealtimeLoggerMiddleware())
  .addGuard(RealtimeAuthGuard())
  .addRoute({
    id: 'test',
    match: 'test.event',
    handler: (ctx, emit) => {
      emit.emit('test_processed', { ok: true });
    }
  })
  .onError((error) => console.error(error))
  .build();