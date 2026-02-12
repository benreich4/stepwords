import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'stepwords.xyz',
      'www.stepwords.xyz'
    ],
    // Proxy /api to PHP server for local dev. Run: php -S localhost:8000
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log statements
        drop_debugger: true, // Remove debugger statements
      },
    },
    // Optimize chunk sizes
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Enable gzip compression hints
    reportCompressedSize: true,
  },
})
