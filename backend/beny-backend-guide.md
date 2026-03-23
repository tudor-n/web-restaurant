# Backend Development Guide — Beny
**Role:** API Endpoints + Real-time Layer · **Stack:** C# ASP.NET Core 8 · **DB:** PostgreSQL (UUIDs)

---

## 1. Your Ownership at a Glance

You own the **customer-facing endpoints, order lifecycle, flash deal system, and all real-time SignalR events**. You depend on Tudor's Models and AppDbContext being ready before you start — coordinate with him first.

### C# Side

| File | Responsibility |
|---|---|
| `Controllers/MenuController.cs` | `GET /api/menu`, `GET /api/menu/{categoryId}` |
| `Controllers/CustomerController.cs` | Table session, order, and flash deal claim endpoints |
| Order logic (inline or `OrderService`) | Create order, patch items, compute `total_amount` on submit |
| `Services/FlashDealService.cs` | Full lifecycle: eligibility check, status transitions, expiry timer |
| `Models/FlashDealOffer.cs` + DTOs | Flash deal model and request/response shapes |
| `Hubs/CustomerHub.cs` | `FlashDealAvailable`, `FlashDealExpired` events |
| `Hubs/StaffHub.cs` | `FlashDealClaimed` event |
| `Controllers/AdminController.cs` | Metrics + flash deal management endpoints only (see below) |

> **Note:** Tudor owns `Program.cs`, all Models, `AppDbContext`, migrations, seed data, `RecommendationService`, `SimilarityService`, and the AI directive admin endpoints. Don't touch those files.

---

## 2. Architecture Overview

```
frontend-customer  ──HTTP/WS──►  RestaurantApi (C# ASP.NET Core 8)  ──HTTP──►  ai-service (Python FastAPI)
frontend-admin     ──HTTP──────►  RestaurantApi                      ──SQL───►  PostgreSQL
```

- **`backend/RestaurantApi/`** — main API: all REST endpoints + SignalR WebSocket hubs
- The C# API calls Tudor's Python service internally for AI/recommendation endpoints. You consume `RecommendationService` — you don't implement it.

---

## 3. File Layout (Your Files Highlighted)

```
backend/RestaurantApi/
├── Program.cs                  ← Tudor's (DI, middleware, SignalR, Swagger)
├── Controllers/
│   ├── CustomerController.cs   ← YOURS
│   ├── MenuController.cs       ← YOURS
│   └── AdminController.cs      ← shared (your part = metrics + flash deals)
├── Models/                     ← Tudor's — use, don't modify
├── DTOs/
│   ├── Requests/               ← add your DTOs here
│   └── Responses/              ← add your DTOs here
├── Services/
│   ├── RecommendationService.cs    ← Tudor's (inject and call, don't edit)
│   ├── FlashDealService.cs         ← YOURS
│   └── SimilarityService.cs        ← Tudor's
├── Hubs/
│   ├── CustomerHub.cs              ← YOURS
│   └── StaffHub.cs                 ← YOURS
├── Data/
│   └── AppDbContext.cs             ← Tudor's (inject via DI)
└── Migrations/                     ← Tudor's
```

---

## 4. Your Endpoints

### MenuController — `GET /api/menu`, `GET /api/menu/{categoryId}`

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/menu` | List all products grouped by category |
| GET | `/api/menu/{categoryId}` | Filter products by a specific category |

Return products with `is_available = true` only. Group by category with `sort_order` applied.

---

### CustomerController — Table Session, Orders, Flash Deals

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/tables/{qrToken}/session` | Validate QR token, return or create active order |
| POST | `/api/orders` | Create order `{ tableId, items: [{ productId, quantity }] }` |
| PATCH | `/api/orders/{id}/items` | Add/remove items from an open order |
| POST | `/api/orders/{id}/submit` | Finalize order → set `status = "submitted"`, compute `total_amount` |
| GET | `/api/orders/{id}/recommendations` | Return AI-powered suggestions (via injected `RecommendationService`) |
| POST | `/api/orders/{id}/claim-deal` | Claim a flash deal → create OrderItem with `IsFlashDealItem = true` |

**Key logic notes:**
- `GET /api/tables/{qrToken}/session` — look up table by `qr_token`, find any order with `status = "draft"` for that table, or create a new one
- `POST /api/orders/{id}/submit` — set `status = "submitted"`, sum `unit_price_at_purchase * quantity` across items for `total_amount`, then trigger `FlashDealService` eligibility check
- `GET /api/orders/{id}/recommendations` — call `RecommendationService.GetRecommendationsAsync(orderId)` and return the result directly

---

### AdminController — Metrics + Flash Deal Management (your part)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/metrics` | Flash deals shown/claimed counts, upsell revenue |
| GET | `/api/admin/flash-deals` | List all flash deal offers with status |
| POST | `/api/admin/flash-deals/trigger` | Manually trigger a flash deal for testing |

> The AI directive endpoints on `AdminController` (`/api/admin/directives`, `/api/admin/similarity-rules`) are **Tudor's**.

---

## 5. FlashDealService — Full Lifecycle

### Flow

```
Order submitted
    │
    ▼
FlashDealService.EvaluateEligibility(orderId)
    │
    ├─ Not eligible → nothing
    │
    └─ Eligible
           │
           ▼
       Insert FlashDealOffer row  { Status = "pending", ExpiresAt = now + window }
           │
           ▼
       Emit FlashDealAvailable via CustomerHub
           │
       ┌───┴─────────────────────┐
       │                         │
    Claimed                   Expired (background timer)
       │                         │
       ▼                         ▼
Update Status = "claimed"    Update Status = "expired"
Create OrderItem             Emit FlashDealExpired via CustomerHub
  (IsFlashDealItem = true)
Emit FlashDealClaimed
  via StaffHub
```

### Responsibilities

- **Eligibility check** — evaluate timing, product combos, table history
- **Status transitions** — `pending` → `claimed` or `pending` → `expired`
- **Expiry timer** — use a background service or `CancellationTokenSource` per deal
- **Emit events** — inject `IHubContext<CustomerHub>` and `IHubContext<StaffHub>` into the service

---

## 6. SignalR Hubs

### CustomerHub (`/hubs/customer`)

| Event | Direction | Payload |
|---|---|---|
| `FlashDealAvailable` | Server → Client | `{ DealId, Product, DiscountPrice, ExpiresAt }` |
| `FlashDealExpired` | Server → Client | `{ DealId }` |

```csharp
// Example emit from FlashDealService
await _customerHubContext.Clients.Group(tableId.ToString())
    .SendAsync("FlashDealAvailable", new { DealId, Product, DiscountPrice, ExpiresAt });
```

### StaffHub (`/hubs/staff`)

| Event | Direction | Payload |
|---|---|---|
| `FlashDealClaimed` | Server → Kitchen | `{ OrderId, Product, TableNumber, Quantity }` |

```csharp
// Example emit from FlashDealService
await _staffHubContext.Clients.All
    .SendAsync("FlashDealClaimed", new { OrderId, Product, TableNumber, Quantity });
```

> Hub route registration in `Program.cs` is Tudor's — just make sure `/hubs/customer` and `/hubs/staff` are mapped.

---

## 7. Key Types You'll Use (from Tudor)

### Status Enums — Agree on these before writing any order logic

| Field | Allowed Values |
|---|---|
| `Orders.status` | `draft`, `submitted`, `preparing`, `ready`, `completed`, `cancelled` |
| `Orders.payment_status` | `unpaid`, `paid`, `refunded` |
| `FlashDealOffers.status` | `pending`, `claimed`, `expired` |

### RecommendationResponse (from Tudor's shared DTO)

```csharp
// DTOs/Responses/RecommendationResponse.cs  (Tudor owns this)
public record RecommendationResponse(
    string ProductId,
    string Reason,       // "pairing" | "upsell" | "flash_deal"
    double Confidence    // 0.0 – 1.0
);
```

Just return this directly from `GET /api/orders/{id}/recommendations`.

---

## 8. Setup Checklist

> Run these **after** Tudor has finished migrations and seed data.

1. **Pull latest** — make sure Models + DbContext + migrations are merged from Tudor
2. **Run DB update** — `dotnet ef database update` (if not already done)
3. **Environment** (`appsettings.Development.json`) — confirm this exists (Tudor sets it up):
   ```json
   {
     "ConnectionStrings": { "Default": "Host=localhost;Database=restaurant;Username=...;Password=..." },
     "AiService": { "BaseUrl": "http://localhost:8000" },
     "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"]
   }
   ```
4. **C# API** — `cd backend/RestaurantApi && dotnet run` (default port 5000/5001)
5. **Test SignalR** — connect to `/hubs/customer` and `/hubs/staff` from a browser client or Postman

> **Priority order:** MenuController → CustomerController (session + create/submit order) → CustomerHub → FlashDealService → StaffHub → AdminController (metrics + flash deals).
