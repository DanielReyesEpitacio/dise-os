using System.Text;

namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class RawStringBody : IBodyContent
{
    private readonly string _payload;
    private readonly string _contentType;

    public RawStringBody(string payload, string contentType)
    {
        _payload = payload;
        _contentType = contentType;
    }

    public HttpContent ToHttpContent()
        => new StringContent(_payload, Encoding.UTF8, _contentType);
}