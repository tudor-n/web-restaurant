# Backend Development Guide

**Team:** 2 Backend Developers · **Stack:** C# ASP.NET Core 8 · **AI Engine:** Python 3.11+ · **DB:** PostgreSQL (UUIDs)

---

## 1. Architecture Overview

```
frontend-customer  ──HTTP/WS──►  RestaurantApi (C# ASP.NET Core 8)  ──HTTP──►  ai-service (Python FastAPI)
frontend-admin     ──HTTP──────►  RestaurantApi                      ──SQL───►  PostgreSQL
```

- **`backend/RestaurantApi/`** — main API: all REST endpoints + SignalR WebSocket hubs
- **`backend/ai-scripts/`** — Python FastAPI microservice: recommendation engine, similarity scoring

The C# API calls the Python service internally for AI endpoints. If the Python service is unreachable, fall back to static/manual recommendations.

---

## 2. Database Schema

### Tables & Columns

| Table | Column | Type | Constraints |
|---|---|---|---|
| **AI_Directives** | `id` | uuid | PK |
| | `raw_prompt` | text | nullable |
| | `parsed_rules` | jsonb | nullable |
| | `created_at` | timestamp | |
| | `is_active` | boolean | nullable |
| **Categories** | `id` | uuid | PK |
| | `name` | varchar | |
| | `sort_order` | int | nullable |
| **Products** | `id` | uuid | PK |
| | `category_id` | uuid | FK → Categories |
| | `name` | varchar | |
| | `description` | text | |
| | `price` | decimal(10,2) | |
| | `image_url` | varchar | |
| | `is_available` | boolean | nullable |
| **Tables** | `id` | uuid | PK |
| | `table_number` | varchar | nullable |
| | `qr_token` | uuid | nullable |
| **Orders** | `id` | uuid | PK |
| | `table_id` | uuid | FK → Tables |
| | `status` | varchar | |
| | `payment_status` | varchar | nullable |
| | `total_amount` | decimal(10,2) | |
| | `created_at` | timestamp | |
| **OrderItems** | `id` | uuid | PK |
| | `order_id` | uuid | FK → Orders |
| | `product_id` | uuid | FK → Products |
| | `quantity` | int | |
| | `unit_price_at_purchase` | decimal(10,2) | |
| | `was_ai_recommended` | boolean | nullable |
| | `is_flash_deal_item` | boolean | nullable |
| **FlashDealOffers** | `id` | uuid | PK |
| | `order_id` | uuid | FK → Orders, nullable |
| | `product_id` | uuid | FK → Products, nullable |
| | `discount_price` | decimal(10,2) | nullable |
| | `expires_at` | timestamp | nullable |
| | `status` | varchar | nullable |

### Key Relationships

- `Products.category_id` → `Categories.id` (many-to-one)
- `Orders.table_id` → `Tables.id` (many-to-one)
- `OrderItems.order_id` → `Orders.id` (many-to-one)
- `OrderItems.product_id` → `Products.id` (many-to-one)
- `FlashDealOffers.order_id` → `Orders.id` (many-to-one)
- `FlashDealOffers.product_id` → `Products.id` (many-to-one)

---

## 3. Ownership Split

### Dev 1 — Customer Flow + Orders

**Files:**
```
Controllers/CustomerController.cs
Controllers/MenuController.cs
Models/Product.cs
Models/Order.cs
Models/OrderItem.cs
Services/RecommendationService.cs
Hubs/CustomerHub.cs
```

**Endpoints to build:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/menu` | List products grouped by category |
| GET | `/api/menu/{categoryId}` | Filter products by category |
| GET | `/api/tables/{qrToken}/session` | Validate QR token, return or create active order |
| POST | `/api/orders` | Create order `{ tableId, items: [{ productId, quantity }] }` |
| PATCH | `/api/orders/{id}/items` | Add/remove items from an open order |
| POST | `/api/orders/{id}/submit` | Finalize order → set `status = "submitted"`, compute `total_amount` |
| GET | `/api/orders/{id}/recommendations` | Return AI-powered suggestions (proxied to Python service) |
| POST | `/api/orders/{id}/claim-deal` | Claim a flash deal → create OrderItem with `IsFlashDealItem = true` |

**SignalR Hub (`CustomerHub.cs`):**

| Event | Direction | Payload |
|---|---|---|
| `FlashDealAvailable` | Server → Client | `{ DealId, Product, DiscountPrice, ExpiresAt }` |
| `FlashDealExpired` | Server → Client | `{ DealId }` |

### Dev 2 — Admin + AI Engine + Flash Deals

**Files:**
```
Controllers/AdminController.cs
Models/AIDirective.cs
Models/FlashDealOffer.cs
Services/FlashDealService.cs
Services/SimilarityService.cs
Hubs/StaffHub.cs
```

**Endpoints to build:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/directives` | List AI directives (latest active) |
| POST | `/api/admin/directives` | Save new directive `{ rawPrompt }` → call Python to parse |
| PATCH | `/api/admin/directives/{id}` | Toggle `IsActive` |
| GET | `/api/admin/similarity-rules` | Get auto-generated + manual pairing rules |
| POST | `/api/admin/similarity-rules` | Add/edit manual pairing rule |
| GET | `/api/admin/metrics` | Flash deals shown/claimed counts, upsell revenue |
| GET | `/api/admin/flash-deals` | List all flash deal offers with status |
| POST | `/api/admin/flash-deals/trigger` | Manually trigger a flash deal for testing |

**SignalR Hub (`StaffHub.cs`):**

| Event | Direction | Payload |
|---|---|---|
| `FlashDealClaimed` | Server → Kitchen | `{ OrderId, Product, TableNumber, Quantity }` |

**Flash deal lifecycle:**
1. Order submitted → `FlashDealService` evaluates eligibility (timing, product combos)
2. Create `FlashDealOffer` row with `Status = "pending"`, set `ExpiresAt`
3. Emit `FlashDealAvailable` via `CustomerHub`
4. On claim → update `Status = "claimed"`, create `OrderItem`, emit `FlashDealClaimed` to staff
5. On expiry (background service/timer) → update `Status = "expired"`, emit `FlashDealExpired`

---

## 4. C# Project Structure

```
backend/RestaurantApi/
├── RestaurantApi.csproj
├── Program.cs                  # App bootstrap, DI, middleware
├── appsettings.json
├── appsettings.Development.json
├── Controllers/
│   ├── CustomerController.cs
│   ├── MenuController.cs
│   └── AdminController.cs
├── Models/
│   ├── Product.cs
│   ├── Order.cs
│   ├── OrderItem.cs
│   ├── Category.cs
│   ├── RestaurantTable.cs
│   ├── AIDirective.cs
│   └── FlashDealOffer.cs
├── DTOs/                       # Request/Response DTOs (no direct model exposure)
│   ├── Requests/
│   └── Responses/
├── Services/
│   ├── RecommendationService.cs    # Proxies to Python ai-service
│   ├── FlashDealService.cs
│   └── SimilarityService.cs
├── Hubs/
│   ├── CustomerHub.cs              # SignalR hub for customer WebSocket
│   └── StaffHub.cs                 # SignalR hub for staff
├── Data/
│   └── AppDbContext.cs             # EF Core DbContext
└── Migrations/
```

### Key NuGet Packages

| Package | Purpose |
|---|---|
| `Microsoft.AspNetCore.SignalR` | WebSocket hubs |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | PostgreSQL via EF Core |
| `Microsoft.EntityFrameworkCore.Design` | EF Core migrations |
| `Swashbuckle.AspNetCore` | Swagger/OpenAPI docs |

### Sample Model

```csharp
// Models/Order.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RestaurantApi.Models;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TableId { get; set; }
    public RestaurantTable Table { get; set; } = null!;

    [Required]
    public string Status { get; set; } = "draft";   // draft|submitted|preparing|ready|completed|cancelled
    public string? PaymentStatus { get; set; }        // unpaid|paid|refunded

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> Items { get; set; } = [];
    public ICollection<FlashDealOffer> FlashDeals { get; set; } = [];
}
```

---

## 5. Python AI Service (`backend/ai-scripts/`)

```
backend/ai-scripts/
├── requirements.txt
├── main.py                     # FastAPI app entry point
├── routers/
│   ├── recommendations.py      # POST /recommend
│   └── similarity.py           # POST /similarity/auto-generate
├── services/
│   ├── recommendation_engine.py
│   └── similarity_engine.py
└── models/
    └── schemas.py              # Pydantic request/response models
```

### Endpoints (called internally by C# API)

| Method | Route | Purpose |
|---|---|---|
| POST | `/recommend` | Return recommendations given cart + order history |
| POST | `/similarity/auto-generate` | Generate pairing rules from order history |
| POST | `/directives/parse` | Parse natural-language admin prompt into structured rules |

### Key Libraries

| Library | Purpose |
|---|---|
| `fastapi` | HTTP framework |
| `uvicorn` | ASGI server |
| `pydantic` | Data validation / schemas |
| `scikit-learn` | Similarity scoring (cosine similarity, TF-IDF) |
| `numpy` | Matrix operations |
| `httpx` | Async HTTP client (if needed) |

### Sample Schema

```python
# models/schemas.py
from pydantic import BaseModel
from typing import Optional

class CartItem(BaseModel):
    product_id: str
    quantity: int

class RecommendationRequest(BaseModel):
    cart_items: list[CartItem]
    table_id: str
    order_history: Optional[list[str]] = []

class Recommendation(BaseModel):
    product_id: str
    reason: str          # "pairing" | "upsell" | "flash_deal"
    confidence: float    # 0.0 - 1.0

class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation]
```

---

## 6. Shared Types Contract

Both C# and Python reference the same logical types. Frontend imports from `/shared/types/`.

```csharp
// DTOs/Responses/RecommendationResponse.cs
namespace RestaurantApi.DTOs.Responses;

public record RecommendationResponse(
    string ProductId,
    string Reason,
    double Confidence
);
```

---

## 7. Setup Checklist

1. **DB migration** — `dotnet ef migrations add InitialCreate && dotnet ef database update`
2. **Seed data** — Categories + Products (15-20 items across 4-5 categories), 3-4 Tables with QR tokens
3. **Environment** (`appsettings.Development.json`):
   ```json
   {
     "ConnectionStrings": { "Default": "Host=localhost;Database=restaurant;Username=...;Password=..." },
     "AiService": { "BaseUrl": "http://localhost:8000" },
     "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"]
   }
   ```
4. **Python service** — `cd backend/ai-scripts && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
5. **C# API** — `cd backend/RestaurantApi && dotnet run` (default port 5000/5001)
6. **SignalR** — Registered in `Program.cs`, hub endpoints `/hubs/customer` and `/hubs/staff`

---

## 8. Status Enums (agree on these upfront)

| Field | Allowed Values |
|---|---|
| `Orders.status` | `draft`, `submitted`, `preparing`, `ready`, `completed`, `cancelled` |
| `Orders.payment_status` | `unpaid`, `paid`, `refunded` |
| `FlashDealOffers.status` | `pending`, `claimed`, `expired` |
