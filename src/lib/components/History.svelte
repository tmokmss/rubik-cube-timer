<script lang="ts">
  import { dateLabel, fmt, fmt1 } from '../core/format';
  import type { Solve } from '../core/types';

  let { solves, onDelete }: { solves: Solve[]; onDelete: (id: string) => void } = $props();

  const list = $derived(solves.slice().reverse().slice(0, 200));
  const max = $derived(Math.max(...list.map((s) => s.total), 1));

  // 1回目のクリックで確認待ちにする。3秒で元に戻る。
  let sureId = $state<string | null>(null);
  let sureTimer = 0;

  function onDeleteClick(id: string) {
    if (sureId !== id) {
      sureId = id;
      clearTimeout(sureTimer);
      sureTimer = setTimeout(() => (sureId = null), 3000);
      return;
    }
    clearTimeout(sureTimer);
    sureId = null;
    onDelete(id);
  }
</script>

<section class="panel">
  <h2>記録</h2>
  {#if list.length === 0}
    <p class="empty">まだ記録がありません。上のタイマーで1回測ってみてください。</p>
  {:else}
    {#each list as r (r.id)}
      <div class="hrow">
        <span class="d num">{dateLabel(r.at)}</span>
        <span class="tot num">{fmt(r.total)}</span>
        <div>
          {#if r.splits.length}
            <div class="bar" style="width:{Math.max(2, (r.total / max) * 100).toFixed(1)}%">
              {#each r.splits as s (s.name)}
                <span
                  data-stage={s.name}
                  style="flex:{s.ms}"
                  title="{s.name} {fmt1(s.ms)}"
                ></span>
              {/each}
            </div>
            <div class="splits num">
              {#each r.splits as s (s.name)}
                <span data-stage={s.name}><i class="dot"></i>{fmt1(s.ms)}</span>
              {/each}
            </div>
          {:else}
            <div class="bar plain" style="width:{Math.max(2, (r.total / max) * 100).toFixed(1)}%"></div>
          {/if}
        </div>
        <button
          type="button"
          class="del"
          class:sure={sureId === r.id}
          onclick={() => onDeleteClick(r.id)}
        >
          {sureId === r.id ? '本当に削除' : '削除'}
        </button>
      </div>
    {/each}
  {/if}
</section>
