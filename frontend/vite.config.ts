import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config de Vite dedicada a Tauri (la config de electron-vite sigue viva en
// electron.vite.config.ts mientras exista la app Electron).
export default defineConfig({
  root: 'src/renderer',
  base: './',
  publicDir: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist-tauri'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
