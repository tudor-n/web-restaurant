<template>
  <div
    v-if="flashDealStore.activeDeal"
    class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg transform transition-transform duration-500 slide-down"
  >
    <div class="container mx-auto p-4 flex flex-col sm:flex-row items-center justify-between gap-4">

      <div class="flex items-center gap-4 flex-1">
        <div class="bg-white text-red-600 font-black rounded-full w-12 h-12 flex items-center justify-center text-xl shrink-0 animate-pulse">
          %
        </div>
        <div>
          <h3 class="font-bold text-lg leading-tight">Oferta Bucătarului!</h3>
          <p class="text-red-100 text-sm">
            Expiră în: <span class="font-mono font-bold text-lg bg-red-700 px-2 py-0.5 rounded">{{ formattedTime }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end bg-red-700 p-2 rounded-lg">
        <div class="text-right">
          <p class="font-bold">Produs Surpriză!</p>
          <p class="font-black text-xl text-yellow-300">{{ flashDealStore.activeDeal.discounted_price }} RON</p>
        </div>
        <button
          @click="claimDeal"
          class="bg-yellow-400 hover:bg-yellow-300 text-red-900 font-bold py-2 px-4 rounded shadow active:scale-95 transition-transform"
        >
          Adaugă la comandă
        </button>
      </div>

      <button @click="closeBanner" class="absolute top-2 right-2 text-red-200 hover:text-white p-1">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useFlashDealStore } from '@/stores/useFlashDealStore'

const flashDealStore = useFlashDealStore()

const timeLeft = ref(0)
let timerInterval: ReturnType<typeof setInterval>

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  const s = (timeLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})


watch(() => flashDealStore.activeDeal, (newDeal) => {
  if (newDeal) {

    const expiresDate = new Date(newDeal.expires_at).getTime()
    const now = new Date().getTime()
    timeLeft.value = Math.max(0, Math.floor((expiresDate - now) / 1000))

    if (timerInterval) clearInterval(timerInterval)


    timerInterval = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        flashDealStore.clearDeal()
        clearInterval(timerInterval)
      }
    }, 1000)
  }
}, { immediate: true })

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const claimDeal = () => {
  alert('Ai revendicat oferta!')
  flashDealStore.clearDeal()
}

const closeBanner = () => {
  flashDealStore.clearDeal()
}
</script>

<style scoped>
.slide-down {
  animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
</style>
