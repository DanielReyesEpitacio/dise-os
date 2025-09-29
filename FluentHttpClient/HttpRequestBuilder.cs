namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class HttpRequestBuilder : IHttpRequestBuilder
{
    private readonly HttpClient _http;
    private readonly HttpRequestMessage _request;

    public HttpRequestBuilder(HttpClient http, HttpMethod method, string url)
    {
        _http = http;
        _request = new HttpRequestMessage(method, url);
    }

    public IHttpRequestBuilder WithJsonBody<T>(T body)
        => Body(new JsonBody<T>(body));

    public IHttpRequestBuilder Body(IBodyContent content)
    {
        _request.Content = content.ToHttpContent();
        return this;
    }

    public ITypedHttpRequest<TResponse> MapResponse<TResponse>()
        => new TypedHttpRequest<TResponse>(_http, _request);

    public async Task<HttpResponseMessage> SendAsync()
    {
        try
        {
            // Importante: NO validamos status aquí para que puedas leer 500/400 como "response".
            return await _http.SendAsync(_request);
        }
        catch (TaskCanceledException ex)
        {
            // timeouts, cancelaciones, etc.
            throw new IOException("La solicitud falló por un problema de red/timeout.", ex);
        }
        catch (HttpRequestException ex)
        {
            // errores de conexión/DNS/conexión rechazada
            throw new IOException("La solicitud falló por un problema de red.", ex);
        }
    }
    
    public IHttpRequestBuilder WithHeader(string name, string value)
    {
        // Reemplaza si existe
        if (_request.Headers.Contains(name))
            _request.Headers.Remove(name);
        _request.Headers.Add(name, value);
        return this;
    }
    
    public IHttpRequestBuilder WithHeaders(System.Collections.Generic.Dictionary<string,string> headers)
    {
        foreach (var kv in headers)
            WithHeader(kv.Key, kv.Value);
        return this;
    }
}