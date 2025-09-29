namespace Saturn5V2.Utils.FluentHttpClient;

public interface IFluentHttpClient
{
    IHttpRequestBuilder Get(string url);
    IHttpRequestBuilder Post(string url);
    IHttpRequestBuilder Put(string url);
    IHttpRequestBuilder Delete(string url);
    IHttpRequestBuilder Options(string url);
    IHttpRequestBuilder Patch(string url); 
}