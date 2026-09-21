<script lang="ts">
  import { fmt, fmt1 } from '../core/format';
  import type { Timer } from '../timer.svelte';

  let {
    timer,
    canSave,
    typing,
    padEl = $bindable(null),
    onpointerdown,
  }: {
    timer: Timer;
    canSave: boolean;
    /** 文字入力欄にフォーカスがある間は Space をアプリが取れない。 */
    typing: boolean;
    padEl?: HTMLElement | null;
    onpointerdown: (e: PointerEvent) => void;
  } = $props();

  const stages = $derived(timer.stages);

  const hint = $derived.by(() => {
    if (typing) return '文字入力中は Space が効きません。ここをタップすると戻ります';
    if (timer.running) return `Space / タップで ${timer.nextLabel}　Escで中止`;
    if (timer.armed) return '離すとスタート';
    if (timer.justSaved) return '記録しました。Spaceを押して離すと次のソルブ';
    return 'Space(またはここをタップ)を押して離すとスタート';
  });
</script>

<section
  id="pad"
  bind:this={padEl}
  aria-label="タイマー。Spaceを押して離すとスタート"
  tabindex="-1"
  class:armed={timer.armed}
  {onpointerdown}
>
  <div id="time" class="num">{fmt(timer.elapsed)}</div>

  {#if stages.length > 1}
    <div id="stickers" style="grid-template-columns:repeat({stages.length},1fr)">
      {#each stages as name, i (name)}
        <div class="sticker {timer.stickerState(i)}" data-stage={name}>
          <span class="name">{name}</span>
          <span class="t num">{fmt1(timer.segmentMs(i))}</span>
        </div>
      {/each}
    </div>
  {/if}

  <p id="hint" class:warn={typing}>{hint}</p>
  {#if !canSave}
    <p class="note">このブラウザでは保存できません。ページを閉じると記録が消えます。</p>
  {/if}
</section>
