import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { assetCachePlugin } from './scripts/asset-cache-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), assetCachePlugin()],
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
})
