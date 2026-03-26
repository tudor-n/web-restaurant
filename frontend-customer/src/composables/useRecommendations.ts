import { ref , watch } from 'vue'
import { useCartStore } from '@/stores/useCartStore'
import type { Recommendation } from '@shared/types/models'


export function useRecommendations(){
  const cartStore = useCartStore()

  const recommendations = ref<Recommendation[]>([])
  const isLoading = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout>

  watch(
    () => cartStore.items,
    (newItems) => {
      if(newItems.length === 0){
        recommendations.value = []
        return
      }

      clearTimeout(debounceTimer)


      debounceTimer = setTimeout(async () => {
        isLoading.value = true

        try {

          // const response = await apiClient.getRecommendations(sessionStore.orderId, newItems.map(i => i.id))


          await new Promise(resolve => setTimeout(resolve, 400))


          recommendations.value =[
            {
              id: 'rec-1',
              type: 'pairing',
              menu_item: {
                id: 'prod-sos',
                name: 'Sos de usturoi',
                description: 'Ideal pentru preparatele din coșul tău.',
                price: 5,
                image_url: null,
                category_name: 'Sosuri'
              },
              reason: 'Se potrivește perfect cu preparatele la grătar.',
              reason_type: 'pairs_with_order',
              discount: { percent: null, original_price: null, discounted_price: null },
              confidence: 0.95,
              source: 'rule_based'
            },
            {
              id: 'rec-2',
              type: 'upsell',
              menu_item: {
                id: 'prod-limonada',
                name: 'Limonadă Mare (600ml)',
                description: 'Pentru doar 4 lei în plus, primești cu 50% mai mult.',
                price: 22,
                image_url: null,
                category_name: 'Băuturi'
              },
              reason: 'Upgrade recomandat',
              reason_type: 'popular_combo',
              discount: { percent: null, original_price: null, discounted_price: null },
              confidence: 0.88,
              source: 'ai'
            }
          ]
        } catch (error) {
          console.error('Eroare la obținerea recomandărilor:', error)
        } finally {
          isLoading.value = false
        }
      }, 500)
    },
    { deep: true, immediate: true }
  )

  return { recommendations, isLoading }
}
