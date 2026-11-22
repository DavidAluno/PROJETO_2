import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BarberConnect',
        short_name: 'BarberConnect',
        description: 'Encontre, compare e agende serviços em barbearias.',
        theme_color: '#d9ff3f',
        background_color: '#10110d',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    }),
  ],
})
