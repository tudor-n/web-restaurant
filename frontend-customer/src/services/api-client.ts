import type { Product, Category, Recommendation, FlashDeal } from '@shared/types/models';


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
  // getMenu: () =>
  //   fetcher<{ categories: Category[]; products: Product[] }>('/api/menu'),

  // --- Meniu ---
  getMenu: async () => {
    // Simulam o mica intarziere de retea (500ms) ca sa vedem starea de "Se incarca..."
    await new Promise(resolve => setTimeout(resolve, 500));

    // Returnam date statice care respecta interfetele Category si Product
    return {
      categories: [
        { id: 'c1', name: 'Feluri Principale', sort_order: 1 },
        { id: 'c2', name: 'Băuturi', sort_order: 2 }
      ],
      products: [
        {
          id: 'p1', category_id: 'c1', name: 'Ceafă de porc la grătar',
          description: 'Servită cu cartofi prăjiți și salată',
          price: 45, image_url: '', is_available: true
        },
        {
          id: 'p2', category_id: 'c1', name: 'Șnițel de pui',
          description: 'Piept de pui crocant, panko',
          price: 38, image_url: '', is_available: true
        },
        {
          id: 'p3', category_id: 'c2', name: 'Limonadă cu mentă',
          description: 'Lămâie proaspătă, miere, mentă, 400ml',
          price: 18, image_url: '', is_available: true
        },
        {
          id: 'p4', category_id: 'c2', name: 'Bere Ursus Premium',
          description: 'La sticlă, 500ml',
          price: 12, image_url: '', is_available: false // Acesta va avea butonul dezactivat!
        }
      ]
    };
  },

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
