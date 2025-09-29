namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class PlainStringDeserializer : IResponseDeserializer
{
    public async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        if (typeof(T) != typeof(string))
            throw new InvalidOperationException("PlainStringDeserializer solo funciona para string.");

        var raw = await content.ReadAsStringAsync();
        return (T)(object)raw;
    }
}