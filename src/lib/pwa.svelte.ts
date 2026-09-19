import { registerSW } from 'virtual:pwa-register';

/**
 * Service Worker の更新。
 *
 * 自動更新にすると新版の配信時にページがリロードされる。計測中にそれをやられると
 * 記録が飛ぶので、通知だけ出して反映のタイミングは利用者に委ねる。
 */
class PwaState {
  needRefresh = $state(false);
  applying = $state(false);
  #update: ((reload?: boolean) => Promise<void>) | null = null;

  register(): void {
    this.#update = registerSW({
      onNeedRefresh: () => {
        this.needRefresh = true;
      },
    });
  }

  /** 新版を有効にしてリロードする。 */
  apply(): void {
    if (this.applying) return;
    this.applying = true;
    this.needRefresh = false;
    void this.#update?.(true);
    // 主導権の移譲を取りこぼしても、押して何も起きない状態にはしない。
    setTimeout(() => location.reload(), 2000);
  }
}

export const pwa = new PwaState();
