# 📡 CoreRealtime - Documentación

Sistema de comunicación en tiempo real **100% agnóstico** a frameworks y tecnologías de transporte.

---

## 🚀 Inicio Rápido

```javascript
import { createCoreRealtime } from './core-realtime.js';

// 1. Crear instancia
const realtime = createCoreRealtime({ debug: true });

// 2. Configurar adapter (WebSocket, SSE, etc)
realtime.adapter(miAdapterDeWebSocket);

// 3. Registrar rutas
realtime.registerRoutes([
    {
        event: 'mensaje',
        handler: (ctx) => {
            console.log('Mensaje recibido:', ctx.payload);
        }
    }
]);

// 4. Iniciar
realtime.start();
```

---

## 📦 Instalación

Simplemente copia el archivo `core-realtime.js` a tu proyecto. No tiene dependencias.

---

## 🎯 Conceptos Básicos

### 1️⃣ Adapter (Transporte)

Un adapter es la capa que conecta CoreRealtime con tu tecnología de transporte (WebSocket, Socket.io, SSE, etc).

**Contrato mínimo** que debe cumplir:

```javascript
const miAdapter = {
    // Recibir mensajes
    onMessage: (callback) => {
        // callback(tipo, payload)
    },
    
    // Enviar a un cliente específico
    send: (tipo, payload) => {
        // ...
    },
    
    // Enviar a todos
    broadcast: (tipo, payload) => {
        // ...
    },
    
    // Opcional: normalizar payload
    normalizePayload: (rawPayload) => {
        return {
            clientId: '...',
            payload: { /* datos */ },
            channel: '...',
            applicationId: '...',
            emitterClientId: '...'
        };
    },
    
    // Opcional: cleanup
    disconnect: () => {
        // Cerrar conexiones
    }
};
```

### 2️⃣ Rutas (Routes)

Las rutas definen qué hacer cuando llega un mensaje de cierto tipo.

```javascript
realtime.registerRoutes([
    {
        event: 'chat:mensaje',      // Nombre del evento
        guards: [],                  // Validaciones (opcional)
        middleware: [],              // Transformaciones (opcional)
        handler: (ctx) => {          // Función principal
            console.log(ctx.payload);
        }
    }
]);
```

### 3️⃣ Contexto (ctx)

Cada mensaje recibe un objeto `ctx` con toda la información:

```javascript
handler: (ctx) => {
    ctx.type              // Tipo de evento
    ctx.payload           // Datos del mensaje
    ctx.remoteClient      // ID del cliente que envió
    ctx.localClientId     // Tu ID de cliente
    ctx.channel           // Canal (si aplica)
    ctx.applicationId     // ID de app (si aplica)
    ctx.appContext        // Contexto global de tu app
    ctx.meta              // Metadata custom
    
    // Métodos
    ctx.send(tipo, datos)         // Enviar a un cliente
    ctx.broadcast(tipo, datos)    // Enviar a todos
    ctx.emit(evento, datos)       // Evento local
    ctx.stop()                    // Detener propagación
    ctx.isStopped()               // Verificar si está detenido
}
```

---

## 🛠️ Guía de Uso

### Crear Instancia

```javascript
const realtime = createCoreRealtime({
    debug: true,                    // Ver logs
    autoReconnect: true,            // Reconectar automáticamente
    maxReconnectAttempts: 5,        // Intentos de reconexión
    reconnectDelay: 1000,           // Delay entre intentos (ms)
    strictMode: true                // Validar adapters estrictamente
});
```

### Configurar Adapter

```javascript
// Ejemplo con WebSocket nativo
const wsAdapter = {
    ws: null,
    
    onMessage(callback) {
        this.ws = new WebSocket('ws://localhost:3000');
        this.ws.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data);
            callback(type, payload);
        };
    },
    
    send(type, payload) {
        this.ws.send(JSON.stringify({ type, payload }));
    },
    
    broadcast(type, payload) {
        // En cliente no aplica, pero debe existir
        console.warn('Broadcast no disponible en cliente');
    },
    
    disconnect() {
        this.ws?.close();
    }
};

realtime.adapter(wsAdapter);
```

### Registrar Middleware Global

Se ejecuta en **todos** los mensajes:

```javascript
realtime.registerGlobalMiddleware([
    // Logger
    async (ctx, next) => {
        console.log(`📥 Mensaje: ${ctx.type}`);
        await next();
        console.log(`✅ Procesado: ${ctx.type}`);
    },
    
    // Autenticación
    async (ctx, next) => {
        if (!ctx.appContext.user) {
            ctx.stop();
            return;
        }
        await next();
    },
    
    // Rate limiting
    async (ctx, next) => {
        if (yaExcedimoLimite()) {
            ctx.stop();
            return;
        }
        await next();
    }
]);
```

### Registrar Rutas con Guards

```javascript
realtime.registerRoutes([
    {
        event: 'admin:delete',
        
        // Guards: validaciones que retornan boolean o {allowed, reason}
        guards: [
            (ctx) => {
                const isAdmin = ctx.appContext.user?.role === 'admin';
                return {
                    allowed: isAdmin,
                    reason: 'Se requiere rol de administrador'
                };
            }
        ],
        
        // Middleware específico de esta ruta
        middleware: [
            async (ctx, next) => {
                // Loguear acción sensible
                await logAudit(ctx.payload);
                await next();
            }
        ],
        
        // Handler
        handler: async (ctx) => {
            await deleteResource(ctx.payload.id);
            ctx.broadcast('resource:deleted', { id: ctx.payload.id });
        }
    }
]);
```

### Establecer Contexto Global

```javascript
// Contexto disponible en todos los handlers
realtime.setAppContext({
    user: { id: 123, name: 'Juan', role: 'admin' },
    config: { theme: 'dark' },
    services: {
        api: miAPIService,
        db: miDBService
    }
});

// Usar en handlers
realtime.registerRoutes([{
    event: 'profile:update',
    handler: (ctx) => {
        const userId = ctx.appContext.user.id;
        const api = ctx.appContext.services.api;
        // ...
    }
}]);
```

### Iniciar y Detener

```javascript
// Iniciar
await realtime.start();

// Verificar estado
if (realtime.isStarted()) {
    console.log('Sistema activo');
}

// Detener (limpia listeners, desconecta transport)
realtime.stop();

// Reset completo (vuelve a estado inicial)
realtime.reset();
```

---

## 🔌 Eventos Internos

Para comunicación dentro de tu app (no pasan por el transport):

```javascript
// Escuchar evento
realtime.on('user:login', (data) => {
    console.log('Usuario logueado:', data);
});

// Emitir evento
realtime.emit('user:login', { userId: 123 });

// Dejar de escuchar
const callback = (data) => console.log(data);
realtime.on('test', callback);
realtime.off('test', callback);
```

---

## 🎣 Lifecycle Hooks

Ejecuta código en momentos específicos:

```javascript
// Antes de iniciar
realtime.hook('beforeStart', async () => {
    await cargarConfiguracion();
});

// Después de iniciar
realtime.hook('afterStart', () => {
    console.log('Sistema listo');
});

// Antes de cada mensaje
realtime.hook('beforeMessage', (ctx) => {
    console.log('Mensaje entrante:', ctx.type);
});

// Después de cada mensaje
realtime.hook('afterMessage', (ctx) => {
    metricas.incrementar('mensajes');
});

// En errores
realtime.hook('onError', (error, ctx) => {
    reportarError(error);
});
```

---

## 🔧 Personalización Avanzada

### Custom Error Handler

```javascript
realtime.setErrorHandler((error, ctx) => {
    // Enviar a servicio de monitoreo
    Sentry.captureException(error, {
        extra: { eventType: ctx.type }
    });
    
    // Responder al cliente
    ctx.send('error', {
        message: 'Algo salió mal',
        code: 'INTERNAL_ERROR'
    });
});
```

### Custom Serializer

```javascript
// Ejemplo: comprimir con LZ-String
realtime.setSerializer({
    encode: (data) => {
        return LZString.compress(JSON.stringify(data));
    },
    decode: (data) => {
        return JSON.parse(LZString.decompress(data));
    }
});
```

### Custom Event Emitter

```javascript
// Usar EventEmitter3, mitt, etc
import mitt from 'mitt';

const emitter = mitt();
realtime.setEventEmitter(emitter);

// Ahora todos los eventos usan mitt
realtime.on('test', callback);
```

---

## 🧩 Sistema de Plugins

Crea funcionalidad reutilizable:

```javascript
// Plugin simple (función)
function loggerPlugin(api, utils) {
    api.hook('beforeMessage', (ctx) => {
        console.log(`[Plugin] ${ctx.type}`);
    });
}

// Plugin complejo (objeto)
const analyticsPlugin = {
    install(api, utils) {
        let messageCount = 0;
        
        api.hook('afterMessage', () => {
            messageCount++;
        });
        
        api.on('stats:request', () => {
            api.emit('stats:response', { messageCount });
        });
    }
};

// Instalar plugins
realtime
    .use(loggerPlugin)
    .use(analyticsPlugin);
```

---

## 📋 Ejemplos Completos

### Ejemplo 1: Chat Simple

```javascript
import { createCoreRealtime } from './core-realtime.js';

const chat = createCoreRealtime({ debug: true });

// Adapter WebSocket
const wsAdapter = {
    ws: new WebSocket('ws://localhost:3000'),
    
    onMessage(callback) {
        this.ws.onmessage = (e) => {
            const { type, payload } = JSON.parse(e.data);
            callback(type, payload);
        };
    },
    
    send(type, payload) {
        this.ws.send(JSON.stringify({ type, payload }));
    },
    
    broadcast(type, payload) {
        this.send(type, payload);
    }
};

// Configurar
chat
    .adapter(wsAdapter)
    .setAppContext({ userId: 'user123' })
    .registerRoutes([
        {
            event: 'chat:mensaje',
            handler: (ctx) => {
                mostrarMensajeEnUI(ctx.payload);
            }
        },
        {
            event: 'user:typing',
            handler: (ctx) => {
                mostrarIndicadorTyping(ctx.remoteClient);
            }
        }
    ])
    .start();

// Enviar mensaje
function enviarMensaje(texto) {
    chat.getTransport().send('chat:mensaje', {
        texto,
        timestamp: Date.now()
    });
}
```

### Ejemplo 2: Sistema con Autenticación

```javascript
const app = createCoreRealtime();

// Middleware de autenticación
app.registerGlobalMiddleware([
    async (ctx, next) => {
        // Validar token
        const token = ctx.payload.token;
        const user = await validarToken(token);
        
        if (!user) {
            ctx.stop();
            ctx.send('error', { message: 'No autorizado' });
            return;
        }
        
        // Inyectar usuario en contexto
        ctx.meta.user = user;
        await next();
    }
]);

// Rutas protegidas
app.registerRoutes([
    {
        event: 'data:fetch',
        guards: [
            (ctx) => ctx.meta.user?.verified === true
        ],
        handler: async (ctx) => {
            const data = await fetchData(ctx.meta.user.id);
            ctx.send('data:response', data);
        }
    }
]);
```

### Ejemplo 3: Multiplayer Game

```javascript
const game = createCoreRealtime({ debug: false });

// Estado del juego
const gameState = {
    players: new Map(),
    gameStarted: false
};

game
    .setAppContext({ gameState })
    .registerRoutes([
        // Jugador se une
        {
            event: 'player:join',
            handler: (ctx) => {
                gameState.players.set(ctx.remoteClient, {
                    id: ctx.remoteClient,
                    position: { x: 0, y: 0 }
                });
                
                ctx.broadcast('player:joined', {
                    playerId: ctx.remoteClient,
                    totalPlayers: gameState.players.size
                });
            }
        },
        
        // Movimiento
        {
            event: 'player:move',
            middleware: [
                // Rate limiting: max 60 movimientos/segundo
                async (ctx, next) => {
                    const now = Date.now();
                    const lastMove = ctx.meta.lastMove || 0;
                    
                    if (now - lastMove < 16) { // ~60fps
                        ctx.stop();
                        return;
                    }
                    
                    ctx.meta.lastMove = now;
                    await next();
                }
            ],
            handler: (ctx) => {
                const player = gameState.players.get(ctx.remoteClient);
                if (player) {
                    player.position = ctx.payload.position;
                    
                    ctx.broadcast('player:moved', {
                        playerId: ctx.remoteClient,
                        position: ctx.payload.position
                    });
                }
            }
        }
    ])
    .start();
```

---

## 🧪 Testing

CoreRealtime es fácil de testear porque puedes mockear el adapter:

```javascript
// mock-adapter.js
export function createMockAdapter() {
    let messageHandler = null;
    const sentMessages = [];
    
    return {
        onMessage(callback) {
            messageHandler = callback;
        },
        
        send(type, payload) {
            sentMessages.push({ type, payload });
        },
        
        broadcast(type, payload) {
            sentMessages.push({ type, payload, broadcast: true });
        },
        
        // Helpers para testing
        simulateMessage(type, payload) {
            messageHandler?.(type, payload);
        },
        
        getSentMessages() {
            return sentMessages;
        },
        
        clear() {
            sentMessages.length = 0;
        }
    };
}

// test.js
import { createCoreRealtime } from './core-realtime.js';
import { createMockAdapter } from './mock-adapter.js';

const mockAdapter = createMockAdapter();
const realtime = createCoreRealtime()
    .adapter(mockAdapter)
    .registerRoutes([{
        event: 'test',
        handler: (ctx) => {
            ctx.send('response', { ok: true });
        }
    }])
    .start();

// Simular mensaje entrante
mockAdapter.simulateMessage('test', { data: 'hello' });

// Verificar respuesta
const sent = mockAdapter.getSentMessages();
console.assert(sent[0].type === 'response');
console.assert(sent[0].payload.ok === true);
```

---

## ❓ FAQ

**¿Funciona en Node.js y navegador?**  
Sí, es 100% agnóstico. Solo necesitas un adapter apropiado para cada entorno.

**¿Puedo usar TypeScript?**  
Sí, puedes añadir tipos fácilmente o esperar una versión oficial con tipos.

**¿Cómo manejo reconexiones?**  
Tu adapter debe manejar reconexiones. CoreRealtime no conoce los detalles del transporte.

**¿Soporta múltiples canales?**  
Sí, tu adapter puede incluir `channel` en el payload normalizado.

**¿Es production-ready?**  
Depende de tu adapter y testing. El core es estable pero debes probarlo bien.

**¿Tiene dependencias?**  
No, cero dependencias. Es JavaScript puro.

---

## 📄 Licencia

MIT - Usa como quieras

---

## 🤝 Contribuir

¿Ideas? ¿Bugs? ¡Contribuye! Este es código abierto para la comunidad.

---

**¡Disfruta de CoreRealtime! 🎉**