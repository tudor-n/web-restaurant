# Frontend Development Guide

**Team:** 2 Frontend Developers · **Stack:** Vue 3 + TypeScript + Pinia + Vite + TailwindCSS · **Realtime:** WebSockets (native)

---

## 1. App Split

| App | Owner | Port | Purpose |
|---|---|---|---|
| `frontend-customer` | **FE Dev 1** | 3000 | Tablet/phone ordering UI scanned via QR at the table |
| `frontend-admin` | **FE Dev 2** | 3001 | Desktop dashboard for restaurant manager/admin |

Both apps import types from `../../shared/types/` and talk to the same backend API.

---

## 2. Tech Stack Details

| Tool | Version | Purpose |
|---|---|---|
| Vue 3 | ^3.4 | UI framework (Composition API + `<script setup>`) |
| TypeScript | ^5.4 | Type safety |
| Vite | ^5.x | Build tool & dev server |
| Pinia | ^2.x | State management (replaces Vuex) |
| TailwindCSS | ^3.x | Utility-first CSS |
| Vue Router | ^4.x | Client-side routing |

All components use `<script setup lang="ts">` (Composition API). No Options API.

---

## 3. FE Dev 1 — Customer App (`frontend-customer`)

### Views & Components

| Component | Purpose | API Dependency |
|---|---|---|
| **OrderingView.vue** | Main page — menu + cart + recommendations | Entry point, composes everything below |
| **MenuList.vue** | Displays products grouped by category, filterable | `GET /api/menu` |
| **Cart.vue** | Shows current order items, quantities, subtotal | `PATCH /api/orders/:id/items`, `POST /api/orders/:id/submit` |
| **RecommendationWidget.vue** | "You might also like" section based on cart contents | `GET /api/orders/:id/recommendations` |
| **FlashDealBanner.vue** | Countdown timer banner when a deal is active | WebSocket `flash_deal_available` / `flash_deal_expired` events |

### Pinia Stores (`src/stores/`)

**`useCartStore.ts`**
```ts
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const orderId = ref<string | null>(null)

  function addItem(product: Product) { /* ... */ }
  function removeItem(productId: string) { /* ... */ }
  const total = computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0))

  return { items, orderId, addItem, removeItem, total }
})
```

**`useSessionStore.ts`**
- Holds `tableId`, `sessionToken`, `qrToken` from QR scan
- Persisted to `sessionStorage`

**`useFlashDealStore.ts`**
- Holds active `FlashDeal | null`
- Set by WebSocket events, cleared on claim or expiry

### Composables (`src/composables/`)

**`useRecommendations.ts`**
- Trigger: watch on `cartStore.items` (debounced ~500ms via `watchDebounced`)
- Output: `Ref<Recommendation[]>`
- Endpoint: `GET /api/orders/:id/recommendations?cart_items=id1,id2`

**`useWebSocket.ts`**
- Connect on mount using table session token
- Listen for `flash_deal_available` → update `flashDealStore`
- Listen for `flash_deal_expired` → clear `flashDealStore`
- On claim → call `POST /api/orders/:id/claim-deal`, then clear store

### User Flow

```
QR Scan → GET /api/tables/:qrToken/session → receive table_id + order_id
  → sessionStore.set(tableId, orderId)
  → Load menu (GET /api/menu)
  → User browses, adds items → cartStore.addItem() → PATCH /api/orders/:id/items
  → RecommendationWidget watches cartStore.items
  → User submits → POST /api/orders/:id/submit
  → WebSocket may push flash_deal_available
  → User claims or ignores → deal expires via countdown
```

### Key UI States

| State | What to show |
|---|---|
| Empty cart | Menu only, no recommendations |
| Cart has items | Menu + RecommendationWidget active |
| Order submitted | Confirmation + "your order is being prepared" |
| Flash deal active | Overlay/banner with countdown timer, product image, discount price, claim button |
| Flash deal expired | Banner dismisses, optional "deal expired" toast |

---

## 4. FE Dev 2 — Admin App (`frontend-admin`)

### Views & Components

| Component | Purpose | API Dependency |
|---|---|---|
| **DashboardView.vue** | Overview: today's metrics, active deals, recent orders | `GET /api/admin/metrics` |
| **AIConfigView.vue** | Manage AI directives | `GET/POST/PATCH /api/admin/directives` |
| **RulesManagementView.vue** | View and edit similarity/pairing rules | `GET/POST /api/admin/similarity-rules` |
| **DailyPromptInput.vue** | Textarea for natural-language daily instruction | Part of AIConfigView, `POST /api/admin/directives` |
| **SimilarityRuleTable.vue** | Table showing auto-generated + manual pairing rules | Part of RulesManagementView |
| **PerformanceMetrics.vue** | Charts/cards: deals shown vs claimed, upsell revenue | Part of DashboardView |

### Pinia Stores (`src/stores/`)

**`useMetricsStore.ts`**
- Holds today's metrics, fetched on mount, refreshed every 30s

**`useDirectivesStore.ts`**
- Holds list of `AdminAIConfig`, current active directive
- Actions: `fetchDirectives()`, `postDirective(prompt)`, `toggleActive(id)`

**`useSimilarityRulesStore.ts`**
- Holds `SimilarityRule[]`, supports add/delete/auto-generate

### Admin Flow

```
Login → DashboardView (metrics overview)
  → AIConfigView: write daily prompt → POST /api/admin/directives
     System parses prompt into structured rules (parsed_rules jsonb)
  → RulesManagementView: review auto-generated rules, add manual overrides
  → DashboardView: monitor flash deal performance in real time
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

## 5. Shared API Client Pattern (`src/api/client.ts`)

Both apps use the same typed fetch wrapper pattern:

```typescript
import type { FlashDeal, AdminAIConfig } from '../../../../shared/types/models'
import type { CreateOrderRequest } from '../../../../shared/types/api-requests'
import type { MenuResponse, RecommendationsResponse } from '../../../../shared/types/api-responses'

const BASE_URL = import.meta.env.VITE_API_URL

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw await res.json()
  return res.json() as Promise<T>
}

// Customer app
export const fetchMenu = () => apiFetch<MenuResponse>('/api/menu')
export const submitOrder = (orderId: string) =>
  apiFetch<void>(`/api/orders/${orderId}/submit`, { method: 'POST' })

// Admin app
export const getMetrics = () => apiFetch<MetricsResponse>('/api/admin/metrics')
export const postDirective = (prompt: string) =>
  apiFetch<AdminAIConfig>('/api/admin/directives', {
    method: 'POST',
    body: JSON.stringify({ raw_prompt: prompt }),
  })
```

---

## 6. WebSocket Events Reference (FE Dev 1 only)

| Event | Direction | Payload Shape | Action |
|---|---|---|---|
| `flash_deal_available` | Server → Client | `{ deal_id: string, product: Product, discount_price: number, expires_at: string }` | Set `flashDealStore.activeDeal`, start countdown |
| `flash_deal_expired` | Server → Client | `{ deal_id: string }` | Clear `flashDealStore.activeDeal` |
| `claim_deal` | Client → Server | `{ deal_id: string, order_id: string }` | User taps claim button |

---

## 7. TailwindCSS Setup

Each app includes TailwindCSS via PostCSS. The config extends the base theme with restaurant-specific tokens:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E85D04', light: '#F48C06' },
      },
    },
  },
} satisfies Config
```

Import in `src/style.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 8. Coordination Checklist

- [ ] Both devs agree on `VITE_API_URL` and `VITE_WS_URL` env vars
- [ ] Import all request/response types from `/shared/types/` — never duplicate
- [ ] FE Dev 1 coordinates with BE Dev 1 on cart and recommendation API contracts
- [ ] FE Dev 2 coordinates with BE Dev 2 on admin endpoints and metrics shapes
- [ ] Agree on error response format: `{ error: string, code: string, details?: any }`
- [ ] Both apps share auth pattern if admin requires login (cookie/JWT Bearer)
- [ ] Run `npm run type-check` before every PR to catch type errors
