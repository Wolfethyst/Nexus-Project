import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    build: {
      target: 'ES2020',
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(env.VITE_API_BASE || '/api'),
      'import.meta.env.VITE_STREAM_HLS_URL': JSON.stringify(
        env.VITE_STREAM_HLS_URL ||
          'https://customer-gc5hjo8ti1eiebgs.cloudflarestream.com/c6f83f068cf1847b267b41c4689c85a1/manifest/video.m3u8?protocol=llhlsbeta'
      ),
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
