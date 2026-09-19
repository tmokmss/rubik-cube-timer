import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // GitHub Pages はリポジトリ名のサブパスで配信される。
  // dev / preview も同じパスにしておくと、パス依存の取りこぼしに気づける。
  base: '/rubik-cube-timer/',
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
