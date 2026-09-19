<script lang="ts">
  import { fmt } from '../core/format';
  import { aoN, best } from '../core/stats';

  let { totals }: { totals: number[] } = $props();

  const bestMs = $derived(best(totals));
  const ao5 = $derived(aoN(totals, 5));
  const ao12 = $derived(aoN(totals, 12));
</script>

<section class="stats" aria-label="成績">
  <div><span class="k">ベスト</span><span class="v num">{fmt(bestMs)}</span></div>
  <div><span class="k">ao5</span><span class="v num">{fmt(ao5)}</span></div>
  <div><span class="k">ao12</span><span class="v num">{fmt(ao12)}</span></div>
  <div><span class="k">回数</span><span class="v num">{totals.length}</span></div>
</section>
