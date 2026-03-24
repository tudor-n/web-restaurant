<script setup lang="ts">

import { ref, onMounted} from 'vue'
import { apiClient } from '@/services/api-client'
import { useCartStore } from '@/stores/useCartStore'
import type { Category, Product } from '@shared/types/models'

const cartStore = useCartStore()


const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)


const getProductsByCategory = (categoryId: string) => {
  return products.value.filter(p => p.category_id === categoryId)
}

onMounted(async () => {
  try{
    isLoading.value = true
    const response = await apiClient.getMenu()

   categories.value = response.categories.sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    )
    products.value = response.products
  }catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Eroare necunoscută la încărcarea meniului.'
    }
  } finally {
    isLoading.value = false
  }
})

</script>

<template>
  <div class="menu-list">
    <div v-if="isLoading" class="p-4 text-center text-gray-500">
      Se încarcă meniul...
    </div>

    <div v-else-if="error" class="p-4 text-center text-red-500">
      {{ error }}
    </div>

    <div v-else>
      <section v-for="category in categories" :key="category.id" class="mb-8">
        <h2 class="text-2xl font-bold mb-4 px-4">{{ category.name }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
          <div
            v-for="product in getProductsByCategory(category.id)"
            :key="product.id"
            class="border rounded-lg p-4 flex justify-between items-center shadow-sm"
          >
            <div>
              <h3 class="font-semibold text-lg">{{ product.name }}</h3>
              <p class="text-gray-600 text-sm mb-2">{{ product.description }}</p>
              <span class="font-bold text-brand">{{ product.price }} RON</span>
            </div>

            <button
              @click="cartStore.addItem(product)"
              :disabled="!product.is_available"
              class="bg-brand hover:bg-brand-light text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ product.is_available ? 'Adaugă' : 'Indisponibil' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
