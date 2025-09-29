namespace Saturn5V2.Utils.FluentHttpClient;

public interface IResponseDeserializer
{
    Task<T> DeserializeAsync<T>(HttpContent content); 
}