namespace Saturn5V2.Utils.FluentHttpClient;

public interface IHttpRequestBuilder
{
    // Conveniencia para JSON
    IHttpRequestBuilder WithJsonBody<T>(T body);

    // Cuerpo arbitrario (XML, texto, etc.)
    IHttpRequestBuilder Body(IBodyContent content);
    IHttpRequestBuilder WithHeader(string name, string value);
    IHttpRequestBuilder WithHeaders(System.Collections.Generic.Dictionary<string,string> headers);

    // Indica el tipo que esperas y entra al builder tipado
    ITypedHttpRequest<TResponse> MapResponse<TResponse>();

    // Envío sin mapping → devuelve HttpResponseMessage
    Task<HttpResponseMessage> SendAsync();
}