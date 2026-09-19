<script lang="ts">
  import { fmt } from '../core/format';
  import { aoN } from '../core/stats';
  import type { GoalMs, Solve } from '../core/types';

  let { solves, goalMs }: { solves: Solve[]; goalMs: GoalMs } = $props();

  const W = 680;
  const H = 210;
  const L = 40;
  const R = 14;
  const T = 12;
  const B = 20;

  const list = $derived(solves.slice(-60));
  const totals = $derived(list.map((s) => s.total));

  // 縦は対数軸。目標線が必ず枠に入るように上下の余裕を取る。
  const lo = $derived(
    Math.log(Math.min(15_000, Math.min(...totals, Infinity) * 0.85, goalMs * 0.5)),
  );
  const hi = $derived(
    Math.log(Math.max(60_000, Math.max(...totals, 0) * 1.1, goalMs * 1.25)),
  );

  const x = $derived((i: number) =>
    list.length === 1 ? (L + W - R) / 2 : L + (i / (list.length - 1)) * (W - L - R),
  );
  const y = $derived(
    (ms: number) => T + (1 - (Math.log(ms) - lo) / (hi - lo)) * (H - T - B),
  );

  const goalSec = $derived(goalMs / 1000);
  const ticks = $derived(
    [...new Set([15, 30, 45, 60, 120, 240, goalSec])]
      .sort((a, b) => a - b)
      .filter((t) => Math.log(t * 1000) >= lo && Math.log(t * 1000) <= hi),
  );

  const ao5Line = $derived(
    list.length > 5
      ? list
          .map((_, i) =>
            i < 4 ? null : `${x(i).toFixed(1)},${y(aoN(totals.slice(0, i + 1), 5)!).toFixed(1)}`,
          )
          .filter((p): p is string => p != null)
          .join(' ')
      : '',
  );
</script>

<div class="chartbox">
  {#if list.length === 0}
    <p class="empty">まだ記録がありません。</p>
  {:else}
    <svg
      viewBox="0 0 {W} {H}"
      width="100%"
      style="min-width:420px"
      role="img"
      aria-label="タイムの推移"
    >
      {#each ticks as t (t)}
        {@const yy = y(t * 1000)}
        {@const goal = t === goalSec}
        <line
          x1={L}
          x2={W - R}
          y1={yy.toFixed(1)}
          y2={yy.toFixed(1)}
          stroke={goal ? 'var(--green)' : 'var(--line)'}
          stroke-width={goal ? 1.5 : 1}
          stroke-dasharray={goal ? '5 4' : undefined}
        />
        <text
          x={L - 6}
          y={(yy + 4).toFixed(1)}
          text-anchor="end"
          style={goal ? 'fill:var(--green)' : undefined}>{t}秒</text
        >
      {/each}

      {#if ao5Line}
        <polyline points={ao5Line} fill="none" stroke="var(--ink)" stroke-width="2" />
      {/if}

      {#each list as r, i (r.id)}
        <circle cx={x(i).toFixed(1)} cy={y(r.total).toFixed(1)} r="3.5" fill="var(--blue)">
          <title>{fmt(r.total)}</title>
        </circle>
      {/each}
    </svg>
    <p class="legend" style="margin-top:4px">
      点が1回ごとのタイム、線がao5。破線が目標の{goalSec}秒。たて軸は対数です。
    </p>
  {/if}
</div>
