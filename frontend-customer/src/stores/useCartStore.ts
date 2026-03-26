import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Product } from '@shared/types/models'
import { updateCartItems } from '@/services/api-client'
import { useSessionStore } from './useSessionStore'

export interface CartItem extends Product {
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const sessionStore = useSessionStore()

  const total = computed(() => {
    return items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  function addItem(product: Product){
    const existingItem = items.value.find((i) => i.id === product.id)
    if(existingItem){
      existingItem.quantity++
    }else{
      items.value.push({ ...product, quantity: 1})
    }
  }

  function removeItem(productId: string) {
    const item = items.value.find((i) => i.id === productId)
    if (item) {
      if (item.quantity > 1) {
        item.quantity--
      } else {
        items.value = items.value.filter((i) => i.id !== productId)
      }
    }
  }

  function clearCart() {
    items.value = []
  }


  watch(items, async (newItems) => {
    if (!sessionStore.orderId) return;

    const payload = newItems.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))

    try {
      await updateCartItems(sessionStore.orderId, payload)
    } catch (error) {
      console.error('Eroare la salvarea coșului pe server:', error)
    }
  }, { deep: true })

  return { items, total, addItem, removeItem, clearCart }
})
