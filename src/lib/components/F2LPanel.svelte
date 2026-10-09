<script lang="ts">
  import { F2L_CASES, F2L_GROUPS } from '../core/f2l';
  import { F2LPlayer, type Speed } from '../f2l.svelte';
  import CubeView from './CubeView.svelte';

  let open = $state(false);
  const player = new F2LPlayer();
  $effect(() => () => player.destroy());

  const SPEEDS: Array<{ value: Speed; label: string }> = [
    { value: 'slow', label: 'ゆっくり' },
    { value: 'normal', label: 'ふつう' },
  ];
  const groupTitle = $derived(F2L_GROUPS.find((g) => g.key === player.case.group)?.title);
  const tokens = $derived(player.case.alg.split(' '));
</script>

<details class="panel f2l" bind:open>
  <summary><h2>F2L の手順</h2></summary>

  {#if open}
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

    <div class="f2l-view">
      <CubeView cube={player.view.cube} moving={player.view.moving} />
      <div class="f2l-side">
        <div class="f2l-title">
          F2L {player.case.id}<small>{groupTitle}</small>
        </div>
        <div class="f2l-alg">
          {#each tokens as t, i (i)}
            <button
              type="button"
              class:now={player.view.current === i}
              class:done={player.view.current < 0 ? i < player.step : i < player.view.current}
              onclick={() => player.jump(i)}
            >
              {t}
            </button>
          {/each}
        </div>
        <div class="f2l-controls">
          <button type="button" class="btn" onclick={() => player.jump(0)}>最初へ</button>
          <button type="button" class="btn" onclick={() => player.prev()}>{'\u25C0\uFE0E'} 戻る</button>
          <button type="button" class="btn play" onclick={() => player.toggle()}>
            {player.playing ? '一時停止' : '再生'}
          </button>
          <button type="button" class="btn" onclick={() => player.next()}>進む {'\u25B6\uFE0E'}</button>
        </div>
        <div class="seg" role="group" aria-label="回す速さ">
          {#each SPEEDS as s (s.value)}
            <button type="button" aria-pressed={player.speed === s.value} onclick={() => (player.speed = s.value)}>
              {s.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
    <p class="f2l-note">白を下、緑を手前にして、右手前のスロットに入れる。灰色のところは見なくてよい。</p>
  {/if}
</details>
