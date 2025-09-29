namespace Saturn5V2.Utils.FluentHttpClient;

public sealed class JsonResponseDeserializer : IResponseDeserializer
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    public async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        var raw = await content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(raw, Options)!;
    }
}