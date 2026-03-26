import { ref, onMounted, onUnmounted} from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { useFlashDealStore } from '@/stores/useFlashDealStore'
import type { FlashDeal } from '@shared/types/models'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/hubs/customer'


export function useWebSocket(){
  const sessionStore = useSessionStore()
  const flashDealStore = useFlashDealStore()
  const isConnected = ref(false)
  let socket: WebSocket | null = null

  function connect() {
    if(!sessionStore.tableId || socket) return

    socket = new WebSocket(`${WS_URL}?token=${sessionStore.qrToken}`)

    socket.onopen = () => {
      console.log('Conexiune WebSocket stabilită!')
      isConnected.value = true
    }

    socket.onmessage = (event) => {
      try{
        const data = JSON.parse(event.data)

        if(data.type === 'flash_deal_available'){
          const newDeal = data.payload as FlashDeal
          flashDealStore.setActiveDeal(newDeal)
        }

        if(data.type === 'flash_deal_expired'){
          flashDealStore.clearDeal()
        }
      }catch(error){
        console.error('Eroare la parsarea mesajului WebSocket:', error)
      }
    }

    socket.onclose = () => {
      console.log('Conexiune WebSocket închisă.')
      isConnected.value = false
      socket = null


      setTimeout(connect, 5000)
    }

    socket.onerror = (error) => {
      console.error('Eroare WebSocket:', error)
    }

  }
  function disconnect() {
    if (socket) {
      socket.close()
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return { isConnected}

}
