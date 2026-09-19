# キューブ区間タイマー

ルービックキューブ(CFOP)の区間タイムを測る個人用の Web アプリ。

**https://tmokmss.github.io/rubik-cube-timer/**

- Space(または画面タップ)を押して離すとスタート。押すたびに Cross / F2L / OLL / PLL を刻む
- 記録はブラウザの localStorage に残る。JSON / CSV で持ち出して別の端末に移せる
- 目標は 60 / 45 / 30 秒から選ぶ。区間ごとの目安と推移グラフがそれに追従する

## 開発

```bash
pnpm install
pnpm dev      # http://localhost:5173/rubik-cube-timer/
pnpm test
pnpm build
```

Svelte 5 + Vite + TypeScript。`main` に push すると GitHub Actions が Pages に出す。
設計と仕様のメモは [CLAUDE.md](./CLAUDE.md) にある。
