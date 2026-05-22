import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose to LAN
    port: 3000,      // Vite dev server port
    strictPort: true, // Error if 3000 is occupied
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Backend server
        changeOrigin: true,
        secure: false,   // Allow HTTPS to HTTP
        ws: true,        // Proxy websockets
      },
    },
  },
})

