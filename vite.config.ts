import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base relativa: funciona igual en GitHub Pages (/BEDO/) y en local
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true },
})
