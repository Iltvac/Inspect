import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Относительные пути: сайт работает и в подпапке GitHub Pages (/car-inspect/), и внутри APK
  base: './',
  plugins: [
    react(),
    // Делает сайт устанавливаемым на телефон как приложение
    VitePWA({
      // В APK service worker не нужен: файлы и так лежат внутри приложения
      disable: process.env.BUILD_TARGET === 'android',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Автоподбор: осмотры и отчёты',
        short_name: 'Автоподбор',
        lang: 'ru',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
