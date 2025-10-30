import { 
    createCoreRealtime, 
    TransportAdapter, 
    Context,
    Route,
    Middleware,
    Guard,
    Plugin
} from './core-realtime';

// ==================== EJEMPLO 1: Chat Tipado ====================

// Definir tipos de mensajes
interface ChatMessage {
    text: string;
    userId: string;
    timestamp: number;
}

interface TypingIndicator {
    userId: string;
    isTyping: boolean;
}

// Contexto de la aplicación
interface AppContext {
    currentUser: {
        id: string;
        name: string;
        avatar: string;
    };
    settings: {
        theme: 'light' | 'dark';
        notifications: boolean;
    };
}

// Crear adapter tipado
class WebSocketAdapter implements TransportAdapter {
    private ws: WebSocket;
    
    constructor(url: string) {
        this.ws = new WebSocket(url);
    }
    
    onMessage(callback: (type: string, payload: any) => void): void {
        this.ws.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data);
            callback(type, payload);
        };
    }
    
    send(type: string, payload: any): void {
        this.ws.send(JSON.stringify({ type, payload }));
    }
    
    broadcast(type: string, payload: any): void {
        // En cliente, broadcast = send
        this.send(type, payload);
    }
    
    disconnect(): void {
        this.ws.close();
    }
}

// Crear instancia tipada
const chat = createCoreRealtime<AppContext>({ debug: true });

// Configurar
chat
    .adapter(new WebSocketAdapter('ws://localhost:3000'))
    .setAppContext({
        currentUser: {
            id: 'user123',
            name: 'Juan',
            avatar: '/avatar.jpg'
        },
        settings: {
            theme: 'dark',
            notifications: true
        }
    })
    .registerRoutes([
        {
            event: 'chat:message',
            handler: (ctx: Context<ChatMessage, AppContext>) => {
                // TypeScript infiere los tipos correctamente
                console.log('Mensaje:', ctx.payload.text);
                console.log('Usuario actual:', ctx.appContext.currentUser.name);
                
                // Autocompletado de propiedades
                if (ctx.appContext.settings.notifications) {
                    showNotification(ctx.payload);
                }
            }
        },
        {
            event: 'user:typing',
            handler: (ctx: Context<TypingIndicator, AppContext>) => {
                updateTypingIndicator(ctx.payload.userId, ctx.payload.isTyping);
            }
        }
    ])
    .start();

function showNotification(message: ChatMessage): void {
    console.log('Notificación:', message.text);
}

function updateTypingIndicator(userId: string, isTyping: boolean): void {
    console.log(`${userId} está ${isTyping ? 'escribiendo' : 'quieto'}`);
}

// ==================== EJEMPLO 2: Sistema con Guards Tipados ====================

interface AdminAction {
    action: 'delete' | 'ban' | 'edit';
    targetId: string;
    reason?: string;
}

interface User {
    id: string;
    role: 'admin' | 'moderator' | 'user';
    permissions: string[];
}

interface AdminAppContext {
    user: User;
    auditLog: (action: string) => Promise<void>;
}

// Guard tipado
const isAdmin: Guard<AdminAction, AdminAppContext> = (ctx) => {
    const isAdminRole = ctx.appContext.user.role === 'admin';
    return {
        allowed: isAdminRole,
        reason: isAdminRole ? undefined : 'Se requiere rol de administrador'
    };
};

// Guard con lógica async
const hasPermission: Guard<AdminAction, AdminAppContext> = async (ctx) => {
    const permission = `admin:${ctx.payload.action}`;
    const hasIt = ctx.appContext.user.permissions.includes(permission);
    
    return {
        allowed: hasIt,
        reason: hasIt ? undefined : `Permiso requerido: ${permission}`
    };
};

// Middleware tipado
const auditMiddleware: Middleware<AdminAction, AdminAppContext> = async (ctx, next) => {
    await ctx.appContext.auditLog(
        `${ctx.appContext.user.id} ejecutó ${ctx.payload.action} en ${ctx.payload.targetId}`
    );
    await next();
};

const admin = createCoreRealtime<AdminAppContext>();

admin.registerRoutes([
    {
        event: 'admin:action',
        guards: [isAdmin, hasPermission],
        middleware: [auditMiddleware],
        handler: async (ctx: Context<AdminAction, AdminAppContext>) => {
            // Handler completamente tipado
            switch (ctx.payload.action) {
                case 'delete':
                    await deleteResource(ctx.payload.targetId);
                    break;
                case 'ban':
                    await banUser(ctx.payload.targetId, ctx.payload.reason);
                    break;
                case 'edit':
                    await editResource(ctx.payload.targetId);
                    break;
            }
            
            ctx.broadcast('admin:action:complete', {
                action: ctx.payload.action,
                targetId: ctx.payload.targetId
            });
        }
    }
]);

async function deleteResource(id: string): Promise<void> {
    console.log('Deleting:', id);
}

async function banUser(id: string, reason?: string): Promise<void> {
    console.log('Banning:', id, reason);
}

async function editResource(id: string): Promise<void> {
    console.log('Editing:', id);
}

// ==================== EJEMPLO 3: Plugin Tipado ====================

interface LoggerPluginOptions {
    prefix?: string;
    logLevel?: 'info' | 'debug' | 'error';
    includePayload?: boolean;
}

function createLoggerPlugin(options: LoggerPluginOptions = {}): Plugin {
    const { prefix = '[Logger]', logLevel = 'info', includePayload = false } = options;
    
    return (api, utils) => {
        api.hook('beforeMessage', (ctx: Context) => {
            if (logLevel === 'debug' || logLevel === 'info') {
                const payload = includePayload ? JSON.stringify(ctx.payload) : '';
                console.log(`${prefix} Mensaje: ${ctx.type} ${payload}`);
            }
        });
        
        api.hook('onError', (error: Error, ctx?: Context) => {
            console.error(`${prefix} Error en ${ctx?.type}:`, error.message);
        });
    };
}

// Usar el plugin
chat.use(createLoggerPlugin({
    prefix: '[ChatLogger]',
    logLevel: 'debug',
    includePayload: true
}));

// ==================== EJEMPLO 4: Multiplayer Game Tipado ====================

interface GameState {
    players: Map<string, Player>;
    gameStarted: boolean;
    round: number;
}

interface Player {
    id: string;
    position: Vector2D;
    health: number;
    score: number;
}

interface Vector2D {
    x: number;
    y: number;
}

interface PlayerMovePayload {
    position: Vector2D;
    velocity: Vector2D;
}

interface GameAppContext {
    gameState: GameState;
    physics: PhysicsEngine;
}

interface PhysicsEngine {
    validatePosition(pos: Vector2D): boolean;
    applyVelocity(pos: Vector2D, vel: Vector2D): Vector2D;
}

const game = createCoreRealtime<GameAppContext>();

// Middleware con rate limiting tipado
const rateLimitMiddleware: Middleware<PlayerMovePayload, GameAppContext> = async (ctx, next) => {
    const now = Date.now();
    const lastMove = ctx.meta.lastMove as number | undefined || 0;
    
    // Max 60 movimientos por segundo
    if (now - lastMove < 16) {
        ctx.stop();
        return;
    }
    
    ctx.meta.lastMove = now;
    await next();
};

// Guard de validación de física
const validatePhysics: Guard<PlayerMovePayload, GameAppContext> = (ctx) => {
    const isValid = ctx.appContext.physics.validatePosition(ctx.payload.position);
    return {
        allowed: isValid,
        reason: isValid ? undefined : 'Posición inválida'
    };
};

game.registerRoutes([
    {
        event: 'player:join',
        handler: (ctx: Context<{ username: string }, GameAppContext>) => {
            const newPlayer: Player = {
                id: ctx.remoteClient!,
                position: { x: 0, y: 0 },
                health: 100,
                score: 0
            };
            
            ctx.appContext.gameState.players.set(ctx.remoteClient!, newPlayer);
            
            ctx.broadcast('player:joined', {
                player: newPlayer,
                totalPlayers: ctx.appContext.gameState.players.size
            });
        }
    },
    {
        event: 'player:move',
        guards: [validatePhysics],
        middleware: [rateLimitMiddleware],
        handler: (ctx: Context<PlayerMovePayload, GameAppContext>) => {
            const player = ctx.appContext.gameState.players.get(ctx.remoteClient!);
            
            if (player) {
                // Aplicar física
                player.position = ctx.appContext.physics.applyVelocity(
                    player.position,
                    ctx.payload.velocity
                );
                
                // Broadcast a otros jugadores
                ctx.broadcast('player:moved', {
                    playerId: ctx.remoteClient,
                    position: player.position
                });
            }
        }
    },
    {
        event: 'player:attack',
        handler: (ctx: Context<{ targetId: string }, GameAppContext>) => {
            const attacker = ctx.appContext.gameState.players.get(ctx.remoteClient!);
            const target = ctx.appContext.gameState.players.get(ctx.payload.targetId);
            
            if (attacker && target) {
                target.health -= 10;
                
                ctx.send('attack:result', {
                    success: true,
                    damage: 10,
                    targetHealth: target.health
                });
                
                if (target.health <= 0) {
                    attacker.score += 100;
                    ctx.broadcast('player:eliminated', {
                        eliminatedId: target.id,
                        eliminatorId: attacker.id
                    });
                }
            }
        }
    }
]);

// ==================== EJEMPLO 5: Adapter SSE (Server-Sent Events) ====================

class SSEAdapter implements TransportAdapter {
    private eventSource: EventSource | null = null;
    
    constructor(private url: string) {}
    
    onMessage(callback: (type: string, payload: any) => void): void {
        this.eventSource = new EventSource(this.url);
        
        this.eventSource.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data);
            callback(type, payload);
        };
    }
    
    send(type: string, payload: any): void {
        // SSE es unidireccional, usar fetch para enviar
        fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload })
        });
    }
    
    broadcast(type: string, payload: any): void {
        this.send(type, payload);
    }
    
    disconnect(): void {
        this.eventSource?.close();
    }
}

// ==================== EJEMPLO 6: Custom Serializer con Compresión ====================

interface CompressionSerializer {
    encode: (data: any) => string;
    decode: (data: string) => any;
}

// Serializer con compresión LZ (requiere biblioteca lz-string)
const compressionSerializer: CompressionSerializer = {
    encode: (data: any): string => {
        const json = JSON.stringify(data);
        // return LZString.compress(json); // Descomenta si tienes lz-string
        return json; // Fallback sin compresión
    },
    decode: (data: string): any => {
        // const json = LZString.decompress(data); // Descomenta si tienes lz-string
        const json = data; // Fallback sin compresión
        return JSON.parse(json);
    }
};

chat.setSerializer(compressionSerializer);

// ==================== EJEMPLO 7: Testing con Mock Adapter ====================

class MockAdapter implements TransportAdapter {
    private messageHandler: ((type: string, payload: any) => void) | null = null;
    public sentMessages: Array<{ type: string; payload: any; broadcast?: boolean }> = [];
    
    onMessage(callback: (type: string, payload: any) => void): void {
        this.messageHandler = callback;
    }
    
    send(type: string, payload: any): void {
        this.sentMessages.push({ type, payload });
    }
    
    broadcast(type: string, payload: any): void {
        this.sentMessages.push({ type, payload, broadcast: true });
    }
    
    // Helper para testing
    simulateMessage(type: string, payload: any): void {
        this.messageHandler?.(type, payload);
    }
    
    clear(): void {
        this.sentMessages = [];
    }
}

// Test
async function testChat(): Promise<void> {
    const mockAdapter = new MockAdapter();
    const testChat = createCoreRealtime<AppContext>();
    
    testChat
        .adapter(mockAdapter)
        .registerRoutes([{
            event: 'test:message',
            handler: (ctx: Context<ChatMessage, AppContext>) => {
                ctx.send('test:response', { received: true });
            }
        }])
        .start();
    
    // Simular mensaje
    mockAdapter.simulateMessage('test:message', {
        text: 'Hello',
        userId: 'user1',
        timestamp: Date.now()
    });
    
    // Verificar
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const sent = mockAdapter.sentMessages[0];
    console.assert(sent.type === 'test:response', 'Tipo correcto');
    console.assert(sent.payload.received === true, 'Payload correcto');
    
    console.log('✅ Test pasado');
}

testChat();

// ==================== EJEMPLO 8: Generic Routes ====================

// Crear rutas genéricas reutilizables
function createCRUDRoutes<T extends { id: string }>(
    resourceName: string,
    service: {
        create: (data: Omit<T, 'id'>) => Promise<T>;
        read: (id: string) => Promise<T | null>;
        update: (id: string, data: Partial<T>) => Promise<T>;
        delete: (id: string) => Promise<void>;
    }
): Route[] {
    return [
        {
            event: `${resourceName}:create`,
            handler: async (ctx: Context<Omit<T, 'id'>>) => {
                const created = await service.create(ctx.payload);
                ctx.send(`${resourceName}:created`, created);
            }
        },
        {
            event: `${resourceName}:read`,
            handler: async (ctx: Context<{ id: string }>) => {
                const item = await service.read(ctx.payload.id);
                ctx.send(`${resourceName}:read:response`, item);
            }
        },
        {
            event: `${resourceName}:update`,
            handler: async (ctx: Context<{ id: string; data: Partial<T> }>) => {
                const updated = await service.update(ctx.payload.id, ctx.payload.data);
                ctx.broadcast(`${resourceName}:updated`, updated);
            }
        },
        {
            event: `${resourceName}:delete`,
            handler: async (ctx: Context<{ id: string }>) => {
                await service.delete(ctx.payload.id);
                ctx.broadcast(`${resourceName}:deleted`, { id: ctx.payload.id });
            }
        }
    ];
}

// Usar las rutas genéricas
interface Task {
    id: string;
    title: string;
    completed: boolean;
}

const taskService = {
    create: async (data: Omit<Task, 'id'>): Promise<Task> => {
        return { ...data, id: Math.random().toString() };
    },
    read: async (id: string): Promise<Task | null> => {
        return null; // Implementar
    },
    update: async (id: string, data: Partial<Task>): Promise<Task> => {
        return { id, title: '', completed: false, ...data };
    },
    delete: async (id: string): Promise<void> => {
        // Implementar
    }
};

const taskRoutes = createCRUDRoutes<Task>('task', taskService);
chat.registerRoutes(taskRoutes);