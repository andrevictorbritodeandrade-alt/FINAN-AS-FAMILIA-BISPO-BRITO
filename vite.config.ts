import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'manifest.json'],
      manifest: {
        name: 'OFICIAL Finanças AI',
        short_name: 'Minhas Finanças',
        description: 'Gestão financeira familiar inteligente',
        theme_color: '#0d9488',
        background_color: '#f0fdfa',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  }
});
