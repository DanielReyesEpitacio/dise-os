# HTTP Client Documentation

Un cliente HTTP flexible y encadenable con interceptores, respuestas observables y manejo avanzado de errores.

**Autor:** Daniel Reyes Epitacio

### ¿Cuál implementación usar?

#### FetchHttpClient (Incluida)
- ✅ Sin dependencias externas
- ✅ Funciona en navegadores modernos
- ✅ Más liviano
- ❌ No funciona en Node.js antiguo (pre-18)
- ❌ API de bajo nivel

#### AxiosHttpClient (Crear tú mismo)
- ✅ Funciona en Node.js y navegadores
- ✅ Interceptores nativos de axios disponibles
- ✅ Manejo de errores más robusto
- ✅ Cancelación de peticiones más fácil
- ❌ Dependencia externa (~13KB)


## Tabla de Contenidos

- [¿Qué es esto?](#qué-es-esto)
- [Instalación](#instalación)
- [Inicio Rápido](#inicio-rápido)
- [Uso Básico](#uso-básico)
- [Interceptores](#interceptores)
- [Respuesta Observable](#respuesta-observable)
- [Características Avanzadas](#características-avanzadas)
- [Referencia de la API](#referencia-de-la-api)

---

## ¿Qué es esto?

Este HTTP Client es una **arquitectura extensible** que te permite usar diferentes implementaciones HTTP (fetch, axios, etc.) con una interfaz unificada. La principal característica es que usa un **patrón observable encadenable** que te permite manejar diferentes códigos de estado HTTP de forma muy intuitiva.

### Arquitectura

El diseño se basa en una **clase abstracta `HttpClient`** que define la interfaz:

```javascript
/**
 * Clase abstracta que define el contrato que debe cumplir
 * cualquier implementación de cliente HTTP
 */
class HttpClient {
  async get(url, options) { throw new Error('Not implemented'); }
  async post(url, body, options) { throw new Error('Not implemented'); }
  async put(url, body, options) { throw new Error('Not implemented'); }
  async patch(url, body, options) { throw new Error('Not implemented'); }
  async delete(url, options) { throw new Error('Not implemented'); }
}
```

Luego, **heredas de esta clase** para crear diferentes implementaciones:

- `FetchHttpClient` - Usa `fetch()` nativo del navegador
- `AxiosHttpClient` - Usa axios (puedes crearlo tú mismo)
- `CustomHttpClient` - Cualquier otra implementación que quieras

### ¿Por qué esta arquitectura?

✅ **Flexibilidad**: Cambia entre fetch, axios, o cualquier otra librería sin cambiar tu código  
✅ **Extensible**: Crea tu propia implementación según tus necesidades  
✅ **Consistencia**: Todos los clientes HTTP tienen la misma API  
✅ **Testeable**: Fácil crear mocks para testing  
✅ **Interceptores**: Funcionalidad compartida entre implementaciones  
✅ **Observable Response**: Manejo elegante de diferentes status codes

### ¿Por qué usarlo?

- ✅ **Más legible**: No más `.then()` anidados ni bloques `if/else` gigantes
- ✅ **Interceptores**: Agrega headers, tokens o logs de forma automática
- ✅ **Manejo de estados**: Loading, retry, timeout... todo incluido
- ✅ **Encadenable**: Escribe código que se lee como prosa
- ✅ **TypeScript friendly**: Completamente documentado con JSDoc
- ✅ **Independiente de la implementación**: Usa fetch, axios o lo que quieras

---

## Instalación

```javascript
// Importar la implementación que quieras usar
import FetchHttpClient from './fetch-http-client';

// O si creas una implementación con Axios
import AxiosHttpClient from './axios-http-client';
```

### Implementaciones Disponibles

Este proyecto incluye `FetchHttpClient` que usa el `fetch()` nativo del navegador, pero **puedes crear tu propia implementación** con axios, XMLHttpRequest, o cualquier otra librería.

---

## Crear tu Propia Implementación

Gracias a la arquitectura basada en la clase abstracta `HttpClient`, puedes usar axios, node-fetch, o cualquier otra librería HTTP.

### Clase Base: HttpClient

Todas las implementaciones deben heredar de esta clase:

```javascript
/**
 * Clase abstracta que define el contrato
 * @abstract
 */
class HttpClient {
  async get(url, options) {
    throw new Error('Method not implemented.');
  }
  
  async post(url, body, options) {
    throw new Error('Method not implemented.');
  }
  
  async put(url, body, options) {
    throw new Error('Method not implemented.');
  }
  
  async patch(url, body, options) {
    throw new Error('Method not implemented.');
  }
  
  async delete(url, options) {
    throw new Error('Method not implemented.');
  }
}
```

### Ejemplo: AxiosHttpClient

Aquí un ejemplo de cómo crear una implementación con axios:

```javascript
import axios from 'axios';
import HttpClient from './http-client';
import ObservableResponse from './observable-response';

export default class AxiosHttpClient extends HttpClient {
  constructor(options = {}) {
    super();
    this.interceptors = options.interceptors || [];
    
    // Crear instancia de axios
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 0,
    });
  }

  async get(url, options = {}) {
    return this._request('GET', url, null, options);
  }

  async post(url, data, options = {}) {
    return this._request('POST', url, data, options);
  }

  async put(url, data, options = {}) {
    return this._request('PUT', url, data, options);
  }

  async patch(url, data, options = {}) {
    return this._request('PATCH', url, data, options);
  }

  async delete(url, options = {}) {
    return this._request('DELETE', url, null, options);
  }

  _request(method, url, data, options = {}) {
    return new Promise((resolve) => {
      const executor = async (resolveResponse, rejectResponse) => {
        try {
          // Preparar configuración
          let config = {
            method,
            url,
            headers: options.headers || {},
            data,
            signal: options.signal,
          };

          // Aplicar interceptores de request
          config = this._applyRequestInterceptors(config);

          // Hacer la petición con axios
          const response = await this.axiosInstance.request(config);

          let payload = {
            status: response.status,
            data: response.data,
          };

          // Aplicar interceptores de response
          payload = this._applyResponseInterceptors(payload);
          resolveResponse(payload);

        } catch (error) {
          // Aplicar interceptores de error
          let errorPayload;
          
          if (error.response) {
            // El servidor respondió con un status fuera del rango 2xx
            errorPayload = {
              status: error.response.status,
              data: error.response.data,
            };
          } else if (error.request) {
            // La petición se hizo pero no hubo respuesta
            errorPayload = {
              status: 'network_error',
              data: { message: 'No response from server' },
            };
          } else {
            // Algo pasó al configurar la petición
            errorPayload = {
              status: 'request_error',
              data: { message: error.message },
            };
          }

          errorPayload = this._applyRequestErrorInterceptors(errorPayload);
          errorPayload = this._applyResponseErrorInterceptors(errorPayload);
          
          rejectResponse(errorPayload);
        }
      };

      resolve(new ObservableResponse(executor));
    });
  }

  // Métodos de interceptores (igual que FetchHttpClient)
  _applyRequestInterceptors(config) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onRequest === 'function') {
        const result = interceptor.onRequest({ ...config });
        config = { ...config, ...result };
      }
    }
    return config;
  }

  _applyResponseInterceptors(response) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onResponse === 'function') {
        const result = interceptor.onResponse({ ...response });
        if (result !== undefined) {
          response = result;
        }
      }
    }
    return response;
  }

  _applyRequestErrorInterceptors(error) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onRequestError === 'function') {
        const result = interceptor.onRequestError(error);
        if (result !== undefined) {
          error = result;
        }
      }
    }
    return error;
  }

  _applyResponseErrorInterceptors(error) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onResponseError === 'function') {
        const result = interceptor.onResponseError(error);
        if (result !== undefined) {
          error = result;
        }
      }
    }
    return error;
  }
}
```

### Usar tu Implementación

Una vez creada, se usa exactamente igual:

```javascript
// Con Fetch
const clientFetch = new FetchHttpClient({
  interceptors: [authInterceptor]
});

// Con Axios
const clientAxios = new AxiosHttpClient({
  baseURL: 'https://api.ejemplo.com',
  interceptors: [authInterceptor]
});

// Ambos tienen la misma API
clientFetch.get('/api/usuarios').onOk(data => console.log(data));
clientAxios.get('/api/usuarios').onOk(data => console.log(data));
```

### ¿Por qué Heredar de HttpClient?

1. **Contrato definido**: Garantiza que todas las implementaciones tengan los mismos métodos
2. **Consistencia**: Tu código funciona igual sin importar la implementación
3. **Fácil migrar**: Cambias de fetch a axios sin tocar el resto del código
4. **Testing**: Crea un MockHttpClient para tests sin hacer peticiones reales

### Ejemplo: MockHttpClient para Testing

```javascript
class MockHttpClient extends HttpClient {
  constructor(mockData = {}) {
    super();
    this.mockData = mockData;
  }

  async get(url, options) {
    return new Promise((resolve) => {
      const executor = (resolveResponse) => {
        setTimeout(() => {
          resolveResponse({
            status: 200,
            data: this.mockData[url] || { message: 'Mock data' }
          });
        }, 100); // Simula latencia
      };
      resolve(new ObservableResponse(executor));
    });
  }

  // Implementar post, put, patch, delete...
}

// Usar en tests
const mockClient = new MockHttpClient({
  '/api/usuarios': [{ id: 1, nombre: 'Test' }]
});

mockClient.get('/api/usuarios')
  .onOk(usuarios => {
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].nombre).toBe('Test');
  });
```

---

## Inicio Rápido

```javascript
// Crear una instancia del cliente
const client = new FetchHttpClient();

// Hacer una petición GET simple
client.get('/api/usuarios')
  .onOk(data => console.log(data))
  .onStatus(404, () => console.log('No encontrado'));

// Hacer una petición POST
client.post('/api/usuarios', { nombre: 'Juan' })
  .onStatus(201, data => console.log('Creado:', data))
  .onStatus(400, error => console.log('Error de validación:', error));
```

**¿Ves la diferencia?** En lugar de hacer:

```javascript
// Forma tradicional 😫
try {
  const response = await fetch('/api/usuarios');
  if (response.status === 200) {
    const data = await response.json();
    console.log(data);
  } else if (response.status === 404) {
    console.log('No encontrado');
  }
} catch (error) {
  console.error(error);
}
```

Ahora haces:

```javascript
// Con este cliente 😎
client.get('/api/usuarios')
  .onOk(data => console.log(data))
  .onStatus(404, () => console.log('No encontrado'));
```

---

## Uso Básico

### Petición GET

La forma más simple de obtener datos:

```javascript
client.get('/api/usuarios')
  .onOk(usuarios => {
    console.log('Usuarios obtenidos:', usuarios);
    // usuarios ya viene parseado como JSON automáticamente
  });
```

**¿Qué pasa aquí?**
1. Se hace la petición GET a `/api/usuarios`
2. Si el status es 2xx (200, 201, etc.), se ejecuta el callback de `.onOk()`
3. Los datos ya vienen parseados automáticamente (JSON, texto, o blob según el Content-Type)

### Petición POST

Crear un nuevo recurso:

```javascript
client.post('/api/usuarios', {
  nombre: 'Juan Pérez',
  email: 'juan@ejemplo.com',
  edad: 25
})
  .onStatus(201, usuario => {
    console.log('Usuario creado exitosamente:', usuario);
    // Aquí usuario es el objeto que regresó el servidor
  })
  .onStatus(400, errores => {
    console.log('Errores de validación:', errores);
    // Aquí puedes mostrar los errores al usuario
  });
```

**¿Qué hace el cliente automáticamente?**
- Convierte tu objeto JavaScript a JSON
- Agrega el header `Content-Type: application/json`
- Parsea la respuesta según su tipo

### Petición PUT

Actualizar un recurso completo:

```javascript
client.put('/api/usuarios/123', {
  nombre: 'Jane Doe',
  email: 'jane@ejemplo.com',
  edad: 30
})
  .onOk(usuario => {
    console.log('Usuario actualizado:', usuario);
  })
  .onStatus(404, () => {
    console.log('Usuario no encontrado');
  });
```

### Petición PATCH

Actualizar solo algunos campos:

```javascript
client.patch('/api/usuarios/123', {
  email: 'nuevoemail@ejemplo.com'
  // Solo actualizas el email, los demás campos quedan igual
})
  .onOk(usuario => {
    console.log('Email actualizado:', usuario);
  });
```

### Petición DELETE

Eliminar un recurso:

```javascript
client.delete('/api/usuarios/123')
  .onStatus(204, () => {
    console.log('Usuario eliminado correctamente');
    // 204 = No Content, es el status estándar para delete exitoso
  })
  .onStatus(404, () => {
    console.log('El usuario ya no existe');
  });
```

---

## Interceptores

Los interceptores son funciones que se ejecutan **antes de enviar** la petición o **después de recibir** la respuesta. Son perfectos para:

- Agregar tokens de autenticación
- Logging de peticiones
- Manejo global de errores
- Modificar headers automáticamente

### ¿Cómo funcionan los interceptores?

Imagina que los interceptores son como "filtros" por los que pasan todas tus peticiones:

```
Tu código → Interceptor 1 → Interceptor 2 → Servidor
              ↓                ↓              ↓
         (agrega token)   (hace log)    (responde)
              ↓                ↓              ↓
Tu código ← Interceptor 1 ← Interceptor 2 ← Servidor
```

### Crear un Interceptor

Un interceptor es simplemente un objeto con funciones:

```javascript
const miInterceptor = {
  // Se ejecuta ANTES de enviar la petición
  onRequest: (config) => {
    console.log('📤 Enviando petición a:', config.url);
    
    // IMPORTANTE: Debes regresar el config (modificado o no)
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Mi-Header-Personalizado': 'valor'
      }
    };
  },
  
  // Se ejecuta DESPUÉS de recibir una respuesta exitosa
  onResponse: (response) => {
    console.log('📥 Respuesta recibida:', response.status);
    
    // También debes regresar la respuesta
    return response;
  },
  
  // Se ejecuta si hay un error al hacer la petición (red caída, etc.)
  onRequestError: (error) => {
    console.error('❌ Error de red:', error);
    return error;
  },
  
  // Se ejecuta si el servidor responde con un error
  onResponseError: (error) => {
    console.error('❌ Error del servidor:', error.status);
    return error;
  }
};
```

### Usar Interceptores

Los interceptores se pasan cuando creas el cliente:

```javascript
const client = new FetchHttpClient({
  interceptors: [miInterceptor, otroInterceptor]
  // Puedes agregar cuantos quieras
});
```

### Interceptores Condicionales

A veces quieres que un interceptor solo aplique para ciertas URLs:

```javascript
const interceptorDeAutenticacion = {
  onRequest: (config) => {
    // NO agregar token si es la página de login
    if (config.url.includes('/auth/login')) {
      return config; // Regresar sin modificar
    }
    
    // Para todas las demás URLs, agregar el token
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${obtenerToken()}`
      }
    };
  }
};
```

**Otro ejemplo**: Solo para APIs externas

```javascript
const interceptorCopomex = {
  onRequest: (config) => {
    // Solo hacer algo si es Copomex
    if (config.url.includes('copomex.com')) {
      console.log('Consultando Copomex...');
    }
    return config;
  }
};
```

### Patrones Comunes de Interceptores

#### 1. Autenticación

Agregar el token automáticamente a todas las peticiones:

```javascript
const authInterceptor = {
  onRequest: (config) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No hay token, usuario no autenticado');
      return config;
    }
    
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }
};
```

#### 2. Logging

Hacer log de todas las peticiones y respuestas:

```javascript
const loggingInterceptor = {
  onRequest: (config) => {
    const tiempo = Date.now();
    config._startTime = tiempo; // Guardar tiempo de inicio
    
    console.log(`🚀 ${config.method} ${config.url}`);
    console.log('Headers:', config.headers);
    console.log('Body:', config.body);
    
    return config;
  },
  
  onResponse: (response) => {
    const duracion = Date.now() - response._startTime;
    console.log(`✅ Respuesta en ${duracion}ms - Status: ${response.status}`);
    return response;
  }
};
```

#### 3. Manejo de Errores Global

Redirigir al login si el token expiró:

```javascript
const errorInterceptor = {
  onResponseError: (error) => {
    if (error.status === 401) {
      // Token expirado o inválido
      console.log('Sesión expirada, redirigiendo al login...');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.status === 403) {
      // Sin permisos
      alert('No tienes permisos para realizar esta acción');
    }
    
    if (error.status >= 500) {
      // Error del servidor
      console.error('Error del servidor:', error);
      alert('Algo salió mal en el servidor. Intenta más tarde.');
    }
    
    return error;
  }
};
```

#### 4. Tenant / Multi-tenancy

Agregar identificador de tenant según el dominio:

```javascript
const tenantInterceptor = {
  onRequest: (config) => {
    // No agregar tenant a APIs externas
    const esAPIExterna = config.url.includes('copomex') || 
                         config.url.includes('google.com');
    
    if (esAPIExterna) {
      return config;
    }
    
    // Obtener el tenant del dominio actual
    const tenant = window.location.host.replace(/^www\./, '');
    
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Tenant-Identifier': tenant
      }
    };
  }
};
```

#### 5. Rate Limiting / Throttling

Limitar peticiones por segundo:

```javascript
const rateLimitInterceptor = {
  _ultimaPeticion: 0,
  _delayMinimo: 100, // 100ms entre peticiones
  
  onRequest: async (config) => {
    const ahora = Date.now();
    const tiempoTranscurrido = ahora - this._ultimaPeticion;
    
    if (tiempoTranscurrido < this._delayMinimo) {
      // Esperar el tiempo faltante
      await new Promise(resolve => 
        setTimeout(resolve, this._delayMinimo - tiempoTranscurrido)
      );
    }
    
    this._ultimaPeticion = Date.now();
    return config;
  }
};
```

### Ejemplo Completo con Múltiples Interceptores

```javascript
const client = new FetchHttpClient({
  interceptors: [
    authInterceptor,      // Agrega token
    tenantInterceptor,    // Agrega tenant
    loggingInterceptor,   // Hace log
    errorInterceptor      // Maneja errores globalmente
  ]
});

// Ahora todas tus peticiones tendrán estos interceptores
client.get('/api/usuarios')
  .onOk(usuarios => console.log(usuarios));
// ↑ Esto automáticamente:
//   1. Agrega el token de auth
//   2. Agrega el tenant header
//   3. Hace log de la petición
//   4. Maneja errores 401, 403, 500 automáticamente
```

---

## Respuesta Observable

Este es el corazón del cliente HTTP. Cada petición regresa un objeto `ObservableResponse` que te permite "encadenar" handlers para diferentes situaciones.

### ¿Qué es Observable?

Es un patrón que te permite **reaccionar** a diferentes resultados de una petición de forma muy limpia:

```javascript
client.get('/api/usuarios')
  .onOk(datos => { /* si todo salió bien */ })
  .onStatus(404, () => { /* si no se encontró */ })
  .onStatus(500, () => { /* si hubo error del servidor */ })
  .catch(error => { /* si pasó algo inesperado */ })
  .finally(() => { /* esto SIEMPRE se ejecuta */ });
```

### Manejadores de Status

#### `.onStatus(codigo, callback)`

Maneja un código de status HTTP específico:

```javascript
client.get('/api/usuarios/123')
  .onStatus(200, usuario => {
    console.log('Usuario encontrado:', usuario);
  })
  .onStatus(404, () => {
    console.log('Este usuario no existe');
  })
  .onStatus(403, () => {
    console.log('No tienes permiso para ver este usuario');
  })
  .onStatus(500, () => {
    console.log('Error del servidor');
  });
```

**💡 Tip**: Cada callback recibe los datos de la respuesta ya parseados.

#### `.onOk(callback)`

Maneja **cualquier** código 2xx (200, 201, 204, etc.):

```javascript
client.post('/api/usuarios', datosUsuario)
  .onOk(usuario => {
    // Se ejecuta si el status es 200, 201, 202, etc.
    console.log('¡Usuario guardado!', usuario);
    mostrarMensajeExito();
    redirigirALista();
  });
```

**¿Cuándo usar `.onOk()` vs `.onStatus()`?**
- Usa `.onOk()` cuando no te importe el código exacto, solo que fue exitoso
- Usa `.onStatus()` cuando necesites diferenciar entre 200, 201, 204, etc.

#### `.onStatusAny(callback)`

Este es tu "catch-all". Se ejecuta si **no hay un handler** específico para el status recibido:

```javascript
client.get('/api/usuarios')
  .onStatus(200, data => console.log('OK:', data))
  .onStatus(404, () => console.log('No encontrado'))
  .onStatusAny(response => {
    // Se ejecuta para cualquier otro status (401, 403, 500, etc.)
    console.log('Status no manejado:', response.status);
    console.log('Datos:', response.data);
  });
```

**💡 Tip**: Es útil para tener un handler "por defecto" sin tener que escribir `.onStatus()` para cada código posible.

### Estados de Carga

#### `.onLoadingStart(callback)` y `.onLoadingEnd(callback)`

Perfecto para mostrar/ocultar spinners:

```javascript
client.get('/api/usuarios')
  .onLoadingStart(() => {
    console.log('🔄 Cargando...');
    mostrarSpinner(); // Mostrar un spinner en la UI
    deshabilitarBoton(); // Deshabilitar el botón de enviar
  })
  .onLoadingEnd(() => {
    console.log('✅ Terminó la carga');
    ocultarSpinner();
    habilitarBoton();
  })
  .onOk(usuarios => {
    renderizarUsuarios(usuarios);
  });
```

**Importante**: `.onLoadingEnd()` se ejecuta **SIEMPRE**, sin importar si la petición fue exitosa o falló.

### Ejemplo con React/Vue

```javascript
function cargarUsuarios() {
  client.get('/api/usuarios')
    .onLoadingStart(() => setLoading(true))
    .onLoadingEnd(() => setLoading(false))
    .onOk(usuarios => setUsuarios(usuarios))
    .onStatus(500, () => setError('Error del servidor'));
}
```

### Manejo de Errores

#### `.catch(callback)`

Captura **excepciones** que ocurran dentro de tus handlers:

```javascript
client.get('/api/usuarios')
  .onOk(usuarios => {
    // Si este código lanza un error, se captura en .catch()
    usuarios.forEach(usuario => {
      procesarUsuario(usuario); // ← Esto podría lanzar un error
    });
  })
  .catch(error => {
    console.error('Error al procesar usuarios:', error);
    mostrarMensajeError('Algo salió mal al procesar los datos');
  });
```

**¿Cuál es la diferencia con `.onStatusAny()`?**
- `.onStatusAny()`: Para status HTTP no manejados (401, 403, 500, etc.)
- `.catch()`: Para excepciones de JavaScript en tus handlers

#### `.finally(callback)`

Se ejecuta **SIEMPRE**, pase lo que pase:

```javascript
client.post('/api/usuarios', datos)
  .onOk(() => console.log('Guardado'))
  .onStatus(400, () => console.log('Validación falló'))
  .catch(error => console.log('Error:', error))
  .finally(() => {
    console.log('Esto SIEMPRE se ejecuta');
    limpiarFormulario();
    cerrarModal();
  });
```

**Casos de uso comunes para `.finally()`**:
- Cerrar modales
- Limpiar formularios
- Hacer logging
- Liberar recursos

---

## Características Avanzadas

### Timeout

Establece un tiempo máximo de espera para la petición:

```javascript
client.get('/api/endpoint-lento')
  .timeout(5000) // 5 segundos máximo
  .onOk(data => console.log('Éxito:', data))
  .onStatus('timeout', () => {
    console.log('La petición tardó demasiado');
    mostrarError('El servidor está tardando mucho. Intenta más tarde.');
  });
```

**¿Por qué usar timeout?**
- Evitar que el usuario espere eternamente
- Mejorar la experiencia cuando la red está lenta
- Fallar rápido en lugar de colgar la aplicación

**Ejemplo con UI feedback**:

```javascript
client.get('/api/reporte-grande')
  .timeout(30000) // 30 segundos para reportes grandes
  .onLoadingStart(() => {
    mostrarSpinner();
    mostrarMensaje('Generando reporte, esto puede tardar un poco...');
  })
  .onOk(reporte => {
    descargarReporte(reporte);
  })
  .onStatus('timeout', () => {
    alert('El reporte está tardando demasiado. Inténtalo en un momento.');
  })
  .onLoadingEnd(() => ocultarSpinner());
```

### Retry (Reintentos)

Reintenta automáticamente si la petición falla:

```javascript
client.get('/api/endpoint-inestable')
  .retry(3) // Reintentar hasta 3 veces
  .onOk(data => console.log('Éxito:', data))
  .onStatusAny(() => {
    console.log('Falló después de 3 intentos');
  });
```

**¿Cómo funciona?**
1. Primera petición falla → Se reintenta automáticamente
2. Segundo intento falla → Se reintenta de nuevo
3. Tercer intento falla → Ya no se reintenta más
4. Se ejecuta el handler de error correspondiente

**Ejemplo real**: Peticiones a APIs externas que pueden fallar ocasionalmente

```javascript
client.get('https://api-externa.com/datos')
  .retry(2) // Reintentar 2 veces si falla
  .timeout(10000) // 10 segundos de timeout
  .onOk(datos => {
    console.log('Datos obtenidos (quizá al segundo o tercer intento)');
    guardarDatos(datos);
  })
  .onStatusAny(() => {
    console.log('Falló incluso después de reintentar');
    usarDatosCacheados();
  });
```

### Combinando Características

Puedes encadenar todas las características que necesites:

```javascript
client.get('/api/usuarios')
  .timeout(10000)                    // Timeout de 10 segundos
  .retry(2)                          // Reintentar 2 veces
  .onLoadingStart(() => setLoading(true))
  .onLoadingEnd(() => setLoading(false))
  .onOk(usuarios => {
    setUsuarios(usuarios);
    mostrarMensaje('Usuarios cargados');
  })
  .onStatus(404, () => {
    mostrarError('No se encontraron usuarios');
  })
  .onStatus(500, () => {
    mostrarError('Error del servidor');
  })
  .onStatus('timeout', () => {
    mostrarError('La conexión está muy lenta');
  })
  .catch(error => {
    console.error('Error inesperado:', error);
  })
  .finally(() => {
    registrarEvento('usuarios_cargados');
  });
```

### Obtener la Respuesta Completa

Si necesitas acceso al objeto de respuesta completo (no solo los datos):

```javascript
const respuesta = await client.get('/api/usuarios').response();

console.log(respuesta.status);  // 200
console.log(respuesta.data);    // Los datos parseados
```

**¿Cuándo usar `.response()`?**
- Cuando necesitas el status en una variable
- Cuando quieres usar async/await en lugar de callbacks
- Cuando necesitas hacer algo con la respuesta completa

**Ejemplo con async/await**:

```javascript
async function obtenerUsuario(id) {
  try {
    const respuesta = await client.get(`/api/usuarios/${id}`).response();
    
    if (respuesta.status === 200) {
      return respuesta.data;
    } else if (respuesta.status === 404) {
      return null;
    } else {
      throw new Error(`Status inesperado: ${respuesta.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
```

### Subir Archivos

El cliente maneja automáticamente FormData para subir archivos:

```javascript
const formData = new FormData();
formData.append('archivo', inputArchivo.files[0]);
formData.append('nombre', 'Mi Documento');
formData.append('categoria', 'facturas');

client.post('/api/subir-archivo', formData)
  .onLoadingStart(() => {
    mostrarProgreso(0);
    deshabilitarFormulario();
  })
  .onStatus(201, respuesta => {
    console.log('Archivo subido:', respuesta.url);
    mostrarMensaje('✅ Archivo subido correctamente');
  })
  .onStatus(413, () => {
    mostrarError('El archivo es demasiado grande (máx 10MB)');
  })
  .onStatus(415, () => {
    mostrarError('Tipo de archivo no permitido');
  })
  .onLoadingEnd(() => {
    habilitarFormulario();
  });
```

**El cliente automáticamente**:
- Detecta que es FormData
- NO agrega Content-Type (para que el navegador lo haga con el boundary correcto)
- Envía el archivo tal cual

### Headers Personalizados

Agregar headers específicos a una petición:

```javascript
client.get('/api/usuarios', {
  headers: {
    'X-Custom-Header': 'mi-valor',
    'Accept-Language': 'es-MX',
    'X-Request-ID': generarID()
  }
})
  .onOk(data => console.log(data));
```

**Ejemplo real**: API que requiere un API key

```javascript
client.get('https://api-externa.com/datos', {
  headers: {
    'X-API-Key': 'tu-api-key-aqui',
    'X-Client-Version': '2.0.0'
  }
})
  .onOk(datos => procesarDatos(datos));
```

### Cancelar Peticiones (AbortController)

Cancela una petición en progreso:

```javascript
const controlador = new AbortController();

client.get('/api/buscar?q=termino', {
  signal: controlador.signal
})
  .onOk(resultados => mostrarResultados(resultados));

// Después, si el usuario cancela la búsqueda:
botonCancelar.addEventListener('click', () => {
  controlador.abort();
  console.log('Búsqueda cancelada');
});
```

**Caso de uso real**: Búsqueda en tiempo real

```javascript
let controladorActual = null;

inputBusqueda.addEventListener('input', (e) => {
  // Cancelar la búsqueda anterior
  if (controladorActual) {
    controladorActual.abort();
  }
  
  // Nueva búsqueda
  controladorActual = new AbortController();
  
  client.get(`/api/buscar?q=${e.target.value}`, {
    signal: controladorActual.signal
  })
    .onOk(resultados => {
      mostrarResultados(resultados);
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('Búsqueda cancelada por el usuario');
      }
    });
});
```

---

## Referencia de la API

### FetchHttpClient

La clase principal del cliente HTTP.

#### Constructor

```javascript
new FetchHttpClient(options)
```

**Parámetros:**
- `options` (Objeto, opcional):
    - `interceptors` (Array): Array de objetos interceptores

**Ejemplo:**
```javascript
const client = new FetchHttpClient({
  interceptors: [authInterceptor, loggingInterceptor]
});
```

#### Métodos

##### `get(url, options)`

Realiza una petición GET.

**Parámetros:**
- `url` (string): URL de la petición
- `options` (Objeto, opcional):
    - `headers` (Objeto): Headers personalizados
    - `signal` (AbortSignal): Señal para cancelar la petición
    - `params` (Objeto): Query params (si los implementas)

**Retorna:** `ObservableResponse`

**Ejemplo:**
```javascript
client.get('/api/usuarios', {
  headers: { 'X-Custom': 'valor' }
})
  .onOk(usuarios => console.log(usuarios));
```

##### `post(url, data, options)`

Realiza una petición POST.

**Parámetros:**
- `url` (string): URL de la petición
- `data` (any): Datos a enviar. Puede ser:
    - Objeto JavaScript (se convierte a JSON automáticamente)
    - FormData (para archivos)
    - String
    - Blob
    - ArrayBuffer
- `options` (Objeto, opcional): Mismo que `get()`

**Retorna:** `ObservableResponse`

**Ejemplos:**

JSON:
```javascript
client.post('/api/usuarios', {
  nombre: 'Juan',
  edad: 25
})
  .onStatus(201, usuario => console.log('Creado:', usuario));
```

FormData (archivos):
```javascript
const formData = new FormData();
formData.append('archivo', archivo);

client.post('/api/subir', formData)
  .onOk(respuesta => console.log('Subido:', respuesta));
```

##### `put(url, data, options)`

Realiza una petición PUT (actualización completa).

**Parámetros:** Iguales a `post()`

**Retorna:** `ObservableResponse`

**Ejemplo:**
```javascript
client.put('/api/usuarios/123', {
  nombre: 'Juan Actualizado',
  email: 'nuevo@email.com'
})
  .onOk(usuario => console.log('Actualizado:', usuario));
```

##### `patch(url, data, options)`

Realiza una petición PATCH (actualización parcial).

**Parámetros:** Iguales a `post()`

**Retorna:** `ObservableResponse`

**Ejemplo:**
```javascript
client.patch('/api/usuarios/123', {
  email: 'nuevo@email.com'
  // Solo actualiza el email, lo demás queda igual
})
  .onOk(usuario => console.log('Parcheado:', usuario));
```

##### `delete(url, data, options)`

Realiza una petición DELETE.

**Parámetros:** Iguales a `post()` (el `data` es opcional)

**Retorna:** `ObservableResponse`

**Ejemplo:**
```javascript
client.delete('/api/usuarios/123')
  .onStatus(204, () => console.log('Eliminado'))
  .onStatus(404, () => console.log('Ya no existe'));
```

---

### ObservableResponse

El objeto que se retorna de cada petición HTTP. Permite encadenar handlers.

#### Métodos

##### `onStatus(status, callback)`

Maneja un código de status HTTP específico.

**Parámetros:**
- `status` (number | string): Código HTTP (200, 404, 500, 'timeout', etc.)
- `callback` (Function): Función que recibe los datos de la respuesta

**Retorna:** `this` (para encadenar)

**Ejemplo:**
```javascript
.onStatus(200, (data) => {
  console.log('Éxito:', data);
})
.onStatus(404, () => {
  console.log('No encontrado');
})
.onStatus('timeout', () => {
  console.log('Timeout');
})
```

##### `onOk(callback)`

Maneja cualquier código de status 2xx (200-299).

**Parámetros:**
- `callback` (Function): Función que recibe los datos de la respuesta

**Retorna:** `this`

**Ejemplo:**
```javascript
.onOk((data) => {
  console.log('Éxito:', data);
  // Se ejecuta si el status es 200, 201, 202, 204, etc.
})
```

##### `onStatusAny(callback)`

Maneja cualquier status que no tenga un handler específico.

**Parámetros:**
- `callback` (Function): Función que recibe el objeto completo `{ status, data }`

**Retorna:** `this`

**Ejemplo:**
```javascript
.onStatus(200, data => console.log('OK'))
.onStatus(404, () => console.log('Not found'))
.onStatusAny((response) => {
  // Se ejecuta para 401, 403, 500, etc.
  console.log('Status no manejado:', response.status);
  console.log('Datos:', response.data);
})
```

##### `onLoadingStart(callback)`

Se ejecuta cuando la petición inicia.

**Parámetros:**
- `callback` (Function): Función sin parámetros

**Retorna:** `this`

**Ejemplo:**
```javascript
.onLoadingStart(() => {
  mostrarSpinner();
  deshabilitarBoton();
})
```

##### `onLoadingEnd(callback)`

Se ejecuta cuando la petición termina (éxito o error).

**Parámetros:**
- `callback` (Function): Función sin parámetros

**Retorna:** `this`

**Ejemplo:**
```javascript
.onLoadingEnd(() => {
  ocultarSpinner();
  habilitarBoton();
})
```

##### `timeout(ms)`

Establece un tiempo máximo de espera.

**Parámetros:**
- `ms` (number): Milisegundos de timeout

**Retorna:** `this`

**Ejemplo:**
```javascript
.timeout(5000) // 5 segundos
.onStatus('timeout', () => {
  console.log('Tardó demasiado');
})
```

##### `retry(times)`

Establece el número de reintentos en caso de error.

**Parámetros:**
- `times` (number): Número de reintentos

**Retorna:** `this`

**Ejemplo:**
```javascript
.retry(3) // Reintentar hasta 3 veces
.onOk(data => console.log('Éxito (quizá al 2do o 3er intento)'))
```

##### `catch(callback)`

Captura excepciones lanzadas dentro de los handlers.

**Parámetros:**
- `callback` (Function): Función que recibe el error

**Retorna:** `this`

**Ejemplo:**
```javascript
.onOk((data) => {
  // Si este código lanza un error...
  throw new Error('Algo salió mal');
})
.catch((error) => {
  // ...se captura aquí
  console.error('Error en handler:', error);
})
```

##### `finally(callback)`

Se ejecuta siempre, sin importar el resultado.

**Parámetros:**
- `callback` (Function): Función sin parámetros

**Retorna:** `this`

**Ejemplo:**
```javascript
.onOk(() => console.log('Éxito'))
.onStatus(500, () => console.log('Error'))
.finally(() => {
  console.log('Esto SIEMPRE se ejecuta');
  limpiar();
})
```

##### `response()`

Obtiene la respuesta como una Promesa.

**Parámetros:** Ninguno

**Retorna:** `Promise<{ status: number, data: any }>`

**Ejemplo:**
```javascript
const respuesta = await client.get('/api/usuarios').response();

console.log(respuesta.status); // 200
console.log(respuesta.data);   // Array de usuarios
```

---

### Interceptor (Interfaz)

Un interceptor es un objeto con funciones opcionales.

#### Estructura

```javascript
{
  onRequest?: (config) => config,
  onResponse?: (response) => response,
  onRequestError?: (error) => error,
  onResponseError?: (error) => error
}
```

#### `onRequest(config)`

Se ejecuta **antes** de enviar la petición.

**Parámetros:**
- `config` (Objeto):
  ```javascript
  {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    headers: Object,
    body: any
  }
  ```

**Debe retornar:** El `config` (modificado o no)

**Ejemplo:**
```javascript
onRequest: (config) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    }
  };
}
```

#### `onResponse(response)`

Se ejecuta **después** de recibir una respuesta exitosa.

**Parámetros:**
- `response` (Objeto):
  ```javascript
  {
    status: number,
    data: any
  }
  ```

**Debe retornar:** El `response` (modificado o no)

**Ejemplo:**
```javascript
onResponse: (response) => {
  console.log('Respuesta recibida:', response.status);
  return response;
}
```

#### `onRequestError(error)`

Se ejecuta si hay error al hacer la petición (red caída, timeout, etc.).

**Parámetros:**
- `error` (Error): Objeto de error

**Debe retornar:** El `error` (modificado o no)

**Ejemplo:**
```javascript
onRequestError: (error) => {
  console.error('Error de red:', error.message);
  return error;
}
```

#### `onResponseError(error)`

Se ejecuta si el servidor responde con un error.

**Parámetros:**
- `error` (Objeto):
  ```javascript
  {
    status: number | 'timeout' | 'network_error',
    data: {
      message: string,
      ...otros campos
    }
  }
  ```

**Debe retornar:** El `error` (modificado o no)

**Ejemplo:**
```javascript
onResponseError: (error) => {
  if (error.status === 401) {
    // Redirigir al login
    window.location.href = '/login';
  }
  return error;
}
```

---

## Ejemplos Completos del Mundo Real

### Ejemplo 1: Formulario de Registro

```javascript
// Setup del cliente
const api = new FetchHttpClient({
  interceptors: [
    {
      onRequest: (config) => {
        // Agregar token si existe
        const token = localStorage.getItem('token');
        if (token && !config.url.includes('/auth/')) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      onResponseError: (error) => {
        // Manejo global de errores
        if (error.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return error;
      }
    }
  ]
});

// Función de registro
function registrarUsuario(formulario) {
  const datos = {
    nombre: formulario.nombre.value,
    email: formulario.email.value,
    password: formulario.password.value,
    telefono: formulario.telefono.value
  };
  
  api.post('/api/auth/registro', datos)
    .timeout(10000)
    .onLoadingStart(() => {
      formulario.querySelector('button').disabled = true;
      formulario.querySelector('button').textContent = 'Registrando...';
    })
    .onLoadingEnd(() => {
      formulario.querySelector('button').disabled = false;
      formulario.querySelector('button').textContent = 'Registrar';
    })
    .onStatus(201, (usuario) => {
      // Registro exitoso
      console.log('Usuario registrado:', usuario);
      localStorage.setItem('token', usuario.token);
      mostrarNotificacion('¡Bienvenido! Tu cuenta ha sido creada.');
      window.location.href = '/dashboard';
    })
    .onStatus(400, (errores) => {
      // Errores de validación
      console.log('Errores de validación:', errores);
      
      // Limpiar errores anteriores
      document.querySelectorAll('.error').forEach(el => el.remove());
      
      // Mostrar nuevos errores
      Object.keys(errores).forEach(campo => {
        const input = formulario.querySelector(`[name="${campo}"]`);
        const mensajeError = document.createElement('span');
        mensajeError.className = 'error';
        mensajeError.textContent = errores[campo];
        input.parentNode.appendChild(mensajeError);
      });
    })
    .onStatus(409, () => {
      // Email ya existe
      mostrarError('Este email ya está registrado. ¿Quieres iniciar sesión?');
    })
    .onStatus('timeout', () => {
      mostrarError('La conexión está tardando demasiado. Verifica tu internet.');
    })
    .catch((error) => {
      console.error('Error inesperado:', error);
      mostrarError('Algo salió mal. Por favor intenta de nuevo.');
    });
}
```

### Ejemplo 2: Dashboard con Múltiples Peticiones

```javascript
// Cliente configurado
const api = new FetchHttpClient({
  interceptors: [
    {
      onRequest: (config) => {
        config.headers['Authorization'] = `Bearer ${getToken()}`;
        config.headers['X-Tenant-ID'] = getTenantId();
        return config;
      }
    },
    {
      onRequest: (config) => {
        console.log(`📤 ${config.method} ${config.url}`);
        return config;
      },
      onResponse: (response) => {
        console.log(`📥 ${response.status}`);
        return response;
      }
    }
  ]
});

// Cargar todo el dashboard
async function cargarDashboard() {
  mostrarCargando();
  
  // Cargar estadísticas
  api.get('/api/estadisticas')
    .retry(2)
    .onOk((stats) => {
      document.getElementById('total-usuarios').textContent = stats.usuarios;
      document.getElementById('total-ventas').textContent = `${stats.ventas}`;
      document.getElementById('total-productos').textContent = stats.productos;
    })
    .catch(() => {
      mostrarError('No se pudieron cargar las estadísticas');
    });
  
  // Cargar actividad reciente
  api.get('/api/actividad-reciente?limit=10')
    .retry(2)
    .onOk((actividades) => {
      renderizarActividades(actividades);
    });
  
  // Cargar notificaciones
  api.get('/api/notificaciones?no_leidas=true')
    .onOk((notificaciones) => {
      actualizarBadgeNotificaciones(notificaciones.length);
      renderizarNotificaciones(notificaciones);
    });
  
  // Todas las peticiones terminaron
  Promise.all([
    api.get('/api/estadisticas').response(),
    api.get('/api/actividad-reciente').response(),
    api.get('/api/notificaciones').response()
  ]).then(() => {
    ocultarCargando();
    console.log('Dashboard cargado completamente');
  }).catch(() => {
    ocultarCargando();
    mostrarError('Hubo problemas al cargar el dashboard');
  });
}
```

### Ejemplo 3: Búsqueda en Tiempo Real

```javascript
const api = new FetchHttpClient();
let controladorBusqueda = null;
let timeoutBusqueda = null;

const inputBusqueda = document.getElementById('busqueda');
const resultadosDiv = document.getElementById('resultados');

inputBusqueda.addEventListener('input', (e) => {
  const termino = e.target.value.trim();
  
  // Cancelar búsqueda anterior
  if (controladorBusqueda) {
    controladorBusqueda.abort();
  }
  
  // Cancelar timeout anterior
  clearTimeout(timeoutBusqueda);
  
  // Si está vacío, limpiar resultados
  if (!termino) {
    resultadosDiv.innerHTML = '';
    return;
  }
  
  // Esperar 300ms antes de buscar (debounce)
  timeoutBusqueda = setTimeout(() => {
    controladorBusqueda = new AbortController();
    
    resultadosDiv.innerHTML = '<p>Buscando...</p>';
    
    api.get(`/api/buscar?q=${encodeURIComponent(termino)}`, {
      signal: controladorBusqueda.signal
    })
      .timeout(5000)
      .onOk((resultados) => {
        if (resultados.length === 0) {
          resultadosDiv.innerHTML = '<p>No se encontraron resultados</p>';
        } else {
          renderizarResultados(resultados);
        }
      })
      .onStatus('timeout', () => {
        resultadosDiv.innerHTML = '<p>La búsqueda tardó demasiado</p>';
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          resultadosDiv.innerHTML = '<p>Error al buscar</p>';
        }
      });
  }, 300);
});

function renderizarResultados(resultados) {
  resultadosDiv.innerHTML = resultados.map(r => `
    <div class="resultado">
      <h3>${r.nombre}</h3>
      <p>${r.descripcion}</p>
    </div>
  `).join('');
}
```

### Ejemplo 4: Subir Archivo con Progreso

```javascript
const api = new FetchHttpClient();

function subirArchivo(archivo) {
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('carpeta', 'documentos');
  formData.append('es_publico', 'false');
  
  const nombreArchivo = document.getElementById('nombre-archivo');
  const barraProgreso = document.getElementById('barra-progreso');
  const botonSubir = document.getElementById('btn-subir');
  
  api.post('/api/archivos/subir', formData)
    .timeout(60000) // 1 minuto para archivos grandes
    .onLoadingStart(() => {
      nombreArchivo.textContent = `Subiendo ${archivo.name}...`;
      barraProgreso.style.display = 'block';
      barraProgreso.value = 0;
      botonSubir.disabled = true;
    })
    .onLoadingEnd(() => {
      botonSubir.disabled = false;
    })
    .onStatus(201, (respuesta) => {
      nombreArchivo.textContent = `✅ ${archivo.name} subido correctamente`;
      barraProgreso.value = 100;
      
      console.log('URL del archivo:', respuesta.url);
      console.log('ID del archivo:', respuesta.id);
      
      setTimeout(() => {
        barraProgreso.style.display = 'none';
        nombreArchivo.textContent = '';
      }, 2000);
      
      mostrarNotificacion('Archivo subido exitosamente');
    })
    .onStatus(413, () => {
      nombreArchivo.textContent = '❌ Archivo demasiado grande (máx 10MB)';
      barraProgreso.style.display = 'none';
    })
    .onStatus(415, () => {
      nombreArchivo.textContent = '❌ Tipo de archivo no permitido';
      barraProgreso.style.display = 'none';
    })
    .onStatus('timeout', () => {
      nombreArchivo.textContent = '❌ La subida tardó demasiado';
      barraProgreso.style.display = 'none';
    })
    .catch((error) => {
      console.error('Error:', error);
      nombreArchivo.textContent = '❌ Error al subir el archivo';
      barraProgreso.style.display = 'none';
    });
}

// Event listener para el input de archivo
document.getElementById('input-archivo').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (archivo) {
    subirArchivo(archivo);
  }
});
```

---

## Tips y Mejores Prácticas

### 1. Siempre Retorna en los Interceptores

❌ **Mal:**
```javascript
const interceptor = {
  onRequest: (config) => {
    config.headers['Authorization'] = 'Bearer token';
    // ¡Falta el return!
  }
};
```

✅ **Bien:**
```javascript
const interceptor = {
  onRequest: (config) => {
    config.headers['Authorization'] = 'Bearer token';
    return config; // ✅
  }
};
```

### 2. Usa `.onOk()` para Simplificar

Si no te importa diferenciar entre 200, 201, 204, etc., usa `.onOk()`:

❌ **Complicado:**
```javascript
client.get('/api/usuarios')
  .onStatus(200, data => procesarDatos(data))
  .onStatus(201, data => procesarDatos(data))
  .onStatus(204, data => procesarDatos(data));
```

✅ **Simple:**
```javascript
client.get('/api/usuarios')
  .onOk(data => procesarDatos(data));
```

### 3. Usa `.finally()` para Cleanup

Siempre limpia recursos en `.finally()`:

✅ **Bien:**
```javascript
client.post('/api/usuarios', datos)
  .onLoadingStart(() => mostrarSpinner())
  .onOk(() => console.log('Éxito'))
  .onStatus(400, () => console.log('Error'))
  .finally(() => {
    ocultarSpinner(); // Se ejecuta SIEMPRE
    limpiarFormulario();
  });
```

### 4. Combina Loading con Finally

```javascript
let cargando = false;

client.get('/api/datos')
  .onLoadingStart(() => {
    cargando = true;
    actualizarUI();
  })
  .onOk(datos => procesarDatos(datos))
  .finally(() => {
    cargando = false;
    actualizarUI();
  });
```

### 5. Usa Timeout para Mejor UX

No dejes al usuario esperando eternamente:

```javascript
client.get('/api/reporte-grande')
  .timeout(30000) // 30 segundos
  .onStatus('timeout', () => {
    mostrarMensaje(
      'El reporte está tardando. Te enviaremos un email cuando esté listo.'
    );
  });
```

### 6. Retry para APIs Inestables

Para APIs externas que pueden fallar ocasionalmente:

```javascript
client.get('https://api-externa.com/datos')
  .retry(3)
  .timeout(10000)
  .onOk(datos => usar Datos(datos))
  .onStatusAny(() => {
    // Si falla después de 3 intentos, usar cache
    usarDatosCache();
  });
```

### 7. Manejo de Errores por Capas

```javascript
const api = new FetchHttpClient({
  interceptors: [
    {
      // Capa 1: Errores globales
      onResponseError: (error) => {
        if (error.status === 401) logout();
        if (error.status >= 500) reportarError(error);
        return error;
      }
    }
  ]
});

// Capa 2: Errores específicos
api.post('/api/usuarios', datos)
  .onStatus(400, errores => mostrarErroresValidacion(errores))
  .onStatus(409, () => mostrarError('Usuario duplicado'))
  .catch(error => {
    // Capa 3: Errores inesperados
    console.error('Error inesperado:', error);
  });
```

---

## Preguntas Frecuentes

### ¿Por qué usar esto en lugar de Axios solo?

**Con axios solo:**
```javascript
try {
  const response = await axios.get('/api/usuarios');
  if (response.status === 200) {
    console.log(response.data);
  }
} catch (error) {
  if (error.response?.status === 404) {
    console.log('No encontrado');
  } else if (error.response?.status === 500) {
    console.log('Error del servidor');
  }
}
```

**Con este cliente (usando cualquier implementación):**
```javascript
client.get('/api/usuarios')
  .onOk(data => console.log(data))
  .onStatus(404, () => console.log('No encontrado'))
  .onStatus(500, () => console.log('Error del servidor'));
```

Ventajas adicionales:
- ✅ **Sintaxis más limpia**: Manejo de status codes encadenado
- ✅ **Built-in features**: Loading, retry, timeout sin configuración extra
- ✅ **Interceptores unificados**: Funcionan igual en fetch o axios
- ✅ **Cambiar implementación**: Sin tocar el resto del código
- ✅ **TypeScript friendly**: Completamente documentado con JSDoc

### ¿Por qué no usar solo fetch?

`fetch()` es de muy bajo nivel y requiere mucho código boilerplate. Este cliente te da:
- Manejo automático de JSON
- Interceptores
- Loading states
- Retry automático
- Timeout
- Manejo elegante de status codes

### ¿Funciona con async/await?

Sí, usa `.response()`:

```javascript
const respuesta = await client.get('/api/usuarios').response();
```

### ¿Puedo usar fetch() directamente?

Sí, este cliente usa `fetch()` internamente. Es solo una capa de abstracción.

### ¿Soporta cancelación de peticiones?

Sí, usa `AbortController`:

```javascript
const controller = new AbortController();
client.get('/api/datos', { signal: controller.signal });
controller.abort();
```

### ¿Cómo manejo autenticación?

Usa un interceptor:

```javascript
const client = new FetchHttpClient({
  interceptors: [{
    onRequest: (config) => ({
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${getToken()}`
      }
    })
  }]
});
```

### ¿Funciona en Node.js?

- **FetchHttpClient**: Solo en Node.js 18+ (tiene `fetch()` nativo) o con un polyfill
- **AxiosHttpClient**: Sí, funciona perfectamente en cualquier versión de Node.js

### ¿Puedo cambiar de fetch a axios después?

¡Sí! Ese es el punto de la arquitectura. Solo cambias la instancia:

```javascript
// Antes (con fetch)
const client = new FetchHttpClient({ interceptors: [...] });

// Después (con axios)
const client = new AxiosHttpClient({ interceptors: [...] });

// Todo tu código sigue funcionando igual
client.get('/api/usuarios').onOk(data => ...);
```

### ¿Por qué heredar de HttpClient?

La clase abstracta `HttpClient` garantiza que cualquier implementación tenga los métodos necesarios (`get`, `post`, `put`, `patch`, `delete`). Esto permite:

1. **Intercambiabilidad**: Cambiar de implementación sin romper código
2. **Consistencia**: Todas las implementaciones tienen la misma API
3. **Testing**: Crear mocks fácilmente
4. **Extensibilidad**: Cualquiera puede crear su propia implementación

---

## Licencia

MIT

---