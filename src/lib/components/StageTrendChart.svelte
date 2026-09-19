<script lang="ts">
  import { fmt1 } from '../core/format';
  import { stageTrend } from '../core/stats';
  import type { GoalMs, Solve, SplitStageName } from '../core/types';

  let {
    solves,
    names,
    goalMs,
  }: { solves: Solve[]; names: readonly SplitStageName[]; goalMs: GoalMs } = $props();

  const W = 680;
  const H = 210;
  const L = 44;
  const R = 14;
  const T = 12;
  const B = 20;

  const trend = $derived(stageTrend(solves, names));
  const points = $derived(trend.points);

  // たて軸は線形(積み上げなので対数だと意味が壊れる)。目標線は必ず枠に入れる。
  const hi = $derived(
    Math.max(...points.map((p) => p.total), goalMs) * 1.08 || goalMs * 1.08,
  );

  const x = $derived((i: number) => L + (i / Math.max(1, points.length - 1)) * (W - L - R));
  const y = $derived((ms: number) => T + (1 - ms / hi) * (H - T - B));

  /** 目盛りが5〜6本くらいに収まる刻みを選ぶ。 */
  const step = $derived.by(() => {
    for (const s of [5, 10, 15, 20, 30, 60, 120]) {
      if (hi / (s * 1000) <= 6) return s * 1000;
    }
    return 300_000;
  });
  const ticks = $derived(
    Array.from({ length: Math.floor(hi / step) + 1 }, (_, i) => i * step).filter((t) => t > 0),
  );

  const sum = (vals: number[], k: number) => vals.slice(0, k).reduce((a, b) => a + b, 0);

  /** 下から順に積み上げた帯。名前は data-stage 経由で色になる。 */
  const bands = $derived(
    names.map((name, si) => {
      const top = points.map((p, i) => `${x(i).toFixed(1)},${y(sum(p.values, si + 1)).toFixed(1)}`);
      const bottom = points
        .map((p, i) => `${x(i).toFixed(1)},${y(sum(p.values, si)).toFixed(1)}`)
        .reverse();
      return { name, d: `M${[...top, ...bottom].join('L')}Z` };
    }),
  );

  const totalLine = $derived(
    points.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' '),
  );

  const goalY = $derived(y(goalMs));

  /** 凡例に出す「今の値」= いちばん新しい移動平均。 */
  const latest = $derived(points.length ? points[points.length - 1].values : []);
</script>

<div class="chartbox">
  {#if points.length < 2}
    <p class="empty">
      区間つきの記録が2回分以上たまると、ここに区間ごとの推移が出ます。
    </p>
  {:else}
    <svg
      viewBox="0 0 {W} {H}"
      width="100%"
      style="min-width:420px"
      role="img"
      aria-label="区間ごとの推移"
    >
      {#each ticks as t (t)}
        {@const yy = y(t)}
        <line
          x1={L}
          x2={W - R}
          y1={yy.toFixed(1)}
          y2={yy.toFixed(1)}
          stroke="var(--line)"
          stroke-width="1"
        />
        <text x={L - 6} y={(yy + 4).toFixed(1)} text-anchor="end">{t / 1000}秒</text>
      {/each}

      {#each bands as b (b.name)}
        <path d={b.d} data-stage={b.name} fill="var(--c)" />
      {/each}

      <polyline points={totalLine} fill="none" stroke="var(--ink)" stroke-width="1.5" />

      <!-- 帯の上に重なるので、どの色の上でも見えるように下地を敷く -->
      <line
        x1={L}
        x2={W - R}
        y1={goalY.toFixed(1)}
        y2={goalY.toFixed(1)}
        stroke="var(--surface)"
        stroke-width="4"
      />
      <line
        x1={L}
        x2={W - R}
        y1={goalY.toFixed(1)}
        y2={goalY.toFixed(1)}
        stroke="var(--green)"
        stroke-width="2"
        stroke-dasharray="5 4"
      />
      <text x={L - 6} y={(goalY + 4).toFixed(1)} text-anchor="end" style="fill:var(--green)">
        {goalMs / 1000}秒
      </text>
    </svg>

    <div class="splits num" style="margin-top:6px">
      {#each names as n, i (n)}
        <span data-stage={n}><i class="dot"></i>{n} {fmt1(latest[i])}</span>
      {/each}
    </div>
    <p class="legend" style="margin-top:4px">
      帯の厚みがその区間の時間、いちばん上の線が合計。直近{trend.window}回の移動平均なので、
      帯が薄くなっていればその区間が縮んでいる。直近{trend.sampled}回分。
    </p>
  {/if}
</div>
