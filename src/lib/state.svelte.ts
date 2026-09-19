import { loadStore, saveStore, seedSolves } from './core/storage';
import {
  DEFAULT_GOAL_MS,
  type GoalMs,
  type Mode,
  type Solve,
  type SplitStageName,
  type StageName,
  stagesOf,
  targetsFor,
} from './core/types';

function byTime(a: Solve, b: Solve): number {
  return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
}

class AppState {
  mode = $state<Mode>('4');
  goalMs = $state<GoalMs>(DEFAULT_GOAL_MS);
  solves = $state<Solve[]>([]);
  /** localStorage が使えない環境では false。UI に警告を出す。 */
  canSave = $state(true);
  #seeded = false;

  get stages(): readonly StageName[] {
    return stagesOf(this.mode);
  }

  get totals(): number[] {
    return this.solves.map((s) => s.total);
  }

  /** 目標の合計タイムから比例配分した区間ごとの目安。 */
  get targets(): Record<SplitStageName, number> {
    return targetsFor(this.goalMs);
  }

  load(): void {
    const { data, canSave } = loadStore();
    this.mode = data.mode;
    this.goalMs = data.goalMs;
    this.solves = data.solves;
    this.canSave = canSave;
    this.#seeded = data.seeded;
    if (!this.#seeded) {
      this.solves = [...this.solves, ...seedSolves()].sort(byTime);
      this.#seeded = true;
      this.persist();
    }
  }

  persist(): void {
    const ok = saveStore({
      mode: this.mode,
      goalMs: this.goalMs,
      seeded: this.#seeded,
      // $state のプロキシを素の配列に戻してから保存する。
      solves: $state.snapshot(this.solves) as Solve[],
    });
    this.canSave = ok;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.persist();
  }

  setGoal(goalMs: GoalMs): void {
    this.goalMs = goalMs;
    this.persist();
  }

  add(solve: Solve): void {
    this.solves = [...this.solves, solve];
    this.persist();
  }

  remove(id: string): void {
    this.solves = this.solves.filter((s) => s.id !== id);
    this.persist();
  }

  replaceAll(solves: Solve[]): void {
    this.solves = [...solves].sort(byTime);
    this.persist();
  }
}

export const app = new AppState();
