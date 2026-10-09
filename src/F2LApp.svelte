<script lang="ts">
  import CubeView from './lib/components/CubeView.svelte';
  import { F2L_CASES, F2L_GROUPS } from './lib/core/f2l';
  import { F2LPlayer } from './lib/f2l.svelte';

  const player = new F2LPlayer();
  $effect(() => () => player.destroy());

  const groupTitle = $derived(F2L_GROUPS.find((g) => g.key === player.case.group)?.title);
  const tokens = $derived(player.case.alg.split(' '));
</script>

<div class="wrap">
  <header>
    <h1>F2L の手順</h1>
    <a class="btn" href="../">タイマーへ</a>
  </header>

  <section class="panel">
    <div class="f2l-pick">
      {#each F2L_GROUPS as g (g.key)}
        <div class="f2l-group">
          <span>{g.title}</span>
          <div>
            {#each F2L_CASES.filter((c) => c.group === g.key) as c (c.id)}
              <button type="button" aria-pressed={player.case.id === c.id} onclick={() => player.select(c)}>
                {c.id}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel">
    <div class="f2l-view">
      <CubeView cube={player.view.cube} moving={player.view.moving} />
      <div class="f2l-side">
        <div class="f2l-title">
          F2L {player.case.id}<small>{groupTitle}</small>
        </div>
        <div class="f2l-alg">
          {#each tokens as t, i (i)}
            <span class:now={player.playing && player.step === i} class:done={i < player.step}>{t}</span>
          {/each}
        </div>
        <button type="button" class="btn play" onclick={() => player.play()}>
          {player.step > 0 && !player.playing ? 'もう一度' : '再生'}
        </button>
      </div>
    </div>
    <p class="f2l-note">白を下、緑を手前にして、右手前のスロットに入れる。灰色のところは見なくてよい。</p>
  </section>
</div>
