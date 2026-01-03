import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react()],
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
