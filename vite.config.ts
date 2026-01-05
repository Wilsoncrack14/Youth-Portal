import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/bible': {
          target: 'https://rest.api.bible/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bible/, ''),
          secure: false, // Sometimes helpful for dev
        }
      }
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Youth Portal',
          short_name: 'YouthPortal',
          description: 'Plataforma de Crecimiento Espiritual',
          theme_color: '#1a1b26',
          background_color: '#1a1b26',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }: { url: URL }) => url.origin.includes('supabase.co'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      // Define other static env vars here if absolutely needed, but avoid secrets
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
