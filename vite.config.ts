import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  // 環境変数ファイルの場所を明示的に指定
  envDir: path.resolve(__dirname, '.'),
  envPrefix: 'VITE_',
  server: {
    port: 3000,
    host: '0.0.0.0',
    fs: {
      strict: false
    }
  },
  plugins: [react()],
  // Viteは自動的にVITE_プレフィックスの環境変数をimport.meta.envに注入するため、
  // defineセクションは不要です
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
