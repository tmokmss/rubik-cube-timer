<script lang="ts">
  import { axisAngle, inLayer, isPair, type Cube, type Cubie, type Move, type Vec } from '../core/cube';

  let {
    cube,
    moving,
  }: {
    cube: Cube;
    moving?: { move: Move; progress: number };
  } = $props();

  const S = 46;

  // 面の法線(モデルは y が上)→ その面を立てる CSS。CSS は y が下向き
  const FACES: Array<{ n: Vec; css: string; color: string }> = [
    { n: [0, 1, 0], css: 'rotateX(90deg)', color: '#ffd500' },
    { n: [0, -1, 0], css: 'rotateX(-90deg)', color: '#ffffff' },
    { n: [0, 0, 1], css: '', color: '#00a651' },
    { n: [0, 0, -1], css: 'rotateY(180deg)', color: '#0046ad' },
    { n: [1, 0, 0], css: 'rotateY(90deg)', color: '#ff6a00' },
    { n: [-1, 0, 0], css: 'rotateY(-90deg)', color: '#c8102e' },
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

  // 上の段はペア以外を灰色にして、見るべきピースだけに色を付ける
  const sticker = (c: Cubie, n: Vec, color: string) =>
    [0, 1, 2].some((i) => n[i] !== 0 && n[i] === c.home[i])
      ? c.home[1] === 1 && !isPair(c)
        ? 'var(--cube-grey)'
        : color
      : null;
</script>

<div class="cube3d" style:--s="{S}px" aria-hidden="true">
  <div class="cube3d-scene">
    {#each cube as c (c.home.join())}
      <div class="cubie" style:transform={transform(c)}>
        {#each FACES as f (f.css)}
          {@const color = sticker(c, f.n, f.color)}
          <div class="face" style:transform="{f.css} translateZ(calc(var(--s) / 2))">
            {#if color}<span style:background={color}></span>{/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
