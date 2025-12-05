# Core Realtime - Sistema de Eventos en Tiempo Real

Un sistema framework-agnostic para manejo de eventos WebSocket/Realtime con middleware pipeline, routing, guards y soporte para múltiples proveedores.

**Autor:** Daniel Reyes Epitacio 🚀

---

## Tabla de Contenidos

- [¿Qué es Core Realtime?](#qué-es-core-realtime)
- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Inicio Rápido](#inicio-rápido)
- [Conceptos Fundamentales](#conceptos-fundamentales)
- [Adapters](#adapters)
- [Middleware](#middleware)
- [Guards](#guards)
- [Routing](#routing)
- [Contexto de la Aplicación](#contexto-de-la-aplicación)
- [Event Bus](#event-bus)
- [Ejemplos del Mundo Real](#ejemplos-del-mundo-real)
- [API Reference](#api-reference)
- [FAQ](#faq)

---

## ¿Qué es Core Realtime?

Core Realtime es una **abstracción de alto nivel** para trabajar con eventos en tiempo real (WebSockets, Ably, Pusher, Socket.io, etc.) que te permite:

- ✅ **Cambiar de proveedor** sin tocar tu código de negocio
- ✅ **Middleware pipeline** estilo Express/Koa para procesar eventos
- ✅ **Guards** para validar permisos y autenticación
- ✅ **Routing** de eventos con handlers específicos
- ✅ **Event bus interno** para comunicación entre componentes
- ✅ **Inyección de contexto** para compartir datos globales

### ¿Por qué usarlo?

**Sin Core Realtime:**
```javascript
// Código acoplado a Ably
const ably = new Ably.Realtime(apiKey);
const channel = ably.channels.get('chat');

channel.subscribe('message', (msg) => {
  // ¿Es de mi tenant? ¿Está autenticado? ¿Tiene permisos?
  if (!checkAuth()) return;
  if (!checkTenant(msg)) return;
  if (!checkPermissions(msg)) return;
  
  // Lógica de negocio mezclada con validaciones
  handleMessage(msg);
});

// Si cambias a Pusher, tienes que reescribir TODO
```

**Con Core Realtime:**
```javascript
// Código desacoplado, limpio y reutilizable
const realtime = createCoreRealtime()
  .registerGlobalMiddleware([authMiddleware, tenantMiddleware])
  .registerRoutes([
    {
      event: 'message',
      guards: [hasPermission('send_message')],
      handler: handleMessage
    }
  ])
  .adapter(ablyAdapter(apiKey, ['chat']))
  .start();

// Para cambiar a Pusher, solo cambias el adapter
// .adapter(pusherAdapter(config, ['chat']))
// ¡Todo lo demás sigue igual!
```

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Tu Aplicación                     │
│  (React, Vue, Vanilla JS, Node.js, etc.)            │
└────────────────────┬────────────────────────────────┘
                     │
                     │ .on('event', callback)
                     │ .emit('event', data)
                     ▼
┌─────────────────────────────────────────────────────┐
│              Core Realtime (Event Bus)              │
│  • Routing                                          │
│  • Middleware Pipeline                              │
│  • Guards                                           │
│  • Context Management                               │
└────────────────────┬────────────────────────────────┘
                     │
                     │ TransportAdapter interface
                     ▼
┌─────────────────────────────────────────────────────┐
│                    Adapters                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Ably    │ │  Pusher  │ │Socket.io │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                         │
│  │   Mock   │ │  Custom  │                         │
│  └──────────┘ └──────────┘                         │
└────────────────────┬────────────────────────────────┘
                     │
                     │ WebSocket/HTTP
                     ▼
              ☁️ Servidor Realtime
```

### Flujo de un Evento

```
1. Evento llega por WebSocket
   ↓
2. Adapter normaliza el evento
   ↓
3. Middleware Global (auth, logging, etc.)
   ↓
4. Router busca el handler
   ↓
5. Guards validan permisos
   ↓
6. Middleware de ruta (validación específica)
   ↓
7. Handler procesa el evento
   ↓
8. Event Bus notifica a listeners locales
```

---

## Instalación

```javascript
// Core
import { createCoreRealtime } from './core-realtime';

// Adapter que quieras usar
import { ablyAdapter } from './adapters/ably-adapter';
// o
import { pusherAdapter } from './adapters/pusher-adapter';
// o
import { mockAdapter } from './adapters/mock-adapter';
```

---

## Inicio Rápido

### Setup Básico (3 pasos)

```javascript
// 1. Crear instancia
const realtime = createCoreRealtime();

// 2. Configurar
realtime
  .registerRoutes([
    {
      event: 'message',
      handler: (ctx) => {
        console.log('Mensaje recibido:', ctx.payload);
      }
    }
  ])
  .adapter(ablyAdapter('tu-api-key', ['chat']))
  .start();

// 3. Escuchar eventos
realtime.on('message', (data) => {
  console.log('Evento procesado:', data);
});
```

### Setup Completo (con todas las features)

```javascript
const realtime = createCoreRealtime()
  // Middleware global
  .registerGlobalMiddleware([
    // Logger
    async (ctx, next) => {
      console.log(`📥 [${ctx.type}] de ${ctx.remoteClient}`);
      const start = Date.now();
      await next();
      console.log(`✅ [${ctx.type}] procesado en ${Date.now() - start}ms`);
    },
    
    // Filtro de environment
    async (ctx, next) => {
      if (ctx.applicationId !== ctx.appContext.applicationId) {
        console.log('Evento de otro environment, ignorado');
        ctx.stop();
        return;
      }
      await next();
    }
  ])
  
  // Rutas con guards y middleware
  .registerRoutes([
    {
      event: 'message.send',
      guards: [
        (ctx) => ctx.appContext.isAuthenticated,
        (ctx) => ctx.appContext.permissions.includes('send_message')
      ],
      middleware: [
        async (ctx, next) => {
          // Validar payload
          if (!ctx.payload.text?.trim()) {
            console.error('Mensaje vacío');
            return;
          }
          await next();
        }
      ],
      handler: async (ctx) => {
        await saveMessage(ctx.payload);
        ctx.emit('message.sent', ctx.payload);
      }
    }
  ])
  
  // Adapter
  .adapter(ablyAdapter('api-key', ['chat', 'notifications']))
  
  // Contexto de la app
  .setAppContext({
    userId: '123',
    tenantId: '456',
    applicationId: 'production',
    isAuthenticated: true,
    permissions: ['send_message', 'delete_message']
  })
  
  // Iniciar
  .start();

// Event bus
realtime.on('message.sent', (data) => {
  updateUI(data);
});
```

---

## Conceptos Fundamentales

### 1. RealtimeContext

Cada evento recibe un **contexto** con toda la información necesaria:

```javascript
{
  type: 'message.send',           // Nombre del evento
  payload: { text: 'Hola' },      // Datos del evento
  applicationId: 'prod',          // ID de la app que emitió
  channel: 'chat.room1',          // Canal de origen
  remoteClient: 'client-abc',     // ID del cliente emisor
  localClientId: 'client-xyz',    // ID de este cliente
  emitterClientId: 'client-abc',  // ID del emisor original
  
  // Métodos
  send: (type, data) => {},       // Enviar a cliente específico
  broadcast: (type, data) => {},  // Enviar a todos
  emit: (event, data) => {},      // Event bus local
  stop: () => {},                 // Detener propagación
  isStopped: () => boolean,       // ¿Está detenido?
  
  // Contexto de tu app
  appContext: {
    userId: '123',
    tenantId: '456',
    permissions: [...]
  },
  
  // Metadata adicional
  meta: {}
}
```

**Ejemplo de uso:**

```javascript
handler: async (ctx) => {
  console.log(`Usuario ${ctx.appContext.userId} envió: ${ctx.payload.text}`);
  
  // Guardar en BD
  await db.messages.create({
    userId: ctx.appContext.userId,
    text: ctx.payload.text,
    channel: ctx.channel
  });
  
  // Notificar a otros componentes
  ctx.emit('message.saved', { messageId: msg.id });
  
  // Responder al emisor
  ctx.send('message.ack', { status: 'saved' });
}
```

### 2. Middleware

Los middleware son funciones que **procesan eventos** antes de llegar al handler.

**Características:**
- Se ejecutan en orden (como Express/Koa)
- Pueden modificar el contexto
- Pueden detener la propagación con `ctx.stop()`
- Deben llamar a `next()` para continuar

**Tipos de middleware:**

#### Global Middleware
Se ejecuta para **TODOS** los eventos:

```javascript
.registerGlobalMiddleware([
  // Logger
  async (ctx, next) => {
    console.log(`Evento recibido: ${ctx.type}`);
    await next();
    console.log(`Evento procesado: ${ctx.type}`);
  },
  
  // Error handler
  async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Error:', error);
      ctx.send('error', { message: error.message });
    }
  }
])
```

#### Route Middleware
Se ejecuta solo para una ruta específica:

```javascript
{
  event: 'message.send',
  middleware: [
    async (ctx, next) => {
      // Sanitizar HTML
      ctx.payload.text = sanitizeHTML(ctx.payload.text);
      await next();
    },
    async (ctx, next) => {
      // Detectar spam
      if (isSpam(ctx.payload.text)) {
        ctx.stop();
        return;
      }
      await next();
    }
  ],
  handler: (ctx) => { ... }
}
```

### 3. Guards

Los guards son **validadores** que retornan `true` o `false`:

```javascript
// Guard simple
const isAuthenticated = (ctx) => {
  return ctx.appContext.userId !== null;
};

// Guard de permisos
const hasPermission = (permission) => (ctx) => {
  return ctx.appContext.permissions.includes(permission);
};

// Guard de ownership
const isOwner = (ctx) => {
  return ctx.payload.userId === ctx.appContext.userId;
};

// Uso
{
  event: 'message.delete',
  guards: [
    isAuthenticated,
    hasPermission('delete_message'),
    isOwner
  ],
  handler: deleteMessage
}
```

**Diferencia entre Guard y Middleware:**

| Guard | Middleware |
|-------|-----------|
| Retorna true/false | Llama a next() |
| Valida permisos | Transforma datos |
| Síncronos | Asíncronos |
| Simple | Más poderoso |

### 4. Routing

El routing **mapea eventos a handlers**:

```javascript
.registerRoutes([
  {
    event: 'user.login',
    handler: (ctx) => {
      updateUserStatus(ctx.payload.userId, 'online');
    }
  },
  {
    event: 'user.logout',
    handler: (ctx) => {
      updateUserStatus(ctx.payload.userId, 'offline');
    }
  },
  {
    event: 'message.send',
    guards: [isAuthenticated],
    handler: sendMessage
  }
])
```

**Convención de nombres:**

```
<recurso>.<acción>
  
Ejemplos:
- message.send
- message.delete
- user.login
- user.logout
- notification.received
- presence.update
```

---

## Adapters

Los adapters **abstraen la implementación** del proveedor de WebSocket.

### Interfaz TransportAdapter

Todo adapter debe implementar:

```javascript
{
  // Registrar callback para mensajes entrantes
  onMessage: (callback) => {
    // callback(eventType, payload)
  },
  
  // Enviar mensaje a cliente específico
  send: (type, data) => {},
  
  // Enviar mensaje a todos los clientes
  broadcast: (type, data) => {},
  
  // Opcional: desuscribirse
  off: (event, callback, channel) => {}
}
```

### Ably Adapter (Implementación Real)

```javascript
import * as Ably from 'ably';

export function ablyAdapter(apiKey, channelNames = []) {
  const ably = new Ably.Realtime(apiKey);
  const channels = new Map();
  const listeners = new Map();
  let messageHandler = () => {};

  // Inicializar canales
  channelNames.forEach(name => {
    const ch = ably.channels.get(name);
    channels.set(name, ch);
    listeners.set(name, new Map());

    // Suscribirse a todos los eventos del canal
    ch.subscribe(msg => {
      const data = msg.data || {};
      const applicationId = data.ApplicationIdentifier || null;
      const payload = data.Data || null;
      const emitterClientId = data.EmitterClientId || null;

      if (msg.name) {
        messageHandler(msg.name, {
          applicationId,
          channel: name,
          payload,
          emitterClientId
        });
      }
    });
  });

  return {
    onMessage(fn) {
      messageHandler = fn;
    },

    send(type, eventObj) {
      const targetChannel = eventObj.channel || channelNames[0];
      const ch = channels.get(targetChannel);
      if (!ch) {
        throw new Error(`Channel ${targetChannel} no registrado`);
      }
      ch.publish(type, eventObj);
    },

    broadcast(type, eventObj) {
      channelNames.forEach(name => {
        const ch = channels.get(name);
        if (ch) ch.publish(type, eventObj);
      });
    },

    subscribe(type, callback, channelName) {
      if (!channelName) {
        throw new Error('Debe especificar channelName');
      }

      const ch = channels.get(channelName);
      if (!ch) {
        throw new Error(`Channel ${channelName} no registrado`);
      }

      let channelListeners = listeners.get(channelName);
      if (!channelListeners) {
        channelListeners = new Map();
        listeners.set(channelName, channelListeners);
      }

      let callbacks = channelListeners.get(type);
      if (!callbacks) {
        callbacks = new Set();
        channelListeners.set(type, callbacks);
      }

      // Evitar doble suscripción
      if (!callbacks.has(callback)) {
        callbacks.add(callback);
        ch.subscribe(type, callback);
      }
    },

    unsubscribe(type, callback, channelName) {
      if (!channelName) {
        throw new Error('Debe especificar channelName');
      }

      const ch = channels.get(channelName);
      if (!ch) {
        throw new Error(`Channel ${channelName} no registrado`);
      }

      const channelListeners = listeners.get(channelName);
      if (!channelListeners) return;

      const callbacks = channelListeners.get(type);
      if (!callbacks) return;

      if (callbacks.has(callback)) {
        callbacks.delete(callback);
        ch.unsubscribe(type, callback);

        // Limpieza
        if (callbacks.size === 0) {
          channelListeners.delete(type);
        }
        if (channelListeners.size === 0) {
          listeners.delete(channelName);
        }
      }
    }
  };
}
```

**Uso:**

```javascript
const realtime = createCoreRealtime()
  .adapter(ablyAdapter(
    'tu-api-key',
    ['chat.room1', 'notifications', 'presence']
  ))
  .start();
```

### Mock Adapter (Para Testing)

```javascript
export function mockAdapter(options = {}) {
  let messageCallback = () => {};
  const eventQueue = [];
  const delay = options.delay || 0;

  return {
    onMessage(fn) {
      messageCallback = fn;
    },

    send(type, data) {
      console.log('[Mock] Send:', type, data);
      
      // Simular recepción después de un delay
      if (options.simulateReceive) {
        setTimeout(() => {
          messageCallback(type, {
            applicationId: options.applicationId || 'mock-app',
            channel: data.channel || 'mock-channel',
            payload: data,
            emitterClientId: 'mock-client'
          });
        }, delay);
      }
    },

    broadcast(type, data) {
      console.log('[Mock] Broadcast:', type, data);
      
      if (options.simulateReceive) {
        setTimeout(() => {
          messageCallback(type, {
            applicationId: options.applicationId || 'mock-app',
            channel: 'broadcast',
            payload: data,
            emitterClientId: 'mock-client'
          });
        }, delay);
      }
    },

    // Métodos de testing
    simulateEvent(type, payload, metadata = {}) {
      messageCallback(type, {
        applicationId: metadata.applicationId || 'mock-app',
        channel: metadata.channel || 'test-channel',
        payload,
        emitterClientId: metadata.emitterClientId || 'mock-client'
      });
    },

    getEventQueue() {
      return [...eventQueue];
    },

    clearQueue() {
      eventQueue.length = 0;
    }
  };
}
```

**Uso en tests:**

```javascript
// Setup
const mock = mockAdapter({ delay: 10, simulateReceive: true });
const realtime = createCoreRealtime()
  .registerRoutes([
    {
      event: 'test',
      handler: (ctx) => {
        console.log('Test event:', ctx.payload);
      }
    }
  ])
  .adapter(mock)
  .start();

// Test
mock.simulateEvent('test', { message: 'Hello' });

// Assert
await wait(20);
// Verificar que el handler se ejecutó
```

### Pusher Adapter (Ejemplo)

```javascript
import Pusher from 'pusher-js';

export function pusherAdapter(config, channelNames = []) {
  const pusher = new Pusher(config.key, {
    cluster: config.cluster,
    encrypted: true
  });

  const channels = new Map();
  let messageHandler = () => {};

  channelNames.forEach(name => {
    const channel = pusher.subscribe(name);
    channels.set(name, channel);

    // Bind a todos los eventos
    channel.bind_global((eventName, data) => {
      messageHandler(eventName, {
        applicationId: data.applicationId,
        channel: name,
        payload: data.payload,
        emitterClientId: data.clientId
      });
    });
  });

  return {
    onMessage(fn) {
      messageHandler = fn;
    },

    send(type, data) {
      // Pusher no soporta send directo, usar trigger
      const channel = channels.get(data.channel);
      if (channel) {
        channel.trigger(type, data);
      }
    },

    broadcast(type, data) {
      channels.forEach(channel => {
        channel.trigger(type, data);
      });
    }
  };
}
```

### Socket.io Adapter (Ejemplo)

```javascript
import io from 'socket.io-client';

export function socketIOAdapter(serverUrl, options = {}) {
  const socket = io(serverUrl, options);
  let messageHandler = () => {};

  // Escuchar todos los eventos
  socket.onAny((eventName, data) => {
    messageHandler(eventName, {
      applicationId: data.applicationId,
      channel: data.channel || 'default',
      payload: data.payload,
      emitterClientId: socket.id
    });
  });

  return {
    onMessage(fn) {
      messageHandler = fn;
    },

    send(type, data) {
      socket.emit(type, data);
    },

    broadcast(type, data) {
      socket.emit(type, { ...data, broadcast: true });
    },

    off(event) {
      socket.off(event);
    }
  };
}
```

---

## Middleware

### Middleware Global

Se ejecuta para **todos** los eventos.

#### Logger Middleware

```javascript
const loggerMiddleware = async (ctx, next) => {
  const start = Date.now();
  console.log(`📥 [${ctx.type}] Recibido`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`✅ [${ctx.type}] Procesado en ${duration}ms`);
};
```

#### Auth Middleware

```javascript
const authMiddleware = async (ctx, next) => {
  if (!ctx.appContext.userId) {
    console.warn('❌ Usuario no autenticado');
    ctx.stop();
    return;
  }
  
  console.log(`✅ Usuario autenticado: ${ctx.appContext.userId}`);
  await next();
};
```

#### Environment Filter

```javascript
const environmentFilter = async (ctx, next) => {
  const myApp = ctx.appContext.applicationId;
  const eventApp = ctx.applicationId;
  
  if (eventApp && eventApp !== myApp) {
    console.log(`⚠️ Evento de otro environment (${eventApp}), ignorado`);
    ctx.stop();
    return;
  }
  
  await next();
};
```

#### Rate Limiting

```javascript
const rateLimitMiddleware = (() => {
  const requests = new Map();
  const LIMIT = 10; // 10 requests
  const WINDOW = 60000; // por minuto
  
  return async (ctx, next) => {
    const userId = ctx.appContext.userId;
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }
    
    const userRequests = requests.get(userId);
    
    // Limpiar requests antiguos
    const recentRequests = userRequests.filter(
      time => now - time < WINDOW
    );
    
    if (recentRequests.length >= LIMIT) {
      console.warn(`❌ Rate limit excedido para ${userId}`);
      ctx.send('rate_limit_exceeded', {
        message: 'Demasiadas peticiones, intenta más tarde'
      });
      ctx.stop();
      return;
    }
    
    recentRequests.push(now);
    requests.set(userId, recentRequests);
    
    await next();
  };
})();
```

#### Error Handler

```javascript
const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`❌ Error en [${ctx.type}]:`, error);
    
    ctx.send('error', {
      event: ctx.type,
      message: error.message,
      timestamp: Date.now()
    });
    
    // Enviar a servicio de monitoring
    reportError(error, ctx);
  }
};
```

#### Performance Monitor

```javascript
const performanceMonitor = async (ctx, next) => {
  const start = performance.now();
  
  await next();
  
  const duration = performance.now() - start;
  
  if (duration > 100) {
    console.warn(`⚠️ [${ctx.type}] tardó ${duration.toFixed(2)}ms`);
  }
  
  // Enviar métricas
  sendMetric('event.duration', duration, {
    event: ctx.type,
    userId: ctx.appContext.userId
  });
};
```

### Middleware de Ruta

Se ejecuta solo para rutas específicas.

#### Payload Validation

```javascript
{
  event: 'message.send',
  middleware: [
    async (ctx, next) => {
      const { text, recipientId } = ctx.payload;
      
      if (!text || text.trim() === '') {
        console.error('❌ Mensaje vacío');
        ctx.send('validation_error', {
          field: 'text',
          message: 'El mensaje no puede estar vacío'
        });
        return;
      }
      
      if (!recipientId) {
        console.error('❌ Falta recipientId');
        ctx.send('validation_error', {
          field: 'recipientId',
          message: 'Debe especificar un destinatario'
        });
        return;
      }
      
      await next();
    }
  ],
  handler: sendMessage
}
```

#### Data Transformation

```javascript
{
  event: 'message.send',
  middleware: [
    async (ctx, next) => {
      // Sanitizar HTML
      ctx.payload.text = sanitizeHTML(ctx.payload.text);
      
      // Agregar timestamp
      ctx.payload.timestamp = Date.now();
      
      // Agregar info del usuario
      ctx.payload.senderId = ctx.appContext.userId;
      ctx.payload.senderName = ctx.appContext.userName;
      
      await next();
    }
  ],
  handler: saveMessage
}
```

#### Spam Detection

```javascript
{
  event: 'message.send',
  middleware: [
    async (ctx, next) => {
      const text = ctx.payload.text;
      
      // Detectar spam
      if (containsSpamKeywords(text)) {
        console.warn('⚠️ Spam detectado');
        ctx.send('spam_detected', {
          message: 'Tu mensaje fue marcado como spam'
        });
        ctx.stop();
        return;
      }
      
      // Detectar flood
      if (text.length > 5000) {
        console.warn('⚠️ Mensaje demasiado largo');
        ctx.send('message_too_long', {
          maxLength: 5000
        });
        ctx.stop();
        return;
      }
      
      await next();
    }
  ],
  handler: sendMessage
}
```

---

## Guards

Los guards son **validadores síncronos** que retornan `true` o `false`.

### Guards Básicos

```javascript
// Autenticación
const isAuthenticated = (ctx) => {
  return ctx.appContext.userId !== null;
};

// Role
const hasRole = (role) => (ctx) => {
  return ctx.appContext.userRole === role;
};

// Permission
const hasPermission = (permission) => (ctx) => {
  return ctx.appContext.permissions.includes(permission);
};

// Owner
const isOwner = (ctx) => {
  return ctx.payload.userId === ctx.appContext.userId;
};

// Tenant
const sameTenant = (ctx) => {
  return ctx.payload.tenantId === ctx.appContext.tenantId;
};
```

### Guards Compuestos

```javascript
// Admin OR Owner
const isAdminOrOwner = (ctx) => {
  return ctx.appContext.userRole === 'admin' ||
         ctx.payload.userId === ctx.appContext.userId;
};

// Authenticated AND HasPermission
const canDelete = (ctx) => {
  return ctx.appContext.userId !== null &&
         ctx.appContext.permissions.includes('delete');
};
```

### Uso en Rutas

```javascript
.registerRoutes([
  {
    event: 'message.send',
    guards: [isAuthenticated, hasPermission('send_message')],
    handler: sendMessage
  },
  {
    event: 'message.delete',
    guards: [isAuthenticated, isAdminOrOwner],
    handler: deleteMessage
  },
  {
    event: 'admin.action',
    guards: [isAuthenticated, hasRole('admin')],
    handler: performAdminAction
  }
])
```

---

## Routing

### Rutas Básicas

```javascript
.registerRoutes([
  {
    event: 'ping',
    handler: (ctx) => {
      console.log('Ping received');
      ctx.send('pong', { timestamp: Date.now() });
    }
  },
  {
    event: 'notification',
    handler: (ctx) => {
      showNotification(ctx.payload.message);
      ctx.emit('notification.shown', ctx.payload);
    }
  }
])
```

### Rutas con Guards

```javascript
.registerRoutes([
  {
    event: 'message.send',
    guards: [
      isAuthenticated,
      hasPermission('send_message')
    ],
    handler: async (ctx) => {
      await saveMessage(ctx.payload);
      ctx.broadcast('message.sent', ctx.payload);
    }
  }
])
```

### Rutas con Middleware

```javascript
.registerRoutes([
  {
    event: 'file.upload',
    middleware: [
      async (ctx, next) => {
        // Validar tamaño
        if (ctx.payload.size > 10 * 1024 * 1024) {
          ctx.send('error', { message: 'Archivo muy grande' });
          return;
        }
        await next();
      },
      async (ctx, next) => {
        // Validar tipo
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowed.includes(ctx.payload.type)) {
          ctx.send('error', { message: 'Tipo de archivo no permitido' });
          return;
        }
        await next();
      }
    ],
    handler: uploadFile
  }
])
```

### Rutas Completas

```javascript
.registerRoutes([
  {
    event: 'message.send',
    guards: [isAuthenticated, hasPermission('send_message')],
    middleware: [
      async (ctx, next) => {
        ctx.payload.text = sanitizeHTML(ctx.payload.text);
        ctx.payload.timestamp = Date.now();
        await next();
      }
    ],
    handler: async (ctx) => {
      const message = await db.messages.create(ctx.payload);
      ctx.broadcast('message.sent', message);
      ctx.emit('message.saved', message);
    }
  }
])
```

---

## Contexto de la Aplicación

El contexto de la aplicación está disponible en `ctx.appContext` en todos los middlewares, guards y handlers.

### Configuración Básica

```javascript
realtime.setAppContext({
  userId: '123',
  tenantId: '456',
  applicationId: 'production'
});
```

### Configuración Completa

```javascript
realtime.setAppContext({
  // Usuario
  userId: user.id,
  userName: user.name,
  userEmail: user.email,
  userRole: user.role,
  
  // Tenant/Organización
  tenantId: tenant.id,
  tenantName: tenant.name,
  
  // Environment
  applicationId: 'production',
  environment: 'prod',
  
  // Permisos
  permissions: ['read', 'write', 'delete', 'admin'],
  isAuthenticated: true,
  isBanned: false,
  
  // Sesión
  sessionId: session.id,
  deviceId: device.id,
  
  // Metadata
  metadata: {
    ip: '192.168.1.1',
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
});
```

### Actualizar Contexto Dinámicamente

```javascript
// En React
const { user, tenant } = useAppState();

useEffect(() => {
  realtime.setAppContext({
    userId: user?.id,
    userName: user?.name,
    tenantId: tenant?.id,
    isAuthenticated: !!user
  });
}, [user, tenant]);

// Cuando el usuario hace logout
function logout() {
  realtime.setAppContext({
    userId: null,
    isAuthenticated: false,
    permissions: []
  });
}
```

### Uso en Handlers

```javascript
handler: async (ctx) => {
  // Acceder al contexto
  const userId = ctx.appContext.userId;
  const tenantId = ctx.appContext.tenantId;
  
  // Validar
  if (!ctx.appContext.isAuthenticated) {
    ctx.send('error', { message: 'No autenticado' });
    return;
  }
  
  // Usar en queries
  const messages = await db.messages.find({
    tenantId: ctx.appContext.tenantId,
    userId: ctx.appContext.userId
  });
  
  ctx.emit('messages.loaded', messages);
}
```

---

## Event Bus

El event bus interno permite comunicación entre componentes **sin usar la red**.

### Emitir Eventos

```javascript
// En un handler
handler: async (ctx) => {
  await saveMessage(ctx.payload);
  
  // Notificar a componentes locales
  ctx.emit('message.saved', {
    messageId: msg.id,
    text: msg.text
  });
}
```

### Escuchar Eventos

```javascript
// En React
useEffect(() => {
  const handleMessageSaved = (data) => {
    console.log('Mensaje guardado:', data);
    updateUI(data);
  };
  
  realtime.on('message.saved', handleMessageSaved);
  
  return () => {
    realtime.off('message.saved', handleMessageSaved);
  };
}, []);
```

### Múltiples Listeners

```javascript
// Listener 1: Actualizar UI
realtime.on('message.sent', (data) => {
  appendMessage(data);
});

// Listener 2: Mostrar notificación
realtime.on('message.sent', (data) => {
  if (data.recipientId === currentUserId) {
    showNotification(`Nuevo mensaje de ${data.senderName}`);
  }
});

// Listener 3: Analytics
realtime.on('message.sent', (data) => {
  analytics.track('message_sent', {
    messageLength: data.text.length,
    hasAttachments: !!data.attachments
  });
});
```

### Desuscribirse

```javascript
const handler = (data) => console.log(data);

// Suscribirse
realtime.on('event', handler);

// Desuscribirse
realtime.off('event', handler);
```

---

## Ejemplos del Mundo Real

### Ejemplo 1: Chat App Completo

```javascript
import { createCoreRealtime } from './core-realtime';
import { ablyAdapter } from './adapters/ably-adapter';

// Middleware
const loggerMiddleware = async (ctx, next) => {
  console.log(`📥 [${ctx.type}]`, ctx.payload);
  await next();
};

const authMiddleware = async (ctx, next) => {
  if (!ctx.appContext.userId) {
    console.warn('❌ No autenticado');
    ctx.stop();
    return;
  }
  await next();
};

const tenantMiddleware = async (ctx, next) => {
  if (ctx.applicationId !== ctx.appContext.applicationId) {
    console.log('⚠️ Evento de otro tenant, ignorado');
    ctx.stop();
    return;
  }
  await next();
};

// Guards
const canSendMessage = (ctx) => {
  return ctx.appContext.permissions.includes('send_message') &&
         !ctx.appContext.isBanned;
};

const canDeleteMessage = (ctx) => {
  return ctx.appContext.userRole === 'admin' ||
         ctx.payload.userId === ctx.appContext.userId;
};

// Setup realtime
const realtime = createCoreRealtime()
  .registerGlobalMiddleware([
    loggerMiddleware,
    authMiddleware,
    tenantMiddleware
  ])
  
  .registerRoutes([
    // Enviar mensaje
    {
      event: 'message.send',
      guards: [canSendMessage],
      middleware: [
        async (ctx, next) => {
          // Validar
          if (!ctx.payload.text?.trim()) {
            ctx.send('error', { message: 'Mensaje vacío' });
            return;
          }
          
          // Sanitizar
          ctx.payload.text = sanitizeHTML(ctx.payload.text);
          ctx.payload.timestamp = Date.now();
          ctx.payload.senderId = ctx.appContext.userId;
          ctx.payload.senderName = ctx.appContext.userName;
          
          await next();
        }
      ],
      handler: async (ctx) => {
        // Guardar en BD
        const message = await db.messages.create({
          ...ctx.payload,
          tenantId: ctx.appContext.tenantId
        });
        
        // Broadcast a todos
        ctx.broadcast('message.sent', message);
        
        // Event bus local
        ctx.emit('message.saved', message);
      }
    },
    
    // Eliminar mensaje
    {
      event: 'message.delete',
      guards: [canDeleteMessage],
      handler: async (ctx) => {
        await db.messages.delete(ctx.payload.messageId);
        ctx.broadcast('message.deleted', {
          messageId: ctx.payload.messageId
        });
      }
    },
    
    // Usuario escribiendo
    {
      event: 'user.typing',
      handler: (ctx) => {
        ctx.broadcast('user.typing', {
          userId: ctx.appContext.userId,
          userName: ctx.appContext.userName
        });
      }
    },
    
    // Presencia
    {
      event: 'presence.update',
      handler: (ctx) => {
        ctx.broadcast('presence.update', {
          userId: ctx.appContext.userId,
          status: ctx.payload.status
        });
      }
    }
  ])
  
  .adapter(ablyAdapter(
    'api-key',
    ['chat.general', 'chat.support', 'presence']
  ))
  
  .setAppContext({
    userId: currentUser.id,
    userName: currentUser.name,
    tenantId: currentTenant.id,
    applicationId: 'production',
    userRole: currentUser.role,
    permissions: currentUser.permissions,
    isBanned: currentUser.isBanned
  })
  
  .start();

// Event listeners (UI)
realtime.on('message.sent', (message) => {
  appendMessageToChat(message);
  scrollToBottom();
});

realtime.on('message.deleted', (data) => {
  removeMessageFromChat(data.messageId);
});

realtime.on('user.typing', (data) => {
  showTypingIndicator(data.userName);
});

realtime.on('presence.update', (data) => {
  updateUserStatus(data.userId, data.status);
});

// Enviar mensaje desde UI
function sendMessage(text) {
  realtime.send('message.send', {
    text,
    roomId: currentRoom.id,
    channel: 'chat.general'
  });
}
```

### Ejemplo 2: Notificaciones en Tiempo Real

```javascript
const realtime = createCoreRealtime()
  .registerGlobalMiddleware([
    async (ctx, next) => {
      // Solo procesar si es para mi usuario
      if (ctx.payload.userId !== ctx.appContext.userId) {
        ctx.stop();
        return;
      }
      await next();
    }
  ])
  
  .registerRoutes([
    {
      event: 'notification.new',
      handler: (ctx) => {
        const notification = ctx.payload;
        
        // Mostrar notificación del navegador
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.body,
            icon: notification.icon
          });
        }
        
        // Actualizar badge
        updateNotificationBadge(notification);
        
        // Event bus
        ctx.emit('notification.received', notification);
      }
    },
    
    {
      event: 'notification.read',
      handler: async (ctx) => {
        await db.notifications.markAsRead(ctx.payload.notificationId);
        ctx.emit('notification.updated', ctx.payload);
      }
    }
  ])
  
  .adapter(ablyAdapter('api-key', ['notifications']))
  .setAppContext({ userId: currentUser.id })
  .start();

// UI
realtime.on('notification.received', (notification) => {
  showToast(notification.title, notification.body);
  playNotificationSound();
});
```

### Ejemplo 3: Colaboración en Tiempo Real

```javascript
const realtime = createCoreRealtime()
  .registerRoutes([
    // Cursor de usuario
    {
      event: 'cursor.move',
      handler: (ctx) => {
        ctx.emit('cursor.update', {
          userId: ctx.appContext.userId,
          userName: ctx.appContext.userName,
          x: ctx.payload.x,
          y: ctx.payload.y
        });
      }
    },
    
    // Edición de documento
    {
      event: 'document.edit',
      guards: [(ctx) => ctx.appContext.permissions.includes('edit')],
      handler: async (ctx) => {
        // Aplicar cambios
        await applyDelta(ctx.payload.delta);
        
        // Broadcast a otros usuarios
        ctx.broadcast('document.changed', {
          delta: ctx.payload.delta,
          userId: ctx.appContext.userId,
          version: ctx.payload.version
        });
      }
    },
    
    // Lock de sección
    {
      event: 'section.lock',
      handler: (ctx) => {
        ctx.broadcast('section.locked', {
          sectionId: ctx.payload.sectionId,
          userId: ctx.appContext.userId,
          userName: ctx.appContext.userName
        });
      }
    }
  ])
  
  .adapter(ablyAdapter('api-key', ['document:123']))
  .start();

// UI - Mostrar cursores de otros usuarios
realtime.on('cursor.update', (data) => {
  if (data.userId !== currentUserId) {
    updateCursor(data.userId, data.x, data.y, data.userName);
  }
});

// UI - Aplicar cambios remotos
realtime.on('document.changed', (data) => {
  if (data.userId !== currentUserId) {
    applyRemoteDelta(data.delta);
  }
});
```

### Ejemplo 4: Gaming/Multiplayer

```javascript
const realtime = createCoreRealtime()
  .registerGlobalMiddleware([
    // Anti-cheat
    async (ctx, next) => {
      if (ctx.type.startsWith('game.')) {
        // Validar que el cliente no esté hackeando
        if (!validateGameState(ctx.payload)) {
          console.warn('⚠️ Estado de juego inválido');
          ctx.stop();
          return;
        }
      }
      await next();
    }
  ])
  
  .registerRoutes([
    {
      event: 'game.move',
      handler: (ctx) => {
        ctx.broadcast('game.player.moved', {
          playerId: ctx.appContext.userId,
          position: ctx.payload.position,
          timestamp: Date.now()
        });
      }
    },
    
    {
      event: 'game.action',
      handler: async (ctx) => {
        const result = await processGameAction(ctx.payload);
        
        ctx.broadcast('game.action.result', {
          playerId: ctx.appContext.userId,
          action: ctx.payload.action,
          result
        });
      }
    },
    
    {
      event: 'game.chat',
      guards: [(ctx) => !ctx.appContext.isMuted],
      handler: (ctx) => {
        ctx.broadcast('game.chat.message', {
          playerId: ctx.appContext.userId,
          playerName: ctx.appContext.userName,
          message: ctx.payload.message
        });
      }
    }
  ])
  
  .adapter(ablyAdapter('api-key', ['game:room:123']))
  .start();

// Renderizar movimientos
realtime.on('game.player.moved', (data) => {
  updatePlayerPosition(data.playerId, data.position);
});

// Aplicar resultado de acción
realtime.on('game.action.result', (data) => {
  playAnimation(data.action);
  updateGameState(data.result);
});
```

---

## API Reference

### createCoreRealtime()

Crea una instancia de Core Realtime.

**Retorna:** `RealtimeAPI`

**Ejemplo:**
```javascript
const realtime = createCoreRealtime();
```

---

### registerGlobalMiddleware(middlewareList)

Registra middleware global que se ejecuta para TODOS los eventos.

**Parámetros:**
- `middlewareList` (Array<MiddlewareFunction>): Array de funciones middleware

**Retorna:** `this` (chainable)

**Ejemplo:**
```javascript
realtime.registerGlobalMiddleware([
  loggerMiddleware,
  authMiddleware,
  errorHandler
]);
```

---

### registerRoutes(routeList)

Registra rutas de eventos con sus handlers, guards y middleware.

**Parámetros:**
- `routeList` (Array<Route>): Array de objetos Route

**Route:**
```typescript
{
  event: string,
  guards?: GuardFunction[],
  middleware?: MiddlewareFunction[],
  handler: RouteHandler
}
```

**Retorna:** `this` (chainable)

**Ejemplo:**
```javascript
realtime.registerRoutes([
  {
    event: 'message.send',
    guards: [isAuthenticated],
    middleware: [validatePayload],
    handler: sendMessage
  }
]);
```

---

### adapter(instance)

Configura el adapter de transporte.

**Parámetros:**
- `instance` (TransportAdapter): Instancia del adapter

**Retorna:** `this` (chainable)

**Ejemplo:**
```javascript
realtime.adapter(ablyAdapter('api-key', ['chat']));
```

---

### setAppContext(ctx)

Establece el contexto de la aplicación.

**Parámetros:**
- `ctx` (Object): Objeto con datos del contexto

**Retorna:** `this` (chainable)

**Ejemplo:**
```javascript
realtime.setAppContext({
  userId: '123',
  tenantId: '456',
  permissions: ['read', 'write']
});
```

---

### start()

Inicia el sistema de eventos.

**Retorna:** `this` (chainable)

**Throws:** Error si no se configuró un adapter

**Ejemplo:**
```javascript
realtime.start();
```

---

### on(event, callback)

Registra un listener para eventos locales (event bus).

**Parámetros:**
- `event` (string): Nombre del evento
- `callback` (Function): Función a ejecutar

**Ejemplo:**
```javascript
realtime.on('message.sent', (data) => {
  console.log('Mensaje:', data);
});
```

---

### off(event, callback, channelName?)

Remueve un listener de eventos locales.

**Parámetros:**
- `event` (string): Nombre del evento
- `callback` (Function): Función callback a remover
- `channelName` (string, opcional): Nombre del canal

**Ejemplo:**
```javascript
const handler = (data) => console.log(data);
realtime.on('event', handler);
realtime.off('event', handler);
```

---

### emit(event, data)

Emite un evento local (no se envía por la red).

**Parámetros:**
- `event` (string): Nombre del evento
- `data` (any): Datos del evento

**Ejemplo:**
```javascript
realtime.emit('custom.event', { foo: 'bar' });
```

---

## FAQ

### ¿Por qué usar Core Realtime en lugar de Ably/Pusher directamente?

**Ventajas:**
- ✅ **Desacoplamiento**: Cambia de proveedor sin tocar código
- ✅ **Middleware**: Lógica reutilizable (auth, logging, etc.)
- ✅ **Guards**: Validación de permisos centralizada
- ✅ **Testing**: Fácil con MockAdapter
- ✅ **Organización**: Código más limpio y mantenible

### ¿Funciona en Node.js?

Sí, funciona tanto en navegador como en Node.js. Solo asegúrate de que el adapter que uses sea compatible.

### ¿Puedo usar múltiples canales?

Sí, simplemente pasa un array de canales al adapter:

```javascript
.adapter(ablyAdapter('key', ['chat', 'notifications', 'presence']))
```

### ¿Cómo hago testing?

Usa el `mockAdapter`:

```javascript
const mock = mockAdapter();
const realtime = createCoreRealtime()
  .adapter(mock)
  .start();

// Simular eventos
mock.simulateEvent('test', { data: 'test' });
```

### ¿Puedo cambiar el contexto dinámicamente?

Sí, llama a `setAppContext()` cuando sea necesario:

```javascript
// Login
realtime.setAppContext({ userId: user.id, isAuthenticated: true });

// Logout
realtime.setAppContext({ userId: null, isAuthenticated: false });
```

### ¿Los middleware se ejecutan en orden?

Sí, se ejecutan en el orden en que fueron registrados, similar a Express/Koa.

### ¿Cuál es la diferencia entre Guard y Middleware?

- **Guard**: Retorna true/false, valida si el evento puede continuar
- **Middleware**: Puede transformar datos, hacer operaciones async, llamar a next()

### ¿Puedo tener middleware global Y de ruta?

Sí, se ejecutan en este orden:
1. Middleware global
2. Guards de ruta
3. Middleware de ruta
4. Handler

### ¿Cómo manejo errores?

Usa un middleware de error handling:

```javascript
.registerGlobalMiddleware([
  async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Error:', error);
      ctx.send('error', { message: error.message });
    }
  }
])
```

### ¿El event bus es global?

No, es local a cada instancia de `createCoreRealtime()`. Los eventos emitidos con `ctx.emit()` solo se escuchan con `realtime.on()` en la misma instancia.

---

## Tips y Mejores Prácticas

### 1. Usa Convención de Nombres

```
<recurso>.<acción>

✅ Bien:
- message.send
- message.delete
- user.login
- presence.update

❌ Mal:
- sendMessage
- deleteMsg
- userLogin
```

### 2. Middleware Global para Cross-Cutting Concerns

```javascript
.registerGlobalMiddleware([
  loggerMiddleware,      // Logging
  authMiddleware,        // Autenticación
  tenantMiddleware,      // Multi-tenancy
  performanceMiddleware, // Métricas
  errorHandler          // Error handling
])
```

### 3. Guards para Validación de Permisos

```javascript
// ✅ Bien: Guards simples y reutilizables
const isAuthenticated = (ctx) => !!ctx.appContext.userId;
const hasRole = (role) => (ctx) => ctx.appContext.role === role;

// ❌ Mal: Lógica compleja en guards
const complexGuard = (ctx) => {
  // 50 líneas de código...
};
```

### 4. Middleware de Ruta para Validación Específica

```javascript
{
  event: 'message.send',
  middleware: [
    validateMessagePayload,  // Específico de mensaje
    sanitizeHTML,            // Específico de texto
    attachMetadata           // Enriquecer datos
  ],
  handler: sendMessage
}
```

### 5. Usa el Event Bus para Desacoplamiento

```javascript
// Handler
handler: async (ctx) => {
  await saveMessage(ctx.payload);
  
  // NO hacer:
  updateUI(ctx.payload);
  showNotification(ctx.payload);
  
  // Hacer:
  ctx.emit('message.saved', ctx.payload);
}

// En componentes
realtime.on('message.saved', updateUI);
realtime.on('message.saved', showNotification);
```

### 6. Actualiza el Contexto Reactivamente

```javascript
// En React
useEffect(() => {
  realtime.setAppContext({
    userId: user?.id,
    isAuthenticated: !!user
  });
}, [user]);
```

### 7. Limpia Listeners en Cleanup

```javascript
useEffect(() => {
  const handler = (data) => console.log(data);
  
  realtime.on('event', handler);
  
  return () => {
    realtime.off('event', handler);
  };
}, []);
```

---

## Licencia

MIT

---