// src/services/api-client.ts
import type { Product, Category, Recommendation, FlashDeal } from '@shared/types/models';

// Citim URL-ul de bază din variabilele de mediu Vite
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Funcție ajutătoare pentru a face fetch și a extrage automat JSON-ul,
 * aruncând o eroare clară dacă request-ul eșuează.
 */
async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Încercăm să extragem mesajul de eroare din backend, altfel dăm statusul
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
  }

  // Pentru request-urile care returnează 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Obiectul central care expune toate metodele de care are nevoie frontend-ul
export const apiClient = {
  // --- Meniu ---
  getMenu: () =>
    fetcher<{ categories: Category[]; products: Product[] }>('/api/menu'),

  // --- Sesiune / Masă ---
  initSession: (qrToken: string) =>
    fetcher<{ table_id: string; order_id: string }>(`/api/tables/${qrToken}/session`),

  // --- Comenzi ---
  updateCartItems: (orderId: string, items: { product_id: string; quantity: number }[]) =>
    fetcher<void>(`/api/orders/${orderId}/items`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  submitOrder: (orderId: string) =>
    fetcher<{ status: string }>(`/api/orders/${orderId}/submit`, {
      method: 'POST'
    }),

  // --- Recomandări & AI ---
  getRecommendations: (orderId: string, cartItemIds: string[]) => {
    const query = new URLSearchParams({ current_item_ids: cartItemIds.join(',') }).toString();

    // Am adăugat flash_deal: FlashDeal | null aici 👇
    return fetcher<{
      pairings: { items: Recommendation[] };
      upsells: { items: Recommendation[] };
      flash_deal: FlashDeal | null;
    }>(`/api/orders/${orderId}/recommendations?${query}`);
  },

  claimFlashDeal: (orderId: string, dealId: string) =>
    fetcher<void>(`/api/orders/${orderId}/claim-deal`, {
      method: 'POST',
      body: JSON.stringify({ deal_id: dealId }),
    }),
};
