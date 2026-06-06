import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // Main process: electron-vite auto-detects src/main/index.ts
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    // Preload script: electron-vite auto-detects src/preload/index.ts
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    // Renderer: Vite + React. Root is src/renderer/ so /src/main.tsx resolves correctly.
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
})
