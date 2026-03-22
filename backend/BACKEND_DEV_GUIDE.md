# Backend Development Guide

**Team:** 2 Backend Developers · **Stack:** Node.js + TypeScript (Express/Fastify) · **DB:** PostgreSQL (UUIDs)

---

## 1. Database Schema

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
- `AI_Directives` is standalone (admin config store)
- `Tables` links to `Orders` via `table_id`

---

## 2. Ownership Split

### Dev 1 — Customer Flow + Orders

**Files:** `controllers/customer.ts`, `models/Product.ts`, `models/Order.ts`, `models/OrderItem.ts`, `services/recommendation.ts`, `websockets/customer-ws.ts`

**Endpoints to build:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/menu` | List products grouped by category (join Products + Categories) |
| GET | `/api/menu/:categoryId` | Filter products by category |
| GET | `/api/tables/:qrToken/session` | Validate QR token, return or create active order for that table |
| POST | `/api/orders` | Create order `{ table_id, items: [{ product_id, quantity }] }` |
| PATCH | `/api/orders/:id/items` | Add/remove items from an open order |
| POST | `/api/orders/:id/submit` | Finalize order → set `status = 'submitted'`, compute `total_amount` |
| GET | `/api/orders/:id/recommendations` | Return AI-powered suggestions based on current cart context |
| POST | `/api/orders/:id/claim-deal` | Claim a flash deal → create OrderItem with `is_flash_deal_item = true` |

**WebSocket events (customer-ws.ts):**

| Event | Direction | Payload |
|---|---|---|
| `flash_deal_available` | Server → Client | `{ deal_id, product, discount_price, expires_at }` |
| `flash_deal_expired` | Server → Client | `{ deal_id }` |

### Dev 2 — Admin + AI Engine + Flash Deals

**Files:** `controllers/admin.ts`, `models/AIDirective.ts`, `models/FlashDealOffer.ts`, `services/flash-deal.ts`, `services/similarity.ts`, `websockets/staff-ws.ts`

**Endpoints to build:**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/directives` | List AI directives (latest active) |
| POST | `/api/admin/directives` | Save new directive `{ raw_prompt }` → parse into `parsed_rules` (jsonb) |
| PATCH | `/api/admin/directives/:id` | Toggle `is_active` |
| GET | `/api/admin/similarity-rules` | Get auto-generated + manual pairing rules |
| POST | `/api/admin/similarity-rules` | Add/edit manual pairing rule |
| GET | `/api/admin/metrics` | Return: flash deals shown/claimed counts, upsell revenue from `was_ai_recommended` items |
| GET | `/api/admin/flash-deals` | List all flash deal offers with status |
| POST | `/api/admin/flash-deals/trigger` | Manually trigger a flash deal for testing |

**WebSocket events (staff-ws.ts):**

| Event | Direction | Payload |
|---|---|---|
| `flash_deal_claimed` | Server → Kitchen | `{ order_id, product, table_number, quantity }` |

**Flash deal lifecycle:**
1. Order submitted → `flash-deal.ts` evaluates eligibility (timing, product combos)
2. Create `FlashDealOffers` row with `status = 'pending'`, set `expires_at`
3. Emit `flash_deal_available` via customer WebSocket
4. On claim → update `status = 'claimed'`, create OrderItem, emit `flash_deal_claimed` to staff
5. On expiry (timer/cron) → update `status = 'expired'`, emit `flash_deal_expired`

---

## 3. Shared Types Contract (both devs reference `/shared/types/`)

```typescript
// models.ts
interface RecommendationContext {
  cart_items: { product_id: string; quantity: number }[];
  table_id: string;
  order_history?: string[];  // previous order IDs for this table
}

interface FlashDeal {
  id: string;
  order_id: string;
  product_id: string;
  discount_price: number;
  expires_at: string;       // ISO timestamp
  status: 'pending' | 'claimed' | 'expired';
}

interface AdminAIConfig {
  id: string;
  raw_prompt: string;
  parsed_rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
}
```

---

## 4. Setup Checklist

1. **DB migration** — Create all 7 tables with proper FK constraints and indexes on foreign keys
2. **Seed data** — Categories + Products (at least 15-20 items across 4-5 categories), 3-4 Tables with QR tokens
3. **Environment** — `DATABASE_URL`, `WS_PORT`, `CORS_ORIGINS` (allow both frontend ports)
4. **WebSocket server** — Initialize alongside HTTP server, namespace by role (`/customer`, `/staff`)
5. **Shared types** — Both devs import from `../../shared/types/` for request/response contracts

---

## 5. Status Enums (agree on these upfront)

| Field | Allowed Values |
|---|---|
| `Orders.status` | `draft`, `submitted`, `preparing`, `ready`, `completed`, `cancelled` |
| `Orders.payment_status` | `unpaid`, `paid`, `refunded` |
| `FlashDealOffers.status` | `pending`, `claimed`, `expired` |
