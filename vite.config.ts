import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages はリポジトリ名のサブパスで配信される。
// dev / preview も同じパスにしておくと、パス依存の取りこぼしに気づける。
const base = '/rubik-cube-timer/';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      // 自動更新にすると新版の配信時にページがリロードされる。
      // 計測中にそれをやられると記録が飛ぶので、通知だけ出して反映は手動にする。
      registerType: 'prompt',
      // 登録は src/lib/pwa.svelte.ts で自前でやる
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'キューブ区間タイマー',
        short_name: '区間タイマー',
        description: 'ルービックキューブ(CFOP)の区間タイムを測るタイマー。',
        lang: 'ja',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#E6E9ED',
        theme_color: '#14161A',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // skipWaiting は false のまま(勝手に入れ替えない)。
        // ただし有効化したときは既存ページの主導権を取らせる。これが無いと
        // 「更新する」を押しても controlling が発火せずリロードが起きない。
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 本体は全部プリキャッシュ済み。オフラインでどのパスに来ても index を返す。
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
