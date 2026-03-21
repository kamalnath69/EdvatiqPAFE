import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  const devProxyTarget = env.VITE_DEV_API_PROXY_TARGET
    || (env.VITE_API_BASE_URL?.startsWith('http') ? env.VITE_API_BASE_URL : '')
    || 'http://localhost:8000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
})
