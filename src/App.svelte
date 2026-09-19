<script lang="ts">
  import { onMount } from 'svelte';
  import DataPanel from './lib/components/DataPanel.svelte';
  import History from './lib/components/History.svelte';
  import StageTable from './lib/components/StageTable.svelte';
  import StatsBar from './lib/components/StatsBar.svelte';
  import TrendPanel from './lib/components/TrendPanel.svelte';
  import TimerPad from './lib/components/TimerPad.svelte';
  import { isTextEntry, restoreFocus } from './lib/core/keys';
  import type { GoalMs, Mode } from './lib/core/types';
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
    (s: FinishedSolve) =>
      app.add({ id: Date.now().toString(36), at: new Date().toISOString(), ...s }),
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
    return () => {
      timer.destroy();
      wakeLock.destroy();
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
  onfocusin={onFocusChange}
  onfocusout={onFocusChange}
/>

<svelte:document onvisibilitychange={() => wakeLock.syncWithVisibility()} />

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

  <History solves={app.solves} onDelete={(id) => app.remove(id)} />

  <DataPanel solves={app.solves} onReplace={(s) => app.replaceAll(s)} />
</div>
