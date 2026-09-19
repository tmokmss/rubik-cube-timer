import { makeScramble } from './core/scramble';
import type { Split, StageName } from './core/types';

export type TimerStatus = 'idle' | 'running';
export type StickerState = 'done' | 'now' | 'todo';

export interface FinishedSolve {
  total: number;
  splits: Split[];
  scramble: string;
}

/**
 * idle -> (keydown) armed -> (keyup) running -> (押すたび split) -> idle
 *
 * `armed` は idle のときの押下でしか立たない。
 * これによりストップ時の keyup で次の計測が始まらない。
 */
export class Timer {
  status = $state<TimerStatus>('idle');
  armed = $state(false);
  /** 直前の計測を保存した直後か。ヒント文言の出し分けだけに使う。 */
  justSaved = $state(false);
  scramble = $state('');
  marks = $state<number[]>([]);
  now = $state(0);
  t0 = $state(0);

  #raf = 0;
  #stages: () => readonly StageName[];
  #onFinish: (solve: FinishedSolve) => void;

  constructor(stages: () => readonly StageName[], onFinish: (solve: FinishedSolve) => void) {
    this.#stages = stages;
    this.#onFinish = onFinish;
    this.scramble = makeScramble();
  }

  get stages(): readonly StageName[] {
    return this.#stages();
  }

  get running(): boolean {
    return this.status === 'running';
  }

  /** 大きく出す合計。計測が終わっていれば最後のマークで止める。 */
  get elapsed(): number {
    const st = this.stages;
    const done = this.marks.length > 0 && this.marks.length === st.length;
    const end = done ? this.marks[this.marks.length - 1] : this.now;
    return Math.max(0, end - this.t0);
  }

  /** i 番目の区間の経過。まだ来ていなければ null。 */
  segmentMs(i: number): number | null {
    const from = i > 0 ? this.marks[i - 1] : this.t0;
    if (i < this.marks.length) return this.marks[i] - from;
    if (i === this.marks.length && this.running) return this.now - from;
    return null;
  }

  stickerState(i: number): StickerState {
    if (i < this.marks.length) return 'done';
    if (i === this.marks.length && this.running) return 'now';
    return 'todo';
  }

  /** 次に押したら何が起きるか。 */
  get nextLabel(): string {
    const st = this.stages;
    const i = this.marks.length;
    return i < st.length - 1 ? `${st[i + 1]} へ` : 'ストップ';
  }

  newScramble(): void {
    this.scramble = makeScramble();
  }

  /** 押した瞬間。計測中なら区間を刻み、idle なら構える。 */
  press(): void {
    if (this.running) {
      this.split();
      return;
    }
    if (this.armed) return;
    this.armed = true;
    this.justSaved = false;
    this.marks = [];
    this.t0 = 0;
    this.now = 0;
  }

  /** 離した瞬間。構えていたときだけ走り出す。 */
  release(): void {
    if (this.armed && this.status === 'idle') {
      this.armed = false;
      this.start();
    }
  }

  disarm(): void {
    this.armed = false;
  }

  start(): void {
    this.status = 'running';
    this.justSaved = false;
    this.marks = [];
    this.t0 = performance.now();
    this.now = this.t0;
    this.#loop();
  }

  split(): void {
    if (!this.running) return;
    this.now = performance.now();
    this.marks = [...this.marks, this.now];
    if (this.marks.length >= this.stages.length) this.#finish();
  }

  /** 計測中止。記録しない。 */
  cancel(): void {
    this.#stopLoop();
    this.status = 'idle';
    this.armed = false;
    this.justSaved = false;
    this.marks = [];
    this.t0 = 0;
    this.now = 0;
  }

  /** モードを変えたときなど、表示だけ初期化する。 */
  reset(): void {
    if (this.running) return;
    this.cancel();
  }

  destroy(): void {
    this.#stopLoop();
  }

  #finish(): void {
    this.#stopLoop();
    const st = this.stages;
    const last = this.marks[this.marks.length - 1];
    const solve: FinishedSolve = {
      total: Math.round(last - this.t0),
      splits:
        st.length === 1
          ? []
          : st.map((name, i) => ({
              name,
              ms: Math.round(this.marks[i] - (i > 0 ? this.marks[i - 1] : this.t0)),
            })),
      scramble: this.scramble,
    };
    this.status = 'idle';
    this.justSaved = true;
    this.now = last;
    this.#onFinish(solve);
    this.newScramble();
  }

  #loop = (): void => {
    if (!this.running) return;
    this.now = performance.now();
    this.#raf = requestAnimationFrame(this.#loop);
  };

  #stopLoop(): void {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }
}
