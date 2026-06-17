import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '单词本',
        short_name: '单词本',
        description: '个人单词记忆工具',
        theme_color: '#4f46e5',
        background_color: '#f9fafb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ],
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      // 开发模式下也生成 SW，便于在真机上测试 PWA
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    // 允许局域网设备访问（真机测试）
    host: true,
    port: 5173
  }
})
