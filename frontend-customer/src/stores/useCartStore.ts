import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@shared/types/models'

export interface CartItem extends Product {
  quantity: number
}


export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

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

  return { items, total , addItem , removeItem , clearCart}
})



