<script lang="ts">
  import { fmt1 } from '../core/format';
  import { stageAverages } from '../core/stats';
  import {
    GOALS_MS,
    type GoalMs,
    type Mode,
    type Solve,
    type SplitStageName,
  } from '../core/types';

  let {
    solves,
    mode,
    goalMs,
    targets,
    onGoalChange,
  }: {
    solves: Solve[];
    mode: Mode;
    goalMs: GoalMs;
    targets: Record<SplitStageName, number>;
    onGoalChange: (goal: GoalMs) => void;
  } = $props();

  // 合計のみモードでも、区間つきの過去記録は 4 区間で見せる(元アプリと同じ)。
  const names = $derived<readonly SplitStageName[]>(
    mode === '3' ? (['Cross', 'F2L', 'LL'] as const) : (['Cross', 'F2L', 'OLL', 'PLL'] as const),
  );
  const agg = $derived(stageAverages(solves, names, targets));
  const scale = $derived(
    Math.max(...agg.rows.map((r) => Math.max(r.avg ?? 0, r.target))) * 1.05 || 1,
  );
  const targetLegend = $derived(agg.rows.map((r) => `${r.name} ${fmt1(r.target)}`).join(' / '));
</script>

<section class="panel">
  <div class="panel-head">
    <h2>区間ごとの平均と目標</h2>
    <div class="seg" role="group" aria-label="目標の合計タイム">
      {#each GOALS_MS as g (g)}
        <button
          type="button"
          aria-pressed={goalMs === g}
          onclick={() => onGoalChange(g)}
        >
          {g / 1000}秒
        </button>
      {/each}
    </div>
  </div>

  {#if agg.sampled === 0}
    <p class="empty">区間つきの記録がまだありません。1回測ると、ここに目標との差が出ます。</p>
  {:else}
    {#each agg.rows as r (r.name)}
      <div class="srow" data-stage={r.name}>
        <span class="nm"><i class="dot"></i>{r.name}</span>
        <span class="avg num">{fmt1(r.avg)}</span>
        <span class="track">
          {#if r.avg != null}
            <span class="fill" style="width:{((r.avg / scale) * 100).toFixed(1)}%"></span>
          {/if}
          <span class="tick" style="left:{((r.target / scale) * 100).toFixed(1)}%"></span>
        </span>
        {#if r.avg == null}
          <span class="diff">記録なし</span>
        {:else if r.avg > r.target}
          <span class="diff num">目標まで -{fmt1(r.avg - r.target)}秒</span>
        {:else}
          <span class="diff num ok">目標クリア</span>
        {/if}
      </div>
    {/each}
    <p class="legend">
      <i></i>縦線が目標(合計 {goalMs / 1000} 秒 = {targetLegend} 秒)。平均は直近{agg.sampled}回分。
    </p>
  {/if}
</section>
