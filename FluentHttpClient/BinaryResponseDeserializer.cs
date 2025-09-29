namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class BinaryResponseDeserializer : IResponseDeserializer
{
    public async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        if (typeof(T) != typeof(byte[]))
            throw new InvalidOperationException("BinaryResponseDeserializer solo funciona para byte[].");

        var bytes = await content.ReadAsByteArrayAsync();
        return (T)(object)bytes;
    }
}
