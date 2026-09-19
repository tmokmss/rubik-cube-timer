<script lang="ts">
  import { splitStagesFor, type GoalMs, type Mode, type Solve } from '../core/types';
  import StageTrendChart from './StageTrendChart.svelte';
  import TotalChart from './TotalChart.svelte';

  let {
    solves,
    mode,
    goalMs,
  }: { solves: Solve[]; mode: Mode; goalMs: GoalMs } = $props();

  type View = 'total' | 'stage';
  const VIEWS: Array<{ value: View; label: string }> = [
    { value: 'total', label: '合計' },
    { value: 'stage', label: '区間の内訳' },
  ];

  let view = $state<View>('total');
  const names = $derived(splitStagesFor(mode));
</script>

<section class="panel">
  <div class="panel-head">
    <h2>タイムの推移</h2>
    <div class="seg" role="group" aria-label="グラフの種類">
      {#each VIEWS as v (v.value)}
        <button type="button" aria-pressed={view === v.value} onclick={() => (view = v.value)}>
          {v.label}
        </button>
      {/each}
    </div>
  </div>

  {#if view === 'total'}
    <TotalChart {solves} {goalMs} />
  {:else}
    <StageTrendChart {solves} {names} {goalMs} />
  {/if}
</section>
