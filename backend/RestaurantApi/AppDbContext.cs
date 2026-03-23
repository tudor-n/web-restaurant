using Microsoft.EntityFrameworkCore;
using RestaurantApi.Models;

public class AppDbContext : DbContext{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();

    _db.Categories.ToListAsync()
    _db.Products.Where(p => p.Price > 20)
    _db.Orders.Add(new Order { ... }) 

    modelBuilder.Entity<Category>().ToTable("categories");

    modelBuilder.Entity<Category>(e => {
    e.Property(c => c.Id).HasColumnName("id");
    e.Property(c => c.Name).HasColumnName("name");
    e.Property(c => c.SortOrder).HasColumnName("sort_order");
   });

   e.HasOne(p => p.Category)
    .WithMany(c => c.Products)
    .HasForeignKey(p => p.CategoryId);

   e.HasOne(oi => oi.Order)
    .WithMany(o => o.Items)
    .HasForeignKey(oi => oi.OrderId);

   e.HasOne(oi => oi.Product)
    .WithMany()
    .HasForeignKey(oi => oi.ProductId);

   e.HasOne(s => s.SourceItem)
    .WithMany()
    .HasForeignKey(s => s.SourceItemId)
    .IsRequired(false);
}
