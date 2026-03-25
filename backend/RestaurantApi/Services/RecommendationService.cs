namespace RestaurantApi.Services;

public class RecommendationService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public RecommendationService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    // Tudor's implementation: proxies to Python ai-service with fallback
    public async Task<object?> GetRecommendationsAsync(Guid orderId)
    {
        await Task.CompletedTask;
        return null;
    }
}