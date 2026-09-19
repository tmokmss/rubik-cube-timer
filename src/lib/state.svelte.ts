import { loadStore, saveStore } from './core/storage';
import { reviveTombstones, tombstoneFor } from './core/sync';
import {
  DEFAULT_GOAL_MS,
  type GoalMs,
  type Mode,
  type Solve,
  type SplitStageName,
  type StageName,
  type Tombstone,
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
  /** 消した記録。端末間で同期するときに復活させないために持つ。 */
  deleted = $state<Tombstone[]>([]);
  /** localStorage が使えない環境では false。UI に警告を出す。 */
  canSave = $state(true);

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
    this.deleted = data.deleted;
    this.canSave = canSave;
  }

  persist(): void {
    const ok = saveStore({
      mode: this.mode,
      goalMs: this.goalMs,
      // $state のプロキシを素の配列に戻してから保存する。
      solves: $state.snapshot(this.solves) as Solve[],
      deleted: $state.snapshot(this.deleted) as Tombstone[],
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
    const target = this.solves.find((s) => s.id === id);
    this.solves = this.solves.filter((s) => s.id !== id);
    // 墓標を残さないと、次の同期で相手から復活してしまう。
    if (target) this.deleted = [...this.deleted, tombstoneFor($state.snapshot(target) as Solve)];
    this.persist();
  }

  /** ファイルからの取り込み。明示的に入れ直したものは墓標を外して復活させる。 */
  replaceAll(solves: Solve[]): void {
    const next = [...solves].sort(byTime);
    this.deleted = reviveTombstones($state.snapshot(this.deleted) as Tombstone[], next);
    this.solves = next;
    this.persist();
  }

  /** Drive とのマージ結果を反映する。 */
  applySync(solves: Solve[], deleted: Tombstone[]): void {
    this.solves = [...solves].sort(byTime);
    this.deleted = deleted;
    this.persist();
  }
}

export const app = new AppState();
