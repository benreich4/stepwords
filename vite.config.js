import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'stepwords.xyz',      // ✅ add your custom domain here
      'www.stepwords.xyz'   // optional if you want the www version too
    ]
  }
})
