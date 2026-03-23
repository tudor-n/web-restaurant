import { defineStore } from "pinia"
import { ref } from "vue"
import type { FlashDeal } from "@shared/types/models"

export const useFlashDealStore = defineStore('flashDeal', () => {
  const activeDeal = ref<FlashDeal | null>(null)

  function setDeal(deal: FlashDeal){
    activeDeal.value = deal
  }
  function clearDeal() {
    activeDeal.value = null
  }
  return { activeDeal , setDeal , clearDeal}
})
