<script lang="ts">
  import type { AlgSetName } from '../core/algs';
  import { stickerHome, type Cube, type Vec } from '../core/cube';
  import { stickerColor } from '../stickers';

  let { cube, set }: { cube: Cube; set: AlgSetName } = $props();

  // 上から見た上の面と、そのまわりの側面のシール。上が奥、下が手前
  const C = 24;
  const T = 9;
  const G = 3;
  const at = (i: number) => T + G + i * (C + G);
  const SIZE = at(3) + T;

  function color(x: number, z: number, n: Vec): string {
    const c = cube.find((p) => p.pos[0] === x && p.pos[1] === 1 && p.pos[2] === z)!;
    return stickerColor(set, c, stickerHome(c, n)) ?? 'transparent';
  }

  const R = [-1, 0, 1];
</script>

<svg class="ll" viewBox="0 0 {SIZE} {SIZE}" aria-hidden="true">
  {#each R as z, row (z)}
    {#each R as x, col (x)}
      <rect x={at(col)} y={at(row)} width={C} height={C} rx="3" fill={color(x, z, [0, 1, 0])} />
    {/each}
  {/each}
  {#each R as x, i (x)}
    <rect x={at(i)} y="0" width={C} height={T} rx="2" fill={color(x, -1, [0, 0, -1])} />
    <rect x={at(i)} y={SIZE - T} width={C} height={T} rx="2" fill={color(x, 1, [0, 0, 1])} />
  {/each}
  {#each R as z, i (z)}
    <rect x="0" y={at(i)} width={T} height={C} rx="2" fill={color(-1, z, [-1, 0, 0])} />
    <rect x={SIZE - T} y={at(i)} width={T} height={C} rx="2" fill={color(1, z, [1, 0, 0])} />
  {/each}
</svg>
