namespace RestaurantApi.Models;

public class RestaurantTable{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string? TableNumber { get; set; }

    public Guid? QrToken { get; set; }

    public ICollection<Order> Orders { get; set; } = [];
}