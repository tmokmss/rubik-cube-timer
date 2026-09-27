<script lang="ts">
  import {
    splitStagesFor,
    type GoalMs,
    type Mode,
    type Solve,
    type SplitStageName,
  } from '../core/types';
  import StageTrendChart from './StageTrendChart.svelte';
  import TotalChart from './TotalChart.svelte';

  let {
    solves,
    mode,
    goalMs,
    targets,
  }: {
    solves: Solve[];
    mode: Mode;
    goalMs: GoalMs;
    targets: Record<SplitStageName, number>;
  } = $props();

  type View = 'total' | 'stage';
  const VIEWS: Array<{ value: View; label: string }> = [
    { value: 'total', label: '合計' },
    { value: 'stage', label: '区間の内訳' },
  ];

  let view = $state<View>('total');
  const names = $derived(splitStagesFor(mode));
  // F2L だけなら帯が1本で合計と同じなので、内訳のグラフは出さない。
  const hasBreakdown = $derived(names.length > 1);
</script>

<section class="panel">
  <div class="panel-head">
    <h2>タイムの推移</h2>
    {#if hasBreakdown}
      <div class="seg" role="group" aria-label="グラフの種類">
        {#each VIEWS as v (v.value)}
          <button type="button" aria-pressed={view === v.value} onclick={() => (view = v.value)}>
            {v.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if !hasBreakdown}
    <TotalChart {solves} goalMs={targets.F2L} />
  {:else if view === 'total'}
    <TotalChart {solves} {goalMs} />
  {:else}
    <StageTrendChart {solves} {names} {goalMs} />
  {/if}
</section>
