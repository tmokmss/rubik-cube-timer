import { invert, normalize, parse, run, solved, type Cube, type Move } from './core/cube';
import { F2L_CASES, type F2LCase } from './core/f2l';

const MOVE_MS = 650;

/** 手順を頭から通しで回して見せる再生器。描くのは CubeView、ここは今どの状態か だけを持つ。 */
export class F2LPlayer {
  case = $state<F2LCase>(F2L_CASES[0]);
  /** 回し終えた手数 */
  step = $state(0);

  moves = $derived(parse(this.case.alg));
  /** states[k] は k 手回したあと。0 がケースの形 */
  states = $derived.by(() => {
    const out: Cube[] = [normalize(run(solved(), invert(this.moves)))];
    for (const m of this.moves) out.push(run(out[out.length - 1], [m]));
    return out;
  });

  #progress = $state<number | null>(null);
  #t0 = 0;
  #raf = 0;

  playing = $derived(this.#progress !== null);

  /** いま描くべきキューブと、回している途中の層 */
  view = $derived.by((): { cube: Cube; moving?: { move: Move; progress: number } } => {
    const p = this.#progress;
    if (p === null) return { cube: this.states[this.step] };
    return { cube: this.states[this.step], moving: { move: this.moves[this.step], progress: p } };
  });

  select(c: F2LCase): void {
    this.#stop();
    this.case = c;
    this.step = 0;
  }

  play(): void {
    this.#stop();
    this.step = 0;
    this.#t0 = performance.now();
    this.#progress = 0;
    this.#raf = requestAnimationFrame(this.#tick);
  }

  destroy(): void {
    this.#stop();
  }

  #stop(): void {
    this.#progress = null;
    cancelAnimationFrame(this.#raf);
  }

  #tick = (now: number): void => {
    const p = (now - this.#t0) / MOVE_MS;
    if (p < 1) {
      this.#progress = p;
    } else {
      this.step += 1;
      this.#t0 = now;
      this.#progress = this.step < this.moves.length ? 0 : null;
    }
    if (this.#progress !== null) this.#raf = requestAnimationFrame(this.#tick);
  };
}
