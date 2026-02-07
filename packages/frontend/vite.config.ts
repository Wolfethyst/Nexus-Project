import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const envDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');

  // For production, hardcode the API base. The env var fallback can override but defaults to the correct API subdomain
  // This ensures the frontend always calls the correct API in production
  let apiBase = 'https://api.wolfethyst.tv';  // Production default
  if (mode === 'development') {
    apiBase = env.VITE_API_BASE || '/api';
  } else if (env.VITE_API_BASE) {
    // Only override if explicitly set in production
    apiBase = env.VITE_API_BASE;
  }

  const streamUrl = env.VITE_STREAM_HLS_URL || process.env.VITE_STREAM_HLS_URL ||
    'https://customer-gc5hjo8ti1eiebgs.cloudflarestream.com/c6f83f068cf1847b267b41c4689c85a1/manifest/video.m3u8?protocol=llhlsbeta';

  console.log('[Vite] Building for mode:', mode, 'with API_BASE:', apiBase);

  return {
    plugins: [react()],
    build: {
      target: 'ES2020',
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase),
      'import.meta.env.VITE_STREAM_HLS_URL': JSON.stringify(streamUrl),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});
