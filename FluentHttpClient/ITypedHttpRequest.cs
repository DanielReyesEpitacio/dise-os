namespace Saturn5V2.Utils.FluentHttpClient;

public interface ITypedHttpRequest<TResponse>
{
    // Configurar deserializador (default: JSON)
    ITypedHttpRequest<TResponse> WithDeserializer<TDeserializer>()
        where TDeserializer : IResponseDeserializer, new();

    // (Opcional) setear cuerpo también desde el builder tipado
    ITypedHttpRequest<TResponse> WithJsonBody<TBody>(TBody body);
    ITypedHttpRequest<TResponse> Body(IBodyContent content);
    ITypedHttpRequest<TResponse> WithHeader(string name, string value);
    ITypedHttpRequest<TResponse> WithHeaders(System.Collections.Generic.Dictionary<string,string> headers);

    // Envío con mapping → devuelve TResponse (sin genéricos extra ni casting)
    Task<TResponse> SendAsync();
}