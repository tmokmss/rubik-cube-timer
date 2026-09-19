# キューブ区間タイマー

ルービックキューブ(CFOP)の区間タイムを測る個人用の Web アプリ。

**https://tmokmss.github.io/rubik-cube-timer/**

- Space(または画面タップ)を押して離すとスタート。押すたびに Cross / F2L / OLL / PLL を刻む
- 記録はブラウザの localStorage に残る。JSON / CSV で持ち出して別の端末に移せる
- 目標は 60 / 45 / 30 秒から選ぶ。区間ごとの目安と推移グラフがそれに追従する
- 推移は「合計」と「区間の内訳」で見られる。内訳は積み上げなので、
  どの区間が縮んで合計が縮んだのかが分かる
- ホーム画面に追加すると全画面で開き、オフラインでも動く。練習中は画面が消えない
- 「同期」を押すと自分の Google Drive 経由でスマホと PC の記録が揃う
  (アプリ専用フォルダのみ。他の Drive ファイルには触らない)

## 開発

```bash
pnpm install
pnpm dev      # http://localhost:5173/rubik-cube-timer/
pnpm test
pnpm build
```

Svelte 5 + Vite + TypeScript。`main` に push すると GitHub Actions が Pages に出す。
設計と仕様のメモは [CLAUDE.md](./CLAUDE.md) にある。
