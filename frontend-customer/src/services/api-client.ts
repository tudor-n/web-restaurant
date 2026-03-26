import type {
  MenuResponse,
  SessionResponse,
  SubmitOrderResponse
} from '@shared/types/api-responses'


const USE_MOCKS = true;


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw await res.json().catch(() => ({}))
  return res.json() as Promise<T>
}



export const initSession = async (qrToken: string): Promise<SessionResponse> => {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 300))
    return { table_id: 'masa-5', order_id: 'comanda-123', session_token: 'fake-session-token' }
  }
  return apiFetch<SessionResponse>(`/api/tables/${qrToken}/session`)
}

export const fetchMenu = async (): Promise<MenuResponse> => {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 500))
    return {
      categories: [
        {
          id: 'c1', name: 'Feluri Principale', sort_order: 1,
          products: [
            { id: 'p1', category_id: 'c1', name: 'Ceafă de porc la grătar', description: 'Servită cu cartofi prăjiți', price: 45, image_url: null, is_available: true },
            { id: 'p2', category_id: 'c1', name: 'Șnițel de pui', description: 'Piept de pui crocant', price: 38, image_url: null, is_available: true }
          ]
        },
        {
          id: 'c2', name: 'Băuturi', sort_order: 2,
          products: [
            { id: 'p3', category_id: 'c2', name: 'Limonadă cu mentă', description: '400ml', price: 18, image_url: null, is_available: true },
            { id: 'p4', category_id: 'c2', name: 'Bere Ursus Premium', description: '500ml', price: 12, image_url: null, is_available: false }
          ]
        }
      ]
    }
  }
  return apiFetch<MenuResponse>('/api/menu')
}

export const updateCartItems = async (orderId: string, items: { id: string, quantity: number }[]): Promise<void> => {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 300))
    console.log(`[MOCK] Coș actualizat pentru comanda ${orderId}`, items)
    return
  }
  return apiFetch<void>(`/api/orders/${orderId}/items`, {
    method: 'PATCH',
    body: JSON.stringify(items),
  })
}

export const submitOrder = async (orderId: string): Promise<SubmitOrderResponse> => {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 800))
    console.log(`[MOCK] Comanda ${orderId} a fost trimisă!`)

    return { message: "Comanda trimisă cu succes", order: { id: orderId, status: 'submitted' } as any }
  }
  return apiFetch<SubmitOrderResponse>(`/api/orders/${orderId}/submit`, { method: 'POST' })
}
