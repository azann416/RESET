import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['reset.svg', 'reset-180.png', 'reset-camo.svg'],
    manifest: {
      id: '/',
      name: 'RESET — Your journey. Your pace.',
      short_name: 'RESET',
      description: 'A welcoming wellbeing companion. Your journey. Your pace.',
      lang: 'en-CA',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#FFF0D9',
      theme_color: '#FFF0D9',
      icons: [
        { src: 'reset-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'reset-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'reset-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      // No third-party caching: external support services require a connection.
      runtimeCaching: [],
    },
    // Test service workers with the production preview, not Vite's dev server.
    devOptions: { enabled: false },
  })],
})
