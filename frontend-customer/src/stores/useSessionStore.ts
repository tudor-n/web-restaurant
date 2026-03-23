import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSessionStore = defineStore('session' , () => {
  const tableId = ref<string | null>(null)
  const orderId = ref<string | null>(null)
  const qrToken = ref<string | null>(null)

  function setSession(newTableId: string, newOrderId: string, newQrToken?: string){
    tableId.value = newTableId
    orderId.value = newOrderId
    if(newQrToken){
      qrToken.value = newQrToken
    }
  }

  function clearSession() {
    tableId.value = null
    orderId.value = null
    qrToken.value = null
  }

  return { tableId, orderId, qrToken, setSession, clearSession}




})


