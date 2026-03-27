import type { Recommendation, FlashDeal} from '@shared/types/models';


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
  }


  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}


export const apiClient = {


  // --- Meniu ---
 getMenu: () =>
    fetcher<any[]>('/api/menu'),

  // --- Sesiune / Masă ---
  initSession: (qrToken: string) =>
    fetcher<{ tableId: string; activeOrder: { id: string } }>(`/api/tables/${qrToken}/session`),

  // --- Comenzi ---
 updateCartItems: (orderId: string, items: { productId: string; quantity: number }[]) =>
    fetcher<void>(`/api/orders/${orderId}/items`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  submitOrder: (orderId: string) =>
    fetcher<void>(`/api/orders/${orderId}/submit`, {
      method: 'PATCH',
    }),


  getRecommendations: (orderId: string, cartItemIds: string[]) => {
    const query = new URLSearchParams({ current_item_ids: cartItemIds.join(',') }).toString();


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
