# Fluent HTTP Client para C# / .NET

Un cliente HTTP fluido y extensible para .NET que elimina el boilerplate de HttpClient con una API limpia y chainable.

**Autor:** Daniel Reyes Epitacio

---

## Tabla de Contenidos

- [¿Qué es y por qué usarlo?](#qué-es-y-por-qué-usarlo)
- [Instalación](#instalación)
- [Guía de Uso](#guía-de-uso)
- [Deserializers](#deserializers)
- [Body Content](#body-content)
- [Extensibilidad](#extensibilidad)
- [API Reference](#api-reference)

---

## ¿Qué es y por qué usarlo?

### El Problema con HttpClient Directo

**HttpClient nativo (.NET):**
```csharp
// 15+ líneas para un POST simple con JSON
var client = new HttpClient();
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.example.com/users");

// Serializar body manualmente
var json = JsonSerializer.Serialize(new { Name = "John", Email = "john@example.com" });
request.Content = new StringContent(json, Encoding.UTF8, "application/json");

// Headers uno por uno
request.Headers.Add("Authorization", "Bearer token");
request.Headers.Add("X-Tenant-ID", "123");

// Enviar y deserializar manualmente
var response = await client.SendAsync(request);
response.EnsureSuccessStatusCode();
var responseBody = await response.Content.ReadAsStringAsync();
var user = JsonSerializer.Deserialize<User>(responseBody, new JsonSerializerOptions 
{
    PropertyNameCaseInsensitive = true
});
```

**Fluent HTTP Client:**
```csharp
// 4 líneas - mismo resultado
var user = await _http.Post("https://api.example.com/users")
    .WithHeader("Authorization", "Bearer token")
    .WithHeader("X-Tenant-ID", "123")
    .WithJsonBody(new { Name = "John", Email = "john@example.com" })
    .MapResponse<User>()
    .SendAsync();
```

### Ventajas Cuantificables

| Característica | HttpClient Nativo | Fluent HTTP Client |
|----------------|-------------------|-------------------|
| **Líneas de código** | 15+ líneas | 4-5 líneas |
| **Serialización JSON** | Manual (3 líneas) | Automática (1 método) |
| **Deserialización** | Manual (2-3 líneas) | Automática (tipada) |
| **Headers** | `Add()` por cada uno | `.WithHeaders(dict)` |
| **Content-Type** | Manual | Automático según body |
| **Tipo de retorno** | `object?` (necesita cast) | `Task<T>` directo |
| **Encoding** | Especificar UTF8 | Automático |
| **Case-insensitive JSON** | Configurar options | Default |
| **Manejo de errores** | Manual `EnsureSuccess...` | Integrado |

### Diferencias Clave vs HttpClient

#### 1. Serialización/Deserialización Automática

**HttpClient:**
```csharp
// ANTES: Serializar
var json = JsonSerializer.Serialize(data);
var content = new StringContent(json, Encoding.UTF8, "application/json");
request.Content = content;

// DESPUÉS: Deserializar
var raw = await response.Content.ReadAsStringAsync();
var result = JsonSerializer.Deserialize<User>(raw, options);
```

**Fluent:**
```csharp
.WithJsonBody(data)  // Serializa automáticamente
.MapResponse<User>() // Deserializa automáticamente
```

#### 2. Tipado Fuerte sin Wrappers

**HttpClient (común en abstracciones):**
```csharp
var response = await client.GetAsync<User>(url);
var user = response.Data; // ❌ Necesitas unwrapping
var status = response.StatusCode;
var headers = response.Headers;
```

**Fluent:**
```csharp
var user = await _http.Get(url).MapResponse<User>().SendAsync();
// ✅ user es directamente User, sin unwrapping
```

#### 3. Headers más Limpios

**HttpClient:**
```csharp
request.Headers.Add("Authorization", token);
request.Headers.Add("X-Custom-1", value1);
request.Headers.Add("X-Custom-2", value2);
request.Headers.Add("Accept-Language", "es-MX");
// Si un header ya existe, lanza excepción
```

**Fluent:**
```csharp
.WithHeaders(new Dictionary<string, string>
{
    ["Authorization"] = token,
    ["X-Custom-1"] = value1,
    ["X-Custom-2"] = value2,
    ["Accept-Language"] = "es-MX"
}) // Reemplaza si existe, no lanza excepción
```

#### 4. Descargar Archivos Binarios

**HttpClient:**
```csharp
var response = await client.GetAsync(url);
response.EnsureSuccessStatusCode();
var bytes = await response.Content.ReadAsByteArrayAsync();
await File.WriteAllBytesAsync("file.pdf", bytes);
```

**Fluent:**
```csharp
var bytes = await _http.Get(url)
    .MapResponse<byte[]>()
    .WithDeserializer<BinaryResponseDeserializer>()
    .SendAsync();
    
await File.WriteAllBytesAsync("file.pdf", bytes);
```

#### 5. Múltiples Formatos sin Cambiar Código

**HttpClient:**
```csharp
// Para JSON
var json = await response.Content.ReadAsStringAsync();
var data = JsonSerializer.Deserialize<T>(json);

// Para XML (cambio completo)
var xml = await response.Content.ReadAsStringAsync();
var serializer = new XmlSerializer(typeof(T));
var data = serializer.Deserialize(new StringReader(xml));

// Para Binary (otro cambio)
var bytes = await response.Content.ReadAsByteArrayAsync();
```

**Fluent:**
```csharp
// JSON (default)
.MapResponse<User>().SendAsync()

// XML
.MapResponse<User>().WithDeserializer<XmlResponseDeserializer>().SendAsync()

// Binary
.MapResponse<byte[]>().WithDeserializer<BinaryResponseDeserializer>().SendAsync()

// ✅ Solo cambias el deserializer, el resto es igual
```

#### 6. Composición y Reusabilidad

**HttpClient:**
```csharp
// Tienes que repetir esto en cada método
private async Task<T> SendAuthenticatedRequest<T>(HttpMethod method, string url, object? body = null)
{
    var request = new HttpRequestMessage(method, url);
    request.Headers.Add("Authorization", $"Bearer {_token}");
    request.Headers.Add("X-Tenant-ID", _tenantId);
    
    if (body != null)
    {
        var json = JsonSerializer.Serialize(body);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
    }
    
    var response = await _client.SendAsync(request);
    response.EnsureSuccessStatusCode();
    var raw = await response.Content.ReadAsStringAsync();
    return JsonSerializer.Deserialize<T>(raw, _options)!;
}
```

**Fluent:**
```csharp
// Método base reutilizable
private IHttpRequestBuilder AuthenticatedRequest(HttpMethod method, string url) =>
    method.Method switch
    {
        "GET" => _http.Get(url),
        "POST" => _http.Post(url),
        "PUT" => _http.Put(url),
        "DELETE" => _http.Delete(url),
        _ => throw new NotSupportedException()
    }
    .WithHeader("Authorization", $"Bearer {_token}")
    .WithHeader("X-Tenant-ID", _tenantId);

// Usar
var users = await AuthenticatedRequest(HttpMethod.Get, "/users")
    .MapResponse<List<User>>()
    .SendAsync();
```

---

## Instalación

### 1. Registrar en DI

```csharp
// Program.cs
services.AddHttpClient();

services.AddScoped<IFluentHttpClient>(sp => 
{
    var factory = sp.GetRequiredService<IHttpClientFactory>();
    var client = factory.CreateClient();
    return new DefaultFluentHttpClientAdapter(client);
});
```

### 2. Con configuración de HttpClient

```csharp
services.AddHttpClient("API", client =>
{
    client.BaseAddress = new Uri("https://api.example.com");
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");
});

services.AddScoped<IFluentHttpClient>(sp => 
{
    var factory = sp.GetRequiredService<IHttpClientFactory>();
    return new DefaultFluentHttpClientAdapter(factory.CreateClient("API"));
});
```

---

## Guía de Uso

### Peticiones Básicas

```csharp
// GET
var users = await _http.Get("https://api.example.com/users")
    .MapResponse<List<User>>()
    .SendAsync();

// POST
var user = await _http.Post("https://api.example.com/users")
    .WithJsonBody(new { Name = "John", Email = "john@example.com" })
    .MapResponse<User>()
    .SendAsync();

// PUT
var updated = await _http.Put($"https://api.example.com/users/{id}")
    .WithJsonBody(updateRequest)
    .MapResponse<User>()
    .SendAsync();

// DELETE
await _http.Delete($"https://api.example.com/users/{id}")
    .SendAsync(); // Sin MapResponse si no esperas respuesta

// PATCH
var patched = await _http.Patch($"https://api.example.com/users/{id}")
    .WithJsonBody(new { Email = "new@example.com" })
    .MapResponse<User>()
    .SendAsync();
```

### Headers

```csharp
// Single header
.WithHeader("Authorization", $"Bearer {token}")

// Multiple headers
.WithHeaders(new Dictionary<string, string>
{
    ["Authorization"] = $"Bearer {token}",
    ["X-Tenant-ID"] = tenantId,
    ["Accept-Language"] = "es-MX"
})
```

### Sin MapResponse (acceso a HttpResponseMessage)

```csharp
var response = await _http.Get(url)
    .WithHeader("Authorization", token)
    .SendAsync(); // ← Sin MapResponse

Console.WriteLine($"Status: {response.StatusCode}");
var body = await response.Content.ReadAsStringAsync();
```

---

## Deserializers

### Incluidos

#### JsonResponseDeserializer (Default)

```csharp
// Se usa automáticamente
var user = await _http.Get(url)
    .MapResponse<User>()
    .SendAsync();
```

#### PlainStringDeserializer

```csharp
var html = await _http.Get("https://example.com")
    .MapResponse<string>()
    .WithDeserializer<PlainStringDeserializer>()
    .SendAsync();
```

#### BinaryResponseDeserializer

```csharp
var fileBytes = await _http.Get("https://api.example.com/files/doc.pdf")
    .MapResponse<byte[]>()
    .WithDeserializer<BinaryResponseDeserializer>()
    .SendAsync();
```

### Custom Deserializer

```csharp
public sealed class XmlResponseDeserializer : IResponseDeserializer
{
    public async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        var xml = await content.ReadAsStringAsync();
        var serializer = new XmlSerializer(typeof(T));
        using var reader = new StringReader(xml);
        return (T)serializer.Deserialize(reader)!;
    }
}

// Uso
var config = await _http.Get(url)
    .MapResponse<AppConfig>()
    .WithDeserializer<XmlResponseDeserializer>()
    .SendAsync();
```

---

## Body Content

### JsonBody (Default)

```csharp
.WithJsonBody(new { Name = "John", Email = "john@example.com" })
```

### RawStringBody

```csharp
.Body(new RawStringBody(
    payload: "<xml><data>value</data></xml>",
    contentType: "application/xml"
))
```

### Custom Body

```csharp
public sealed class FormUrlEncodedBody : IBodyContent
{
    private readonly Dictionary<string, string> _data;
    
    public FormUrlEncodedBody(Dictionary<string, string> data) => _data = data;
    
    public HttpContent ToHttpContent() => new FormUrlEncodedContent(_data);
}

// Uso
var form = new Dictionary<string, string>
{
    ["username"] = "john@example.com",
    ["password"] = "secret",
    ["grant_type"] = "password"
};

var token = await _http.Post("https://api.example.com/oauth/token")
    .Body(new FormUrlEncodedBody(form))
    .MapResponse<TokenResponse>()
    .SendAsync();
```

---

## Extensibilidad

### Wrapper para Auth Automático

```csharp
public class AuthenticatedHttpClient
{
    private readonly IFluentHttpClient _http;
    private readonly string _token;
    
    public AuthenticatedHttpClient(IFluentHttpClient http, string token)
    {
        _http = http;
        _token = token;
    }
    
    private IHttpRequestBuilder WithAuth(IHttpRequestBuilder builder) =>
        builder.WithHeader("Authorization", $"Bearer {_token}");
    
    public IHttpRequestBuilder Get(string url) => WithAuth(_http.Get(url));
    public IHttpRequestBuilder Post(string url) => WithAuth(_http.Post(url));
    public IHttpRequestBuilder Put(string url) => WithAuth(_http.Put(url));
    public IHttpRequestBuilder Delete(string url) => WithAuth(_http.Delete(url));
}

// Uso
var authHttp = new AuthenticatedHttpClient(_http, token);
var users = await authHttp.Get("/users")
    .MapResponse<List<User>>()
    .SendAsync();
```

---

## API Reference

### IFluentHttpClient

```csharp
IHttpRequestBuilder Get(string url)
IHttpRequestBuilder Post(string url)
IHttpRequestBuilder Put(string url)
IHttpRequestBuilder Delete(string url)
IHttpRequestBuilder Patch(string url)
IHttpRequestBuilder Options(string url)
```

### IHttpRequestBuilder

```csharp
IHttpRequestBuilder WithJsonBody<T>(T body)
IHttpRequestBuilder Body(IBodyContent content)
IHttpRequestBuilder WithHeader(string name, string value)
IHttpRequestBuilder WithHeaders(Dictionary<string, string> headers)
ITypedHttpRequest<TResponse> MapResponse<TResponse>()
Task<HttpResponseMessage> SendAsync()
```

### ITypedHttpRequest<TResponse>

```csharp
ITypedHttpRequest<TResponse> WithDeserializer<TDeserializer>() 
    where TDeserializer : IResponseDeserializer, new()
ITypedHttpRequest<TResponse> WithJsonBody<TBody>(TBody body)
ITypedHttpRequest<TResponse> Body(IBodyContent content)
ITypedHttpRequest<TResponse> WithHeader(string name, string value)
ITypedHttpRequest<TResponse> WithHeaders(Dictionary<string, string> headers)
Task<TResponse> SendAsync()
```

### IResponseDeserializer

```csharp
Task<T> DeserializeAsync<T>(HttpContent content)
```

### IBodyContent

```csharp
HttpContent ToHttpContent()
```

---

## Ejemplo Real: CRUD Service

```csharp
public class UserService
{
    private readonly IFluentHttpClient _http;
    private readonly string _baseUrl;
    private readonly string _token;
    
    public UserService(IFluentHttpClient http, IConfiguration config)
    {
        _http = http;
        _baseUrl = config["ApiBaseUrl"]!;
        _token = config["ApiToken"]!;
    }
    
    private IHttpRequestBuilder Authenticated(string endpoint) =>
        _http.Get($"{_baseUrl}{endpoint}")
            .WithHeader("Authorization", $"Bearer {_token}");
    
    public Task<List<User>> GetAllAsync() =>
        Authenticated("/users")
            .MapResponse<List<User>>()
            .SendAsync();
    
    public async Task<User?> GetByIdAsync(int id)
    {
        try
        {
            return await Authenticated($"/users/{id}")
                .MapResponse<User>()
                .SendAsync();
        }
        catch (HttpRequestException) { return null; }
    }
    
    public Task<User> CreateAsync(CreateUserRequest request) =>
        _http.Post($"{_baseUrl}/users")
            .WithHeader("Authorization", $"Bearer {_token}")
            .WithJsonBody(request)
            .MapResponse<User>()
            .SendAsync();
    
    public Task<User> UpdateAsync(int id, UpdateUserRequest request) =>
        _http.Put($"{_baseUrl}/users/{id}")
            .WithHeader("Authorization", $"Bearer {_token}")
            .WithJsonBody(request)
            .MapResponse<User>()
            .SendAsync();
    
    public Task DeleteAsync(int id) =>
        _http.Delete($"{_baseUrl}/users/{id}")
            .WithHeader("Authorization", $"Bearer {_token}")
            .SendAsync();
}
```

---

## FAQ

**¿Por qué Task<T> directo en lugar de Task<Response<T>>?**  
Menos boilerplate. No necesitas unwrapping:
```csharp
var user = await GetUserAsync(); // user es User directamente
```

**¿Qué pasa si la petición falla (4xx/5xx)?**  
Lanza `HttpRequestException`. Si necesitas el response completo, no uses `MapResponse()`.

**¿Funciona con Polly?**  
Sí, configura Polly en el HttpClient que inyectas al adapter.

**¿Cómo testeo esto?**  
Mockea `IFluentHttpClient` o usa un `HttpMessageHandler` fake en el `HttpClient`.

---