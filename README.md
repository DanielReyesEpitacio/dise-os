# Software Design Patterns & Architectures

> Colección de diseños, patrones y abstracciones que uso en proyectos reales de producción.

**Autor:** Daniel Reyes Epitacio  
**Objetivo:** Compartir mi enfoque para escribir código escalable, mantenible y desacoplado.

---

## 📖 ¿Qué es este repositorio?

Este es mi portafolio técnico de **arquitecturas de software**. Aquí documento los patrones de diseño y abstracciones que he creado y refinado a lo largo de mi carrera como desarrollador.

Cada diseño representa mi filosofía de desarrollo:
- ✅ **Código limpio y legible** - APIs fluidas que se leen como prosa
- ✅ **Desacoplamiento** - Cambiar implementaciones sin tocar lógica de negocio
- ✅ **Extensibilidad** - Fácil agregar features sin romper código existente
- ✅ **Testeable** - Arquitecturas que facilitan el testing
- ✅ **Type-safe** - Aprovechar el sistema de tipos para evitar errores

### ¿Por qué compartir esto?

1. **Mostrar mi estilo de código** - Para equipos/empresas que buscan desarrolladores senior
2. **Documentación personal** - Referencia rápida para mis proyectos futuros
3. **Aportar a la comunidad** - Estos patrones pueden ayudar a otros desarrolladores
4. **Feedback y mejora continua** - Siempre hay mejores formas de resolver problemas

---

## 🗂️ Catálogo de Diseños

### 1. [HTTP Client (JavaScript/TypeScript)](./http-client-js/)

**Problema que resuelve:**  
`fetch()` y otros clientes HTTP requieren mucho boilerplate: serialización manual, manejo de status codes con if/else, headers repetitivos.

**Solución:**  
Cliente HTTP con API fluida chainable que permite manejar diferentes status codes de forma declarativa, con interceptores globales para auth/logging, y soporte para timeout/retry.

**Características:**
- Patrón Observable para manejar respuestas
- Middleware pipeline (estilo Koa/Express)
- Interceptores request/response
- Fácil cambiar de `fetch` a `axios`
- Loading states integrados

**Tecnologías:** JavaScript/TypeScript, Fetch API  
**Casos de uso:** SPAs, Node.js backends, aplicaciones que consumen APIs REST

```javascript
client.get('/api/users')
  .timeout(5000)
  .retry(2)
  .onOk(users => renderUsers(users))
  .onStatus(404, () => showNotFound())
  .onStatus(500, () => showError());
```

[Ver documentación completa →](./http-client-js/README.md)

---

### 2. [Fluent HTTP Client (C#/.NET)](./http-client-csharp/)

**Problema que resuelve:**  
`HttpClient` de .NET requiere 15+ líneas de código para una petición POST simple: crear request, serializar JSON manualmente, agregar headers uno por uno, deserializar respuesta.

**Solución:**  
API fluida que reduce el código en un 70%, con serialización/deserialización automática, tipado fuerte (`Task<T>` directo), y soporte extensible para JSON, XML, Binary.

**Características:**
- API fluida chainable (builder pattern)
- Deserialización automática tipada
- Extensible: custom deserializers y body content
- Sin wrappers innecesarios
- Compatible con IHttpClientFactory y Polly

**Tecnologías:** C#, .NET 6+, System.Text.Json  
**Casos de uso:** ASP.NET Core APIs, Blazor, servicios backend, microservicios

```csharp
var user = await _http.Post("https://api.example.com/users")
    .WithHeader("Authorization", $"Bearer {token}")
    .WithJsonBody(new { Name = "John", Email = "john@example.com" })
    .MapResponse<User>()
    .SendAsync();
```

[Ver documentación completa →](./http-client-csharp/README.md)

---

### 3. [Core Realtime (WebSocket/Realtime)](./core-realtime/)

**Problema que resuelve:**  
Código fuertemente acoplado a proveedores específicos (Ably, Pusher, Socket.io). Cambiar de proveedor significa reescribir toda la lógica. Validaciones de auth/permisos mezcladas con handlers.

**Solución:**  
Sistema framework-agnostic con middleware pipeline, guards de autorización, routing de eventos y adapters intercambiables. Cambia de Ably a Pusher sin tocar tu código de negocio.

**Características:**
- Middleware global y por ruta (estilo Express)
- Guards para validación de permisos
- Event routing con handlers
- Adapters para Ably, Pusher, Socket.io, Mock
- Event bus interno para desacoplamiento
- Contexto de aplicación inyectable

**Tecnologías:** JavaScript/TypeScript, WebSockets, Ably, Pusher, Socket.io  
**Casos de uso:** Chat apps, notificaciones en tiempo real, colaboración en vivo, gaming multiplayer

```javascript
const realtime = createCoreRealtime()
  .registerGlobalMiddleware([authMiddleware, loggerMiddleware])
  .registerRoutes([
    {
      event: 'message.send',
      guards: [isAuthenticated, hasPermission('send_message')],
      handler: async (ctx) => {
        await saveMessage(ctx.payload);
        ctx.broadcast('message.sent', ctx.payload);
      }
    }
  ])
  .adapter(ablyAdapter(apiKey, ['chat']))
  .start();
```

[Ver documentación completa →](./core-realtime/README.md)

---

## 🎯 Filosofía de Diseño

### Principios que guían mis decisiones:

#### 1. **API Fluida (Fluent API)**
Las APIs deben leerse como lenguaje natural. El código es para humanos, no solo para máquinas.

```javascript
// ❌ Imperativo y verboso
const request = createRequest();
request.setUrl('/users');
request.addHeader('Auth', token);
request.setMethod('POST');
request.setBody(data);
const response = await request.send();

// ✅ Fluido y declarativo
const user = await http.post('/users')
  .withHeader('Auth', token)
  .withBody(data)
  .send();
```

#### 2. **Separation of Concerns**
Cada componente tiene una responsabilidad única y clara.

```javascript
// Middleware se encarga de logging
// Guards se encargan de permisos
// Handlers se encargan de lógica de negocio
// Adapters se encargan de la comunicación
```

#### 3. **Open/Closed Principle**
Abierto a extensión, cerrado a modificación.

```javascript
// Agregar un nuevo deserializer sin tocar código existente
class XmlDeserializer implements IDeserializer { ... }
client.get(url).withDeserializer(new XmlDeserializer())
```

#### 4. **Dependency Inversion**
Depender de abstracciones, no de implementaciones concretas.

```javascript
// IFluentHttpClient (abstracción)
//    ↓
// FetchHttpClient (implementación)
// AxiosHttpClient (otra implementación)
// Cambias de implementación sin tocar tu código
```

#### 5. **Progressive Enhancement**
Empezar simple, agregar complejidad solo cuando se necesita.

```javascript
// Simple: funciona de inmediato
http.get('/users').onOk(data => console.log(data))

// Complejo: cuando lo necesitas
http.get('/users')
  .timeout(5000)
  .retry(3)
  .onLoadingStart(() => showSpinner())
  .onOk(data => render(data))
  .onStatus(404, () => showNotFound())
  .catch(err => logError(err))
  .finally(() => hideSpinner())
```

---

## 🛠️ Tecnologías y Lenguajes

Este repositorio incluye diseños en múltiples tecnologías:

| Lenguaje | Proyectos | Ecosistema |
|----------|-----------|------------|
| JavaScript/TypeScript | HTTP Client, Core Realtime | Node.js, Browser, React, Vue |
| C# | Fluent HTTP Client | .NET 6+, ASP.NET Core |
| *Próximamente* | *Más diseños en camino* | Python, Go, Rust |

---

## 📚 Estructura del Repositorio (Reorganizacion en curso)

```
.
├── http-client-js/           # Cliente HTTP JavaScript/TypeScript
│   ├── README.md            # Documentación completa
│   ├── src/
│   │   ├── fetch-http-client.js
│   │   ├── observable-response.js
│   │   └── ...
│   └── examples/
│
├── FluentHttpClient/       # Cliente HTTP C#/.NET
│   ├── README.md
│   ├── src/
│   │   ├── IFluentHttpClient.cs
│   │   ├── HttpRequestBuilder.cs
│   │   └── ...
│   └── examples/
│
├── realtime/            # Sistema realtime framework-agnostic
│   ├── README.md
│   ├── src/
│   │   ├── core-realtime.js
│   │   └── adapters/
│   └── examples/
│
└── README.md                 # Este archivo
```

---

## 🚀 Cómo Usar Este Repo

### Para Desarrolladores

Cada diseño está completamente documentado con:
- **Problema que resuelve** - Contexto y motivación
- **Solución propuesta** - Cómo funciona la arquitectura
- **Ejemplos de uso** - Código real de producción
- **API Reference** - Documentación completa de la interfaz
- **Guías de extensión** - Cómo agregar nuevas funcionalidades

**Puedes:**
1. Copiar el código directamente a tus proyectos
2. Adaptarlo a tus necesidades específicas
3. Usarlo como referencia para tus propios diseños
4. Aprender patrones de arquitectura de software

### Para Reclutadores/Empresas

Este repositorio demuestra:
- ✅ **Pensamiento arquitectónico** - No solo escribo código, diseño sistemas
- ✅ **Experiencia real** - Estos patrones nacen de problemas reales en producción
- ✅ **Documentación** - Sé comunicar decisiones técnicas claramente
- ✅ **Código limpio** - Consistencia, legibilidad, mantenibilidad
- ✅ **Múltiples tecnologías** - JavaScript/TypeScript, C#/.NET, patrones universales

---

## 💡 Próximos Diseños

Estos son algunos de los patrones que planeo documentar próximamente:

- [ ] **Jobs** - Sistema de trabajos en segundo plano para .NET inspirado en Laravel
- [ ] **IoC** - Contenedor de inversion de control agnostico a frameworks para Javascrit
- [ ] **Dargo** -  Framework declarativo para flutter inspirado en Vue, React, Angular


¿Tienes sugerencias? [Abre un issue](../../issues) con tu propuesta.

---

## 📝 Licencia

MIT License - Siéntete libre de usar este código en tus proyectos personales o comerciales.

## 🤝 Contribuciones

Este es un repositorio personal de portafolio, pero:
- ✅ Issues con bugs o sugerencias son bienvenidos
- ✅ Discusiones sobre mejores prácticas son apreciadas
- ⚠️ Pull requests pueden ser considerados pero no garantizo que los acepte (es mi portafolio personal)

---

## 📬 Contacto

**Daniel Reyes Epitacio**

- GitHub: [@danielreyes](https://github.com/DanielReyesEpitacio)
- Email: danielreyesepitacio@gmail.com

---

## ⭐ ¿Te resultó útil?

Si estos diseños te ayudaron en tu proyecto o te sirvieron de inspiración, considera:
- ⭐ Darle una estrella al repo
- 🔄 Compartirlo con otros desarrolladores
- 💬 Dejarme feedback en los issues
- 🤝 Conectar en LinkedIn

---

<div align="center">

**Construyendo software escalable, un patrón a la vez** 🚀

</div>