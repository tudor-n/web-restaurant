<template>
  <div v-if="recommendations.length > 0" class="mt-6 border-t pt-4">
    <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
      <span class="text-brand">✨</span> S-ar putea să îți placă
      <span v-if="isLoading" class="text-xs text-gray-400 font-normal animate-pulse ml-2">se actualizează...</span>
    </h3>

    <div class="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">

<div
        v-for="item in recommendations"
        :key="item.id"
        class="min-w-[200px] flex-shrink-0 bg-white border border-gray-100 rounded-lg p-3 shadow-sm snap-start"
      >
        <div
          :class="item.type === 'pairing' ? 'text-brand bg-orange-50' : 'text-blue-600 bg-blue-50'"
          class="text-xs font-semibold inline-block px-2 py-1 rounded mb-2"
        >
          {{ item.type === 'pairing' ? 'Se potrivește perfect' : 'Upgrade recomandat' }}
        </div>

        <h4 class="font-bold">{{ item.menu_item.name }}</h4>
        <p class="text-xs text-gray-500 my-1 italic">{{ item.menu_item.description }}</p>

        <div class="flex justify-between items-center mt-3">
          <span class="font-bold">{{ item.menu_item.price }} RON</span>
          <button class="bg-black text-white text-xs px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors">
            Adaugă
          </button>
        </div>
      </div>

    </div>
  </div>
</template>



<script setup lang="ts">
import { useRecommendations } from '@/composables/useRecommendations';

const { recommendations, isLoading } = useRecommendations()

</script>


<style scoped>
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
