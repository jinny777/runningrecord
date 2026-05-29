import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/runningrecord/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    global: 'globalThis',
  },
})
