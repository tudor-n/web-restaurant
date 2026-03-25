namespace RestaurantApi.Services;

public class SimilarityService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public SimilarityService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }
}