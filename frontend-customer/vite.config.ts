import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    '@shared': fileURLToPath(new URL('../shared', import.meta.url))
    }
  },
  server: {
    port: 3000, // Portul cerut în ghid pentru aplicația client
    strictPort: true
  }
})
