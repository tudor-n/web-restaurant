<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useCartStore } from '@/stores/useCartStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { submitOrder as apiSubmitOrder } from '@/services/api-client'
import RecommendationWidget from './RecommendationWidget.vue'
import type { FlashDeal } from '@shared/types/models'
import { useFlashDealStore } from '@/stores/useFlashDealStore'

const cartStore = useCartStore()
const sessionStore = useSessionStore()
const flashDealStore = useFlashDealStore()

const submitOrder = async () => {
  if (!sessionStore.orderId) {
    return alert('Eroare: Sesiune invalidă.')
  }

  try {
    await apiSubmitOrder(sessionStore.orderId)
    alert(`Comanda în valoare de ${cartStore.total} RON a fost trimisă către bucătărie!`)

    cartStore.clearCart()
  } catch (error) {
    alert('Eroare la trimiterea comenzii!')
    console.error(error)
  }

  const mockDeal = {
    id: 'mock-deal-1',
    order_id: 'comanda-curenta-123',
    menu_item_id: 'produs-papanasi',
    discounted_price: 14,
    expires_at: new Date(Date.now() + 60000).toISOString(),
    status: 'pending'
  } as unknown as FlashDeal

  flashDealStore.setDeal(mockDeal)
}
</script>

<template>
  <div class="cart-container flex flex-col h-full bg-white">


    <div v-if="cartStore.items.length === 0" class="flex-1 p-8 flex flex-col items-center justify-center text-gray-500">
      <span class="text-4xl mb-2">🛒</span>
      <p>Coșul este gol momentan.</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
      <div
        v-for="item in cartStore.items"
        :key="item.id"
        class="flex justify-between items-center border-b pb-4"
      >
        <div class="flex-1 pr-4">
          <h3 class="font-semibold text-gray-800">{{ item.name }}</h3>
          <p class="text-brand font-medium">{{ item.price }} RON</p>
        </div>

        <div class="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
          <button
            @click="cartStore.removeItem(item.id)"
            class="w-8 h-8 flex items-center justify-center text-xl font-bold rounded bg-white shadow-sm text-gray-700 hover:text-brand active:scale-95 transition-transform"
          >
            -
          </button>

          <span class="w-4 text-center font-bold">{{ item.quantity }}</span>

          <button
            @click="cartStore.addItem(item)"
            class="w-8 h-8 flex items-center justify-center text-xl font-bold rounded bg-white shadow-sm text-gray-700 hover:text-brand active:scale-95 transition-transform"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div class="p-4 border-t bg-gray-50">
      <div class="flex justify-between items-center mb-4 text-lg font-bold">
        <span>Total:</span>
        <span class="text-brand">{{ cartStore.total }} RON</span>
      </div>

      <RecommendationWidget v-if="cartStore.items.length > 0" />

      <button
        @click="submitOrder"
        :disabled="cartStore.items.length === 0"
        class="w-full bg-brand text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity active:bg-brand-light"
      >
        Trimite Comanda
      </button>
    </div>
  </div>
</template>
