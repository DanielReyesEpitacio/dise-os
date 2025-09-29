namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class TypedHttpRequest<TResponse> : ITypedHttpRequest<TResponse>
{
       private readonly HttpClient _http;
    private readonly HttpRequestMessage _request;
    private IResponseDeserializer _deserializer = new JsonResponseDeserializer();

    public TypedHttpRequest(HttpClient http, HttpRequestMessage request)
    {
        _http = http;
        _request = request;
    }

    public ITypedHttpRequest<TResponse> WithDeserializer<TDeserializer>()
        where TDeserializer : IResponseDeserializer, new()
    {
        _deserializer = new TDeserializer();
        return this;
    }

    public ITypedHttpRequest<TResponse> WithJsonBody<TBody>(TBody body)
        => Body(new JsonBody<TBody>(body));

    public ITypedHttpRequest<TResponse> Body(IBodyContent content)
    {
        _request.Content = content.ToHttpContent();
        return this;
    }

    public async Task<TResponse> SendAsync()
    {
        try
        {
            using var response = await _http.SendAsync(_request);

            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException(
                    $"Respuesta HTTP inválida: {(int)response.StatusCode} {response.ReasonPhrase}");

            return await _deserializer.DeserializeAsync<TResponse>(response.Content);
        }
        catch (TaskCanceledException ex)
        {
            throw new IOException("La solicitud falló por un problema de red/timeout.", ex);
        }
        catch (HttpRequestException)
        {
            throw;
        }
    }

    
    public ITypedHttpRequest<TResponse> WithHeader(string name, string value)
    {
        if (_request.Headers.Contains(name))
            _request.Headers.Remove(name);
        _request.Headers.Add(name, value);
        return this;
    }
    
    public ITypedHttpRequest<TResponse> WithHeaders(System.Collections.Generic.Dictionary<string,string> headers)
    {
        foreach (var kv in headers)
            WithHeader(kv.Key, kv.Value);
        return this;
    }
}