<script lang="ts">
  import { onMount } from 'svelte';
  import History from './lib/components/History.svelte';
  import StageTable from './lib/components/StageTable.svelte';
  import StatsBar from './lib/components/StatsBar.svelte';
  import SyncPanel from './lib/components/SyncPanel.svelte';
  import TrendPanel from './lib/components/TrendPanel.svelte';
  import TimerPad from './lib/components/TimerPad.svelte';
  import { isTextEntry, restoreFocus } from './lib/core/keys';
  import type { GoalMs, Mode } from './lib/core/types';
  import { driveSync } from './lib/drive.svelte';
  import { pwa } from './lib/pwa.svelte';
  import { app } from './lib/state.svelte';
  import { Timer, type FinishedSolve } from './lib/timer.svelte';
  import { ScreenWakeLock } from './lib/wakelock.svelte';

  app.load();

  let padEl = $state<HTMLElement | null>(null);
  /** 文字入力欄にフォーカスがあるか。ヒント文言の出し分けに使う。 */
  let typing = $state(false);

  const timer = new Timer(
    () => app.stages,
    (s: FinishedSolve) => {
      app.add({ id: Date.now().toString(36), at: new Date().toISOString(), ...s });
      // 記録が増えたら少し後に Drive へ送る。押せなければ黙って次の機会に回る。
      driveSync.changed();
    },
  );

  // 練習中に画面が消えないようにする。無操作が続けば自分から手放す。
  const wakeLock = new ScreenWakeLock();

  const MODES: Array<{ value: Mode; label: string }> = [
    { value: '4', label: '4区間' },
    { value: '3', label: '3区間' },
    { value: '1', label: '合計のみ' },
  ];

  onMount(() => {
    restoreFocus(padEl);
    pwa.register();
    // 開いたら他の端末の記録を取りに行く。認可が無言で取れないときは何も起きない。
    driveSync.resume();
    return () => {
      timer.destroy();
      wakeLock.destroy();
      driveSync.destroy();
    };
  });

  /** 押した合図。タイマーを進めつつ、画面を消させない。 */
  function press(): void {
    wakeLock.poke();
    timer.press();
  }

  /* --------------------------------------------------------------
     キー操作。
     元の実装は document でキーを拾っていたが、textarea にフォーカスが
     残ると Space が完全に死に、ボタンにフォーカスが残ると Space が
     ボタンの click も誘発していた。
     ここでは「文字入力中だけ譲り、それ以外は必ずタイマーが取り、
     取ったらフォーカスをタイマーに戻す」を徹底する。
     -------------------------------------------------------------- */
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active instanceof HTMLElement && isTextEntry(active)) active.blur();
      if (timer.running) timer.cancel();
      else timer.disarm();
      restoreFocus(padEl);
      return;
    }
    if (e.code !== 'Space') return;
    // 文字を打っている最中だけは Space を渡す。
    if (isTextEntry(e.target)) return;
    // ページスクロールと、フォーカスが残ったボタンの誤作動を止める。
    e.preventDefault();
    restoreFocus(padEl);
    if (e.repeat) return;
    press();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code !== 'Space') return;
    if (isTextEntry(e.target)) return;
    e.preventDefault();
    timer.release();
  }

  /** ボタンや summary を押した後、Space の所有権をタイマーに戻す。 */
  function onClick(e: MouseEvent) {
    const t = e.target;
    if (t instanceof HTMLElement && t.closest('input, textarea, select, [contenteditable]')) return;
    restoreFocus(padEl);
  }

  function onWindowBlur() {
    // 押しっぱなしのままタブを離れたときに armed で固まらないようにする。
    timer.disarm();
  }

  /** 画面に戻ってきたとき。PWA は閉じても再読み込みされないので、ここが「開いた」に当たる。 */
  function onVisibilityChange() {
    wakeLock.syncWithVisibility();
    if (document.visibilityState === 'visible') driveSync.resume();
  }

  function onFocusChange() {
    typing = isTextEntry(document.activeElement);
  }

  function onPadPointerDown(e: PointerEvent) {
    e.preventDefault();
    restoreFocus(padEl);
    press();
  }

  /** 計測中は画面全体が「次の区間へ」。 */
  function onGuardPointerDown(e: PointerEvent) {
    e.preventDefault();
    wakeLock.poke();
    timer.split();
  }

  function setMode(mode: Mode) {
    if (timer.running) return;
    app.setMode(mode);
    timer.reset();
  }

  function setGoal(goal: GoalMs) {
    app.setGoal(goal);
  }
</script>

<svelte:window
  onkeydown={onKeyDown}
  onkeyup={onKeyUp}
  onclick={onClick}
  onpointerup={() => timer.release()}
  onpointercancel={() => timer.disarm()}
  onblur={onWindowBlur}
  ononline={() => driveSync.resume()}
  onfocusin={onFocusChange}
  onfocusout={onFocusChange}
/>

<svelte:document onvisibilitychange={onVisibilityChange} />

{#if timer.running}
  <!-- 透明な膜。計測中に下の「削除」等を誤って叩かないようにする。 -->
  <div
    class="tap-guard"
    role="presentation"
    onpointerdown={onGuardPointerDown}
  ></div>
{/if}

<div class="wrap">
  {#if pwa.needRefresh}
    <div class="update-bar">
      <span>新しいバージョンがあります。</span>
      <button type="button" class="btn" disabled={timer.running} onclick={() => pwa.apply()}>
        更新する
      </button>
    </div>
  {/if}

  <header>
    <h1>キューブ区間タイマー</h1>
    <div class="seg" role="group" aria-label="区間の数">
      {#each MODES as m (m.value)}
        <button
          type="button"
          aria-pressed={app.mode === m.value}
          disabled={timer.running}
          onclick={() => setMode(m.value)}
        >
          {m.label}
        </button>
      {/each}
    </div>
  </header>

  <TimerPad
    {timer}
    {typing}
    canSave={app.canSave}
    bind:padEl
    onpointerdown={onPadPointerDown}
  />

  <StatsBar totals={app.totals} />

  <StageTable
    solves={app.solves}
    mode={app.mode}
    goalMs={app.goalMs}
    targets={app.targets}
    onGoalChange={setGoal}
  />

  <TrendPanel solves={app.solves} mode={app.mode} goalMs={app.goalMs} />

  <History
    solves={app.solves}
    onDelete={(id) => {
      app.remove(id);
      driveSync.changed();
    }}
  />

  <SyncPanel />

  <footer class="credit">
    <a href="https://github.com/tmokmss/rubik-cube-timer" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
             0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
             -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
             .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
             -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
             .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
             .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
             0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        />
      </svg>
      GitHub
    </a>
  </footer>
</div>
