<script lang="ts">
  import type { AlgSetName } from '../core/algs';
  import { axisAngle, inLayer, type Cube, type Cubie, type Move, type Vec } from '../core/cube';
  import { stickerColor } from '../stickers';

  let {
    cube,
    moving,
    set,
  }: {
    cube: Cube;
    moving?: { move: Move; progress: number };
    set: AlgSetName;
  } = $props();

  const S = 56;

  // 面の法線(モデルは y が上)→ その面を立てる CSS。CSS は y が下向き
  const FACES: Array<{ n: Vec; css: string }> = [
    { n: [0, 1, 0], css: 'rotateX(90deg)' },
    { n: [0, -1, 0], css: 'rotateX(-90deg)' },
    { n: [0, 0, 1], css: '' },
    { n: [0, 0, -1], css: 'rotateY(180deg)' },
    { n: [1, 0, 0], css: 'rotateY(90deg)' },
    { n: [-1, 0, 0], css: 'rotateY(-90deg)' },
  ];

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function transform(c: Cubie): string {
    let r = c.rot.map((row) => [...row]);
    let p = [...c.pos];
    if (moving && inLayer(c, moving.move)) {
      const a = axisAngle(moving.move.axis, moving.move.turns * (Math.PI / 2) * ease(moving.progress));
      r = a.map((row) => [0, 1, 2].map((j) => row[0] * r[0][j] + row[1] * r[1][j] + row[2] * r[2][j]));
      p = a.map((row) => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
    }
    // y を反転して CSS の座標に直し、列優先で並べる
    const f = [1, -1, 1];
    const m = (i: number, j: number) => f[i] * r[i][j] * f[j];
    return `matrix3d(${m(0, 0)},${m(1, 0)},${m(2, 0)},0,${m(0, 1)},${m(1, 1)},${m(2, 1)},0,${m(0, 2)},${m(1, 2)},${m(2, 2)},0,${p[0] * S},${-p[1] * S},${p[2] * S},1)`;
  }

</script>

<div class="cube3d" style:--s="{S}px" aria-hidden="true">
  <div class="cube3d-scene">
    {#each cube as c (c.home.join())}
      <div class="cubie" style:transform={transform(c)}>
        {#each FACES as f (f.css)}
          {@const color = stickerColor(set, c, f.n)}
          <div class="face" style:transform="{f.css} translateZ(calc(var(--s) / 2))">
            {#if color}<span style:background={color}></span>{/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
