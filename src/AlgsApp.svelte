<script lang="ts">
  import CubeView from './lib/components/CubeView.svelte';
  import LLDiagram from './lib/components/LLDiagram.svelte';
  import { ALG_SETS, type AlgCase, type AlgSetName } from './lib/core/algs';
  import { AlgPlayer } from './lib/algs.svelte';

  const SETS = Object.keys(ALG_SETS) as AlgSetName[];
  const NOTES: Record<AlgSetName, string> = {
    F2L: '白を下、緑を手前にして、右手前のスロットに入れる。灰色のところは見なくてよい。',
    OLL: '黄色を上にして、上の面を黄色に揃える。灰色は黄色以外のシール。',
    PLL: '黄色を上にして、上の段の並びを揃える。',
  };

  let set = $state<AlgSetName>('F2L');
  // タブを切り替えても、それぞれ最後に選んだケースに戻る
  const picked: Record<AlgSetName, AlgCase> = {
    F2L: ALG_SETS.F2L.cases[0],
    OLL: ALG_SETS.OLL.cases[0],
    PLL: ALG_SETS.PLL.cases[0],
  };
  const player = new AlgPlayer();
  $effect(() => () => player.destroy());

  function pick(c: AlgCase) {
    picked[set] = c;
    player.select(c);
  }

  function switchSet(s: AlgSetName) {
    set = s;
    player.select(picked[s]);
  }

  const groupTitle = $derived(ALG_SETS[set].groups.find((g) => g.key === player.case.group)?.title);
  const tokens = $derived(player.case.alg.split(' '));
</script>

<div class="wrap">
  <header>
    <h1>手順</h1>
    <div class="seg" role="group" aria-label="手順の種類">
      {#each SETS as s (s)}
        <button type="button" aria-pressed={set === s} onclick={() => switchSet(s)}>{s}</button>
      {/each}
    </div>
    <a class="btn" href="../">タイマーへ</a>
  </header>

  <section class="panel">
    <div class="alg-pick">
      {#each ALG_SETS[set].groups as g (g.key)}
        <div class="alg-group">
          <span>{g.title}</span>
          <div>
            {#each ALG_SETS[set].cases.filter((c) => c.group === g.key) as c (c.name)}
              <button type="button" aria-pressed={player.case === c} onclick={() => pick(c)}>
                {c.name}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel">
    <div class="alg-view">
      <button type="button" class="cube-tap" aria-label="再生" onclick={() => player.play()}>
        <CubeView cube={player.view.cube} moving={player.view.moving} {set} />
      </button>
      <div class="alg-side">
        <div class="alg-title">
          {set} {player.case.name}<small>{groupTitle}</small>
        </div>
        {#if set !== 'F2L'}
          <LLDiagram cube={player.states[0]} {set} />
        {/if}
        <div class="alg-moves">
          {#each tokens as t, i (i)}
            <span class:now={player.playing && player.step === i} class:done={i < player.step}>{t}</span>
          {/each}
        </div>
      </div>
    </div>
    <p class="alg-note">{NOTES[set]}キューブをタップすると手順を再生する。</p>
  </section>
</div>
