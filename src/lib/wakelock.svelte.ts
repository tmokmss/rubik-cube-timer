/**
 * 練習中に画面が消えないようにする。
 *
 * ずっと掴んだままだと、机に置きっぱなしのときに電池を食い続けるので、
 * 無操作が続いたら自分から手放し、次の操作で取り直す。
 */
const IDLE_MS = 5 * 60 * 1000;

export class ScreenWakeLock {
  readonly supported: boolean;
  active = $state(false);

  #sentinel: WakeLockSentinel | null = null;
  /** 掴んでいたい状態か。取得は非同期なので意図を別に持つ。 */
  #want = false;
  #idleTimer = 0;

  constructor() {
    this.supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  /** 操作があったことを伝える。取り直し、無操作が続けば自動で手放す。 */
  poke(): void {
    if (!this.supported) return;
    this.#want = true;
    void this.#acquire();
    clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => {
      this.#want = false;
      void this.#release();
    }, IDLE_MS);
  }

  /** タブが隠れると OS 側で勝手に解除される。戻ってきたら取り直す。 */
  syncWithVisibility(): void {
    if (document.visibilityState === 'visible') {
      if (this.#want) void this.#acquire();
    } else {
      this.#sentinel = null;
      this.active = false;
    }
  }

  destroy(): void {
    clearTimeout(this.#idleTimer);
    this.#want = false;
    void this.#release();
  }

  async #acquire(): Promise<void> {
    if (!this.supported || this.#sentinel) return;
    if (document.visibilityState !== 'visible') return;
    try {
      const s = await navigator.wakeLock.request('screen');
      // 待っている間に手放す方へ倒れていたら、すぐ返す。
      if (!this.#want) {
        void s.release();
        return;
      }
      this.#sentinel = s;
      this.active = true;
      s.addEventListener('release', () => {
        if (this.#sentinel === s) {
          this.#sentinel = null;
          this.active = false;
        }
      });
    } catch {
      // 電池残量が少ない等で断られることがある。諦めてよい。
      this.active = false;
    }
  }

  async #release(): Promise<void> {
    const s = this.#sentinel;
    this.#sentinel = null;
    this.active = false;
    if (!s) return;
    try {
      await s.release();
    } catch {
      // すでに解除済み。
    }
  }
}
