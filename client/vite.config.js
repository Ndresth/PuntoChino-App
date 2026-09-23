import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, /api va al servidor Express local
    proxy: { '/api': 'http://localhost:3000' }
  }
})
