using System.Text;

namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class JsonBody<T> : IBodyContent
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly T _value;

    public JsonBody(T value) => _value = value;

    public HttpContent ToHttpContent()
    {
        var json = JsonSerializer.Serialize(_value, Options);
        return new StringContent(json, Encoding.UTF8, "application/json");
    } 
}