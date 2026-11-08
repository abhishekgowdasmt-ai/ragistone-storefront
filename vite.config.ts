import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two pages: the public homepage and the private admin area at /admin/
      input: {
        main: 'index.html',
        admin: 'admin/index.html',
      },
    },
  },
})
