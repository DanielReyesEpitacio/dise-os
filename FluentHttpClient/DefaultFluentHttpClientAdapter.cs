namespace Saturn5V2.Utils.FluentHttpClient;


/*
 * var fileBytes = await http.Post("https://api.test.com/file")
                          .WithJsonBody(new { id = 123 })
                          .MapResponse<byte[]>()
                          .WithDeserializer<BinaryResponseDeserializer>()
                          .SendAsync();
 */
public sealed class DefaultFluentHttpClientAdapter : IFluentHttpClient
{
    private readonly HttpClient _http;

    public DefaultFluentHttpClientAdapter(HttpClient http) => _http = http;

    public IHttpRequestBuilder Get(string url)     => new HttpRequestBuilder(_http, HttpMethod.Get, url);
    public IHttpRequestBuilder Post(string url)    => new HttpRequestBuilder(_http, HttpMethod.Post, url);
    public IHttpRequestBuilder Put(string url)     => new HttpRequestBuilder(_http, HttpMethod.Put, url);
    public IHttpRequestBuilder Delete(string url)  => new HttpRequestBuilder(_http, HttpMethod.Delete, url);
    public IHttpRequestBuilder Options(string url) => new HttpRequestBuilder(_http, HttpMethod.Options, url);
    public IHttpRequestBuilder Patch(string url)   => new HttpRequestBuilder(_http, HttpMethod.Patch, url);
}