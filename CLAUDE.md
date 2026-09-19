# キューブ区間タイマー

ルービックキューブ(CFOP)の区間タイムを測る個人用Webアプリ。GitHub Pagesで静的ホストする。

- 公開先: https://tmokmss.github.io/rubik-cube-timer/
- Svelte 5 (runes) + Vite + TypeScript。`main` に push すると GitHub Actions がビルドして Pages に出す

## 構成の考え方

ロジックは `src/lib/core/` に UI 非依存の素の TS として置き、vitest で固める。
Svelte コンポーネントは表示と入力だけを持つ。フレームワークを替えることになっても
`core/` はそのまま持っていける。

```
src/
  main.ts                エントリ
  App.svelte             配線。キー入力とフォーカスの面倒はここで見る
  app.css                全部グローバル(理由は下記)
  lib/
    state.svelte.ts      記録・モード・目標の保持と localStorage への書き戻し
    timer.svelte.ts      計測の状態機械
    wakelock.svelte.ts   練習中に画面を消させない
    pwa.svelte.ts        Service Worker の更新通知
    core/                UI 非依存。ここだけテストがある
      types.ts           型、区間の定義、目標の比例配分
      format.ts          時間の表示
      stats.ts           ao5 / ao12 / 区間平均
      scramble.ts        スクランブル生成
      storage.ts         localStorage の読み書き
      io.ts              JSON / CSV の書き出しと取り込み
      keys.ts            Space をどこで拾うかの判定
    components/          表示のみ
```

CSS をコンポーネントに閉じずグローバルに置いているのは、区間の色を
`[data-stage="F2L"] { --c: var(--green) }` のように CSS 変数で親から子へ渡しているため。
Svelte のスコープ付き CSS だとこの継承が切れる。

## 操作仕様

- Space(または画面タップ)を押して離すとスタート。keydownで `armed`、keyupで計測開始
- 計測中はSpace / 画面のどこでもタップで次の区間へ。最後の区間で押すとストップして自動保存
- Escで計測中止(保存しない)。文字入力中のEscは入力欄から抜けてタイマーに戻る
- キーリピート(`e.repeat`)は無視。ストップ時のkeyupで次の計測が始まらないこと(`armed` はidle時のkeydownでしか立たない)
- モード: `4` = Cross/F2L/OLL/PLL、`3` = Cross/F2L/LL、`1` = 合計のみ。計測中は切り替え不可

### Space の効き(フォーカス)

**ここは何度か壊れているので触るときは注意。** 守りたい性質は1つだけ:

> 文字入力中だけ Space を譲る。それ以外では、どこにフォーカスがあっても必ずタイマーが取る。

そのために `App.svelte` で:

1. キーは `window` で拾い、`isTextEntry(e.target)` のときだけ何もせず返す
   (`keys.ts`。`readonly` の textarea も文字入力扱い)
2. それ以外は `preventDefault()` してから `restoreFocus(padEl)` でフォーカスをタイマーに戻す。
   これをしないと、押した直後のボタンにフォーカスが残り、Space がそのボタンの click も撃つ
3. ボタンや summary を押した後も `onclick` でフォーカスをタイマーに戻す
4. 戻すときは `focus({ preventScroll: true })`。画面下の「削除」を押した直後にページ先頭へ飛ばさない
5. 計測中は透明な膜(`.tap-guard`)で画面全体を覆う。画面のどこを叩いても区間が刻まれ、
   下のボタンには届かない

タイマーパッドの `tabindex` は `-1`。Tab順には入れず、プログラムからのフォーカス置き場としてだけ使う。

## PWA

ホーム画面に置いて全画面で使えるようにしてある。オフラインでも起動する
(本体はプリキャッシュ、Google Fonts は実行時キャッシュ)。

アイコンは `public/` の PNG。`scripts` は用意していないので、作り直すときは
元の `favicon.svg` と同じ配色(Cross青 / F2L緑 / OLL黄 / PLL赤)で書き出す。
透過ではなく全面塗りにしてある(角が白く残る事故を避けるため)。

### 更新の扱い(触るときは注意)

`registerType` は **`prompt`**。自動更新にすると新版の配信時にページがリロードされ、
**計測中だとその記録が飛ぶ**。なので通知バーを出して、反映のタイミングは利用者に委ねる。
通知バーの「更新する」は計測中は押せない。

workbox の `clientsClaim: true` は必須。`prompt` は `skipWaiting: false` なので、
これが無いと新しい Service Worker を有効化しても既存ページの主導権を取らず、
`controlling` が発火せずリロードが起きない。つまり
**「更新する」を押しても無言で何も起こらなくなる**。
`pwa.svelte.ts` 側にも保険のリロードを置いてある。

## 画面スリープ防止

`wakelock.svelte.ts`。Space / タップのたびに取り直し、**無操作が5分続いたら自分から手放す**。
掴みっぱなしだと机に置いたままのときに電池を食い続けるため。
タブが隠れると OS 側で解除されるので、`visibilitychange` で取り直している。
対応していない環境や、電池残量が少なくて断られた場合は黙って諦める。

## データ

localStorage キー: `cube-split-timer:v1`

```json
{
  "mode": "4",
  "goalMs": 30000,
  "solves": [
    {
      "id": "lx3k9a",
      "at": "2026-09-19T10:00:00.000Z",
      "total": 58230,
      "splits": [{ "name": "Cross", "ms": 5200 }, { "name": "F2L", "ms": 31000 }],
      "scramble": "R U2 F' ..."
    }
  ]
}
```

- 時間はすべてミリ秒の整数。`solves` は時系列順(古い順)
- `splits` が空配列の記録は合計のみ
- **記録は各自の localStorage にしか無い。初期値は空で、アプリ側に記録を埋め込まない**
  (以前は過去のスプレッドシート分9件を初回に流し込んでいたが、他の人が開いても見えてしまうので外した)
- LLの値は、`LL` がなければ `OLL + PLL` で代用する(`stageMs`)
- 既定値を持つ項目の追加は後方互換なのでキーは据え置く(`goalMs` はこれで足した)。
  既存データが読めなくなる変更をするときだけ `v2` にして `storage.ts` に移行処理を書く

### 持ち出しと取り込み

- JSON(`{ app, version, exportedAt, solves }`)と CSV の両方で書き出し / 取り込みができる
- 取り込みは追加で、置き換えではない。`日時 + 合計` が同じ記録は飛ばすので、同じファイルを
  二度取り込んでも増えない。CSV は `id` を持たないのでこの判定に頼っている
- CSV で `OLL` と `PLL` が揃っている行は `LL` 列を捨てる(`stageMs` が合成するため)

## 集計

- ao5 / ao12: 直近N回から最速と最遅を1つずつ除いた平均
- 区間平均: 区間つき記録の直近12回
- 目標は 60 / 45 / 30 秒から選ぶ。区間ごとの目安は30秒基準(Cross 4 / F2L 16 / OLL 5 / PLL 5)を
  比例配分する。`Cross + F2L + OLL + PLL` は必ず目標と一致する
- 推移グラフは2種類ある(パネル右上で切り替え)
  - **合計**: 1回ごとのタイムと ao5。対数軸、直近60回、選んだ目標に破線
  - **区間の内訳**: 区間ごとの積み上げ面グラフ(`stageTrend`)。こちらは線形軸
    (積み上げなので対数だと意味が壊れる)。帯の厚みがその区間の時間で、
    薄くなっていればその区間が縮んでいる。生の値は跳ねるので直近5回の移動平均にしている。
    指定した区間が全部そろっている記録だけを使う(欠けると積み上げの合計が狂うため)
  - 区間グラフの目標線は帯の上に重なるので、下地を敷いて色に埋もれないようにしてある

## デザイン

- 区間の色はキューブのステッカー色: Cross青 / F2L緑 / OLL黄 / PLL赤 / LLオレンジ
- 数字は Saira Semi Condensed(tabular-nums)、本文は Zen Kaku Gothic New
- ライト/ダーク両対応。色は `:root` のCSS変数で定義。ダークで反転する文言を書かない
  (「黒い線が目標」ではなく「縦線が目標」)

## 開発

```bash
pnpm install
pnpm dev      # http://localhost:5173/rubik-cube-timer/
pnpm test     # vitest (core のみ)
pnpm check    # svelte-check
pnpm build    # check してから vite build
pnpm preview
```

`base` は `/rubik-cube-timer/` 固定。dev でも同じパスにしてあるので、パス依存の取りこぼしに
ローカルで気づける。

## やりたいこと(未実装)

- セッション区切り(「今日の ao12」を全期間と分けて見る)
- インスペクション15秒のカウントダウン
- +2 / DNF
- 履歴の表示上限(今は新しい方から200件で打ち止め)
- 目標の自由入力(今は 60 / 45 / 30 の3択)
- 区間目標の配分を比例ではなく実際の分布に寄せる(速くなるほど F2L の比率は下がる)

直前の記録を1タップで取り消す案は見送った。画面全体がタップ領域なので、
取り消しボタン自体を誤爆する危険の方が大きいため。削除は履歴側から行う。
