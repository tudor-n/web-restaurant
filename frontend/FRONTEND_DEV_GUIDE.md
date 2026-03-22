# Frontend Development Guide

**Team:** 2 Frontend Developers · **Stack:** React + TypeScript · **Realtime:** WebSockets (Socket.IO or native)

---

## 1. App Split

| App | Owner | Port | Purpose |
|---|---|---|---|
| `frontend-customer` | **FE Dev 1** | 3000 | Tablet/phone ordering UI scanned via QR at the table |
| `frontend-admin` | **FE Dev 2** | 3001 | Desktop dashboard for restaurant manager/admin |

Both apps import types from `../../shared/types/` and talk to the same backend API.

---

## 2. FE Dev 1 — Customer App (`frontend-customer`)

### Pages & Components

| Component | Purpose | API Dependency |
|---|---|---|
| **OrderingView.tsx** | Main page — menu + cart + recommendations | Entry point, composes everything below |
| **MenuList.tsx** | Displays products grouped by category, filterable | `GET /api/menu` |
| **Cart.tsx** | Shows current order items, quantities, subtotal | `PATCH /api/orders/:id/items`, `POST /api/orders/:id/submit` |
| **RecommendationWidget.tsx** | "You might also like" section based on cart contents | `GET /api/orders/:id/recommendations` |
| **FlashDealBanner.tsx** | Countdown timer banner when a deal is active | WebSocket `flash_deal_available` / `flash_deal_expired` events |

### Hooks

**`useRecommendations.ts`**
- Trigger: fires whenever the cart changes (debounced ~500ms)
- Input: current cart item IDs
- Output: array of recommended products with reason text
- Endpoint: `GET /api/orders/:id/recommendations?cart_items=id1,id2`

**`useWebSockets.ts`**
- Connect on mount using table session token from QR scan
- Listen for `flash_deal_available` → show FlashDealBanner with product info + countdown
- Listen for `flash_deal_expired` → dismiss banner
- On user claim → call `POST /api/orders/:id/claim-deal` then hide banner

### User Flow

```
QR Scan → GET /api/tables/:qrToken/session → receive table_id + order_id
  → Load menu (GET /api/menu)
  → User browses, adds items (PATCH /api/orders/:id/items)
  → RecommendationWidget updates on cart change
  → User submits (POST /api/orders/:id/submit)
  → WebSocket may push a flash deal post-submission
  → User claims or ignores → deal expires via countdown
```

### Key UI States

| State | What to show |
|---|---|
| Empty cart | Menu only, no recommendations |
| Cart has items | Menu + recommendation widget active |
| Order submitted | Confirmation + "your order is being prepared" |
| Flash deal active | Overlay/banner with countdown timer, product image, discount price, claim button |
| Flash deal expired | Banner dismisses, optional "deal expired" toast |

---

## 3. FE Dev 2 — Admin App (`frontend-admin`)

### Pages & Components

| Component | Purpose | API Dependency |
|---|---|---|
| **Dashboard.tsx** | Overview: today's metrics, active deals, recent orders | `GET /api/admin/metrics` |
| **AIConfig.tsx** | Manage AI directives | `GET/POST/PATCH /api/admin/directives` |
| **RulesManagement.tsx** | View and edit similarity/pairing rules | `GET/POST /api/admin/similarity-rules` |
| **DailyPromptInput.tsx** | Textarea for natural-language daily instruction (e.g. "push desserts today") | Part of AIConfig page, `POST /api/admin/directives` |
| **SimilarityRuleTable.tsx** | Table showing auto-generated + manual pairing rules with edit/delete | Part of RulesManagement page |
| **PerformanceMetrics.tsx** | Charts/cards: deals shown vs claimed, upsell revenue, conversion rate | Part of Dashboard |

### Admin Flow

```
Login → Dashboard (metrics overview)
  → AIConfig page: write daily prompt → POST /api/admin/directives
     System parses prompt into structured rules (parsed_rules jsonb)
  → RulesManagement: review auto-generated rules, add manual overrides
  → Dashboard: monitor flash deal performance in real time
```

### Metrics to Display

| Metric | Source |
|---|---|
| Flash deals shown today | Count of `FlashDealOffers` created today |
| Flash deals claimed | Count where `status = 'claimed'` |
| Claim rate | claimed / shown × 100 |
| Upsell revenue | Sum of `unit_price_at_purchase` where `was_ai_recommended = true` |
| Flash deal revenue | Sum of `unit_price_at_purchase` where `is_flash_deal_item = true` |

---

## 4. Shared API Client Pattern (`api-client.ts`)

Both apps use the same pattern — typed wrappers around fetch/axios using shared types:

```typescript
import type { FlashDeal, AdminAIConfig } from '../../shared/types/models';
import type { CreateOrderRequest } from '../../shared/types/api-requests';
import type { MenuResponse, RecommendationsResponse } from '../../shared/types/api-responses';

const BASE_URL = import.meta.env.VITE_API_URL;

// Example: Customer app
export const fetchMenu = (): Promise<MenuResponse> =>
  fetch(`${BASE_URL}/api/menu`).then(r => r.json());

export const submitOrder = (orderId: string): Promise<void> =>
  fetch(`${BASE_URL}/api/orders/${orderId}/submit`, { method: 'POST' }).then(r => r.json());

// Example: Admin app
export const getMetrics = (): Promise<MetricsResponse> =>
  fetch(`${BASE_URL}/api/admin/metrics`).then(r => r.json());

export const postDirective = (prompt: string): Promise<AdminAIConfig> =>
  fetch(`${BASE_URL}/api/admin/directives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_prompt: prompt }),
  }).then(r => r.json());
```

---

## 5. WebSocket Events Reference (FE Dev 1 only)

| Event | Direction | Payload Shape | Action |
|---|---|---|---|
| `flash_deal_available` | Server → Client | `{ deal_id: string, product: Product, discount_price: number, expires_at: string }` | Show FlashDealBanner, start countdown |
| `flash_deal_expired` | Server → Client | `{ deal_id: string }` | Dismiss banner |
| `claim_deal` | Client → Server | `{ deal_id: string, order_id: string }` | User taps claim button |

---

## 6. Coordination Checklist

- [ ] Both devs agree on `VITE_API_URL` and `VITE_WS_URL` env vars
- [ ] Import all request/response types from `/shared/types/` — never duplicate
- [ ] FE Dev 1 coordinates with BE Dev 1 on cart and recommendation API contracts
- [ ] FE Dev 2 coordinates with BE Dev 2 on admin endpoints and metrics shapes
- [ ] Agree on error response format: `{ error: string, code: string, details?: any }`
- [ ] Both apps share auth pattern if admin requires login (cookie/JWT)
