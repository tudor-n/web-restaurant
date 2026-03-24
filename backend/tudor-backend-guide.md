# Backend Development Guide — Tudor
**Role:** Architecture + AI Layer · **Stack:** C# ASP.NET Core 8 + Python 3.11+ · **DB:** PostgreSQL (UUIDs)

---

## 1. Your Ownership at a Glance

You own the **project skeleton and the intelligence layer**. Everything else depends on what you build first — get Models, DbContext, and the Python service right before Beny starts wiring endpoints.

### C# Side

| File | Responsibility |
|---|---|
| `Program.cs` | DI registration, middleware, CORS, SignalR, Swagger setup |
| `Data/AppDbContext.cs` | EF Core config, all DbSets, relationships |
| `Models/*.cs` | All models — get these right once, others depend on them |
| DB migrations + seed | Categories, products, tables with QR tokens |
| `Services/RecommendationService.cs` | Proxies to Python, handles fallback logic |
| `Services/SimilarityService.cs` | Scoring pipeline, rule evaluation |
| `Controllers/AdminController.cs` | AI directive endpoints only (see below) |
| `Models/AIDirective.cs` | AI directive model + DTOs |

### Python Side (full ownership)

| File | Responsibility |
|---|---|
| `main.py` | FastAPI app setup |
| `routers/recommendations.py` | `POST /recommend` |
| `routers/similarity.py` | `POST /similarity/auto-generate` |
| `services/recommendation_engine.py` | Scoring, context evaluation, admin config interpretation |
| `services/similarity_engine.py` | Cosine similarity / co-occurrence logic |
| `models/schemas.py` | Pydantic request/response models |
| Prompt parsing | Natural language `daily_prompt` → structured rules |

---

## 2. Architecture Overview

```
frontend-customer  ──HTTP/WS──►  RestaurantApi (C# ASP.NET Core 8)  ──HTTP──►  ai-service (Python FastAPI)
frontend-admin     ──HTTP──────►  RestaurantApi                      ──SQL───►  PostgreSQL
```

- **`backend/RestaurantApi/`** — main API: all REST endpoints + SignalR WebSocket hubs
- **`backend/ai-scripts/`** — Python FastAPI microservice: recommendation engine, similarity scoring

The C# API calls the Python service internally for AI endpoints. **If the Python service is unreachable, fall back to static/manual recommendations** (implement this in `RecommendationService.cs`).

---

## 3. Database Schema (You Define This)

All models and migrations are yours. Beny's endpoints depend on these being stable.

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

### Status Enums (agree on these with Beny upfront)

| Field | Allowed Values |
|---|---|
| `Orders.status` | `draft`, `submitted`, `preparing`, `ready`, `completed`, `cancelled` |
| `Orders.payment_status` | `unpaid`, `paid`, `refunded` |
| `FlashDealOffers.status` | `pending`, `claimed`, `expired` |

---

## 4. C# Project Structure

```
backend/RestaurantApi/
├── RestaurantApi.csproj
├── Program.cs                  ← yours
├── appsettings.json
├── appsettings.Development.json
├── Controllers/
│   ├── CustomerController.cs   ← Beny's
│   ├── MenuController.cs       ← Beny's
│   └── AdminController.cs      ← shared (AI directive endpoints = yours)
├── Models/                     ← yours (all of them)
│   ├── Product.cs
│   ├── Order.cs
│   ├── OrderItem.cs
│   ├── Category.cs
│   ├── RestaurantTable.cs
│   ├── AIDirective.cs
│   └── FlashDealOffer.cs
├── DTOs/
│   ├── Requests/
│   └── Responses/
├── Services/
│   ├── RecommendationService.cs    ← yours
│   ├── FlashDealService.cs         ← Beny's
│   └── SimilarityService.cs        ← yours
├── Hubs/
│   ├── CustomerHub.cs              ← Beny's
│   └── StaffHub.cs                 ← Beny's
├── Data/
│   └── AppDbContext.cs             ← yours
└── Migrations/                     ← yours
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

## 5. Your C# Endpoints — AdminController (AI Directives)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/directives` | List AI directives (latest active) |
| POST | `/api/admin/directives` | Save new directive `{ rawPrompt }` → call Python to parse |
| PATCH | `/api/admin/directives/{id}` | Toggle `IsActive` |
| GET | `/api/admin/similarity-rules` | Get auto-generated + manual pairing rules |
| POST | `/api/admin/similarity-rules` | Add/edit manual pairing rule |
| POST | `/api/admin/similarity-rules/auto-generate` | Trigger auto-generation via Python |

> The metrics and flash deal management endpoints (`/api/admin/metrics`, `/api/admin/flash-deals`, `/api/admin/flash-deals/trigger`) are **Beny's**.

---

## 6. Python AI Service — Full Ownership

```
backend/ai-scripts/
├── requirements.txt
├── main.py                         ← yours
├── routers/
│   ├── recommendations.py          ← yours  (POST /recommend)
│   └── similarity.py               ← yours  (POST /similarity/auto-generate)
├── services/
│   ├── recommendation_engine.py    ← yours
│   └── similarity_engine.py        ← yours
└── models/
    └── schemas.py                  ← yours
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

## 7. Shared Types Contract

The C# DTO below must match the Python response schema exactly. Beny's `CustomerController` depends on this.

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

## 8. Setup Checklist

1. **DB migration** — `dotnet ef migrations add InitialCreate && dotnet ef database update`
2. **Seed data** — Categories + Products (15–20 items across 4–5 categories), 3–4 Tables with QR tokens
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
6. **SignalR** — Register in `Program.cs`, hub endpoints `/hubs/customer` and `/hubs/staff`

> **Priority order:** Models → AppDbContext → Migrations → Seed → Python service → RecommendationService → SimilarityService → AdminController (AI endpoints). Unblock Beny on Models + DbContext first.
