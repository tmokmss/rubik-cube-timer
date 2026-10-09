import { invert, normalize, parse, run, solved, type Cube, type Move } from './core/cube';
import { F2L_CASES, type F2LCase } from './core/f2l';

const MOVE_MS = { slow: 650, normal: 260 } as const;
export type Speed = keyof typeof MOVE_MS;

/** 1 手ずつ回して見せる再生器。描くのは CubeView、ここは今どの状態か だけを持つ。 */
export class F2LPlayer {
  case = $state<F2LCase>(F2L_CASES[0]);
  /** 回し終えた手数 */
  step = $state(0);
  playing = $state(false);
  speed = $state<Speed>('slow');

  moves = $derived(parse(this.case.alg));
  /** states[k] は k 手回したあと。0 がケースの形 */
  states = $derived.by(() => {
    const out: Cube[] = [normalize(run(solved(), invert(this.moves)))];
    for (const m of this.moves) out.push(run(out[out.length - 1], [m]));
    return out;
  });

  #anim = $state<{ i: number; dir: 1 | -1; t0: number; p: number } | null>(null);
  #raf = 0;

  /** いま描くべきキューブと、回している途中の層 */
  view = $derived.by((): { cube: Cube; moving?: { move: Move; progress: number }; current: number } => {
    const a = this.#anim;
    if (!a) return { cube: this.states[this.step], current: -1 };
    return {
      cube: this.states[a.i],
      moving: { move: this.moves[a.i], progress: a.dir > 0 ? a.p : 1 - a.p },
      current: a.i,
    };
  });

  select(c: F2LCase): void {
    this.#stop();
    this.case = c;
    this.step = 0;
  }

  toggle(): void {
    if (this.playing) {
      this.playing = false;
      return;
    }
    if (this.step >= this.moves.length) this.step = 0;
    this.playing = true;
    if (!this.#anim) this.#start(this.step, 1);
  }

  next(): void {
    this.playing = false;
    if (!this.#anim && this.step < this.moves.length) this.#start(this.step, 1);
  }

  prev(): void {
    this.playing = false;
    if (!this.#anim && this.step > 0) this.#start(this.step - 1, -1);
  }

  jump(step: number): void {
    this.#stop();
    this.step = step;
  }

  destroy(): void {
    this.#stop();
  }

  #stop(): void {
    this.playing = false;
    this.#anim = null;
    cancelAnimationFrame(this.#raf);
  }

  #start(i: number, dir: 1 | -1): void {
    this.#anim = { i, dir, t0: performance.now(), p: 0 };
    this.#raf = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number): void => {
    const a = this.#anim;
    if (!a) return;
    const p = Math.min((now - a.t0) / MOVE_MS[this.speed], 1);
    if (p < 1) {
      this.#anim = { ...a, p };
      this.#raf = requestAnimationFrame(this.#tick);
      return;
    }
    this.#anim = null;
    this.step = a.dir > 0 ? a.i + 1 : a.i;
    if (this.playing && this.step < this.moves.length) this.#start(this.step, 1);
    else this.playing = false;
  };
}
