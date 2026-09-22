import * as drive from './core/drive';
import { DriveError } from './core/drive';
import { mergeAll, parseSyncDoc, type SyncDoc, type SyncSide } from './core/sync';
import type { Solve, Tombstone } from './core/types';
import { app } from './state.svelte';

/**
 * ブラウザだけで完結させるため、Google Identity Services の token model を使う。
 * バックエンドが無いのでリフレッシュトークンは持てず、アクセストークンは1時間ほどで切れる。
 *
 * クライアント ID は公開前提の値。秘密ではなく、Google Cloud 側の
 * 「承認済みの JavaScript 生成元」で守る。
 */
const CLIENT_ID = '1083694666626-vtdcngn8os7d20glk7cjo62uagpefjam.apps.googleusercontent.com';

/** アプリ専用の隠しフォルダだけ。利用者の他の Drive ファイルは見えない。 */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CONSENTED_KEY = 'cube-split-timer:drive-consented';
const LAST_SYNC_KEY = 'cube-split-timer:drive-last-sync';

/**
 * 同期しているアカウントのメールアドレス。認可のヒントに使うだけで、資格情報ではない。
 * 理由は `#getToken` のコメント。
 */
const ACCOUNT_KEY = 'cube-split-timer:drive-account';

/** アクセストークンの置き場。持たせている理由は `#token` のコメント。 */
const TOKEN_KEY = 'cube-split-timer:drive-token';

/**
 * 記録が増減してから送るまでの待ち。続けて何本も回すときに毎回上げない。
 * 長くしすぎると「計測して即アプリを閉じる」で送り損ねる。
 */
const CHANGE_DELAY_MS = 4_000;

/** 復帰のたびに叩かないための下限。未送信の変更があるときは無視する。 */
const RESUME_INTERVAL_MS = 60_000;

/** 同時に書かれていたときのやり直し回数。1回で収まるはずだが、無限には粘らせない。 */
const PUSH_ATTEMPTS = 3;

/**
 * 同期のきっかけ。`manual` は「同期」ボタン。`auto` は記録の増減・起動・復帰。
 *
 * **`auto` は認可を取りに行かない。持っているトークンが生きているときだけ動く。**
 * GIS の token model は `prompt: ''` でも必ずポップアップを開く(隠し iframe で
 * 済ませる道は無い)。同意済みで一瞬で閉じる場合でも、操作していないのに Google の
 * ウィンドウが出ることに変わりはない。起動のたびにそれが出るのは受け入れられないので、
 * 取り直しは「同期」ボタンに限る。トークンは1時間もつので、押した後しばらくは全部自動で揃う。
 */
type Reason = 'manual' | 'auto';

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // プライベートモード等。同期そのものは動くので黙って諦める。
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 同上。
  }
}

class DriveSync {
  working = $state(false);
  message = $state<{ kind: 'ok' | 'ng'; text: string } | null>(null);
  lastSyncedAt = $state<string | null>(readLocal(LAST_SYNC_KEY));

  /** 手元にまだ Drive へ送れていない変更があるか。UI のヒントに使う。 */
  pending = $state(false);

  /**
   * 自動同期が止まっている状態。トークンが切れたか、権限を取り消された。
   * ボタンを押してもらうしかないので、そのことだけ UI に出す。
   */
  needsAuth = $state(false);

  /**
   * アクセストークンは localStorage に持つ。開き直しても期限内なら認可をやり直さずに済む。
   *
   * 資格情報の永続化は本来避けたいが、このアプリでは割に合うと判断した。
   * スコープは `drive.appdata` だけなので、漏れても読めるのは**このアプリの隠しフォルダ**
   * だけ。有効期間は1時間。描画は全部 Svelte のエスケープを通り(`@html` も `innerHTML` も
   * 使っていない)、実行時依存はゼロ、他人のコンテンツを表示する経路も無いので、
   * 盗み出す側の足場が無い。
   *
   * ビルド時にサプライチェーンを汚染された場合は取られるが、それはメモリに置いていても
   * `callback` をフックされて同じこと。localStorage にするかどうかで露出は変わらない。
   */
  #token: string | null = null;
  #expiresAt = 0;

  #changeTimer: ReturnType<typeof setTimeout> | null = null;
  /** 自動同期を最後に「試した」時刻。失敗も数える(連打しないため)。 */
  #lastAutoAt = 0;
  /** 同期中にボタンを押されたか。終わってからもう一度、手押しとして回す。 */
  #againManual = false;

  constructor() {
    const raw = readLocal(TOKEN_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { token?: unknown; expiresAt?: unknown };
      if (typeof saved.token === 'string' && typeof saved.expiresAt === 'number') {
        this.#token = saved.token;
        this.#expiresAt = saved.expiresAt;
      }
    } catch {
      // 壊れていたら無かったことにして取り直す。
    }
    // 期限切れを抱えたままにしない。
    if (!this.#token || Date.now() >= this.#expiresAt) this.#forgetToken();
  }

  /** 「同期」ボタン。ここでだけ認可の画面を出してよい。 */
  async sync(): Promise<void> {
    await this.#run('manual');
  }

  /**
   * 記録が増減したとき。続けて起きた変化はまとめて1回にする。
   * 送れなくても `pending` は立てたままにして、次の機会に持ち越す。
   */
  changed(): void {
    this.pending = true;
    if (this.#changeTimer) clearTimeout(this.#changeTimer);
    this.#changeTimer = setTimeout(() => {
      this.#changeTimer = null;
      void this.#run('auto');
    }, CHANGE_DELAY_MS);
  }

  /**
   * 起動したとき・画面に戻ってきたとき・オンラインに復帰したとき。
   * PWA は閉じても再読み込みされないので、「開いた」は復帰の方で拾う。
   */
  resume(): void {
    if (!this.pending && Date.now() - this.#lastAutoAt < RESUME_INTERVAL_MS) return;
    void this.#run('auto');
  }

  destroy(): void {
    if (this.#changeTimer) clearTimeout(this.#changeTimer);
    this.#changeTimer = null;
  }

  async #run(reason: Reason): Promise<void> {
    if (this.working) {
      // 手押しは取りこぼしたくないので、終わってからもう一度回す。
      // 自動として回し直すと、認可が切れていたときに黙って何もしないことになる。
      if (reason === 'manual') this.#againManual = true;
      return;
    }
    // 自動は生きたトークンがあるときだけ。無ければ何もしない(ボタンは残っている)。
    if (reason === 'auto') {
      this.#lastAutoAt = Date.now();
      if (!this.#autoReady()) {
        // 一度も繋いでいないなら黙っている。繋いだ後で切れたときだけ知らせる。
        if (readLocal(CONSENTED_KEY) && !this.#hasFreshToken()) this.needsAuth = true;
        return;
      }
    }

    this.working = true;
    if (reason === 'manual') this.message = null;
    try {
      const token = await this.#getToken(reason);
      await this.#rememberAccount(token);
      const { added, removed, updatedAt } = await this.#push(token);

      this.lastSyncedAt = updatedAt;
      writeLocal(LAST_SYNC_KEY, updatedAt);
      this.pending = false;
      this.needsAuth = false;

      const parts: string[] = [];
      if (added) parts.push(`${added}件を取り込みました`);
      if (removed) parts.push(`${removed}件が別の端末で消されていました`);
      // 自動のときは何か動いたときだけ知らせる。毎回「差分なし」とは言わない。
      if (parts.length) this.message = { kind: 'ok', text: `${parts.join('。')}。` };
      else if (reason === 'manual') {
        this.message = { kind: 'ok', text: '同期しました。差分はありませんでした。' };
      }
    } catch (e) {
      // 401 は期限切れか権限の取り消し。どちらも押し直してもらうしかない。
      const expired = e instanceof DriveError && e.status === 401;
      if (expired) this.#forgetToken();
      if (reason === 'manual') {
        this.message = expired
          ? {
              kind: 'ng',
              text: 'Google の許可の期限が切れました。もう一度「同期」を押してください。',
            }
          : {
              kind: 'ng',
              text: e instanceof Error && e.message ? e.message : '同期できませんでした。',
            };
      } else if (expired) {
        // 自動では取り直せない。押してもらう必要があることだけ UI に出す。
        this.needsAuth = true;
      }
      // 自動の失敗はそれ以外を黙って飲む。`pending` は立ったままなので次の機会に再挑戦する。
    } finally {
      this.working = false;
      if (this.#againManual) {
        this.#againManual = false;
        setTimeout(() => void this.#run('manual'), 0);
      }
    }
  }

  /**
   * 落として混ぜて書き戻す。
   *
   * 書き込みは last-writer-wins なので、書く直前にもう一度 `version` を見て、
   * 間に他の端末が書いていたらやり直す。取得と PATCH の隙間は消せないが、
   * 「同期まるごとの長さ」から「1往復」まで縮む。
   * 仮にすり抜けても、各端末は自分の控えを持ったままなので次の同期で戻る。
   */
  async #push(token: string): Promise<{ added: number; removed: number; updatedAt: string }> {
    for (let attempt = 1; ; attempt++) {
      const files = await drive.findFiles(token);

      const remotes: SyncSide[] = [];
      for (const f of files) {
        const remote = parseSyncDoc(await drive.download(token, f.id));
        // 在るのに読めないファイルを「空」として扱うと、他の端末にしか無い記録を
        // こちらの中身で上書きしてしまう。触らずに諦める方がよい。
        if (!remote) {
          throw new DriveError(
            'Drive のファイルを読めませんでした。上書きを避けるため中断します。',
          );
        }
        remotes.push(remote);
      }

      const merged = mergeAll(
        {
          solves: $state.snapshot(app.solves) as Solve[],
          deleted: $state.snapshot(app.deleted) as Tombstone[],
        },
        remotes,
      );
      app.applySync(merged.solves, merged.deleted);

      const { added, removed } = merged;
      const doc: SyncDoc = {
        version: 1,
        updatedAt: new Date().toISOString(),
        solves: merged.solves,
        deleted: merged.deleted,
      };

      const target = files[0];
      if (!target) {
        await drive.create(token, doc);
        return { added, removed, updatedAt: doc.updatedAt };
      }
      if ((await drive.fileVersion(token, target.id)) === target.version) {
        await drive.update(token, target.id, doc);
        return { added, removed, updatedAt: doc.updatedAt };
      }
      if (attempt >= PUSH_ATTEMPTS) {
        throw new DriveError('他の端末が書き込み中のようです。少し待ってからやり直してください。');
      }
      // 相手の書き込みを取り込み直してからもう一度。
    }
  }

  /** 画面を出さずに同期できるか。認可が要るなら自動では動かさない。 */
  #autoReady(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return this.#hasFreshToken();
  }

  #hasFreshToken(): boolean {
    return !!this.#token && Date.now() < this.#expiresAt - 60_000;
  }

  #forgetToken(): void {
    this.#token = null;
    this.#expiresAt = 0;
    removeLocal(TOKEN_KEY);
  }

  /**
   * 次の認可でアカウント選択を飛ばせるように、同期しているアカウントを覚える。
   * 一度取れたら聞き直さない。取れなくても同期は動く(選択画面が出るだけ)ので黙って諦める。
   */
  async #rememberAccount(token: string): Promise<void> {
    if (readLocal(ACCOUNT_KEY)) return;
    try {
      const email = await drive.findAccountEmail(token);
      if (email) writeLocal(ACCOUNT_KEY, email);
    } catch {
      // ヒントが無いままでも困らない。
    }
  }

  /**
   * トークンは1時間で切れるので、開き直すたびにここを通る。
   * したがって「画面を出さずに取り直せるか」が使い勝手をほぼ決める。
   *
   * `prompt: ''` は GIS の中で「認可 URL から `prompt` を落とす」に化ける
   * (`''` は `undefined` でも truthy でもないので、既定の `select_account` も付かない)。
   * こうすると Google 側の判断に委ねられ、同意済みのアカウントが一意に決まるときだけ
   * 無言でトークンが返る。
   *
   * **`hint` を省くとここが「一意に決まらない」に倒れる。** Google に複数アカウントで
   * ログインしていると、毎回アカウント選択が出る。メールアドレスを `login_hint` として
   * 渡して、どれを使うかをこちらで指定する。
   *
   * それでも**ポップアップ自体は必ず開く**。だから自動同期はここへ来ない。
   */
  async #getToken(reason: Reason): Promise<string> {
    // 期限ぎりぎりのトークンで往復を始めない。
    if (this.#token && this.#hasFreshToken()) return this.#token;
    // 自動で Google のウィンドウを開かない。呼び出し側が先に弾いている想定。
    if (reason === 'auto') throw new Error('自動同期には有効なトークンが要ります。');

    const hint = readLocal(ACCOUNT_KEY);
    await this.#loadGis();

    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (res) => {
          if (res.error || !res.access_token) {
            // ヒントのアカウントが使えないまま覚えていると詰む。次は選び直させる。
            removeLocal(ACCOUNT_KEY);
            reject(new Error(res.error_description || res.error || '認可されませんでした。'));
            return;
          }
          this.#token = res.access_token;
          this.#expiresAt = Date.now() + Number(res.expires_in ?? 3600) * 1000;
          writeLocal(TOKEN_KEY, JSON.stringify({ token: this.#token, expiresAt: this.#expiresAt }));
          writeLocal(CONSENTED_KEY, '1');
          resolve(res.access_token);
        },
        // ウィンドウを閉じただけ。意図的な取り消しなのでヒントは捨てない。
        error_callback: (err) =>
          reject(new Error(err.message || '認可のウィンドウが閉じられました。')),
      });
      client.requestAccessToken({
        prompt: readLocal(CONSENTED_KEY) ? '' : 'consent',
        ...(hint ? { hint } : {}),
      });
    });
  }

  /**
   * GIS のスクリプトは同期するときだけ読む。
   * 最初から読むと、オフライン起動や初回表示に外部スクリプトを巻き込むことになる。
   */
  async #loadGis(): Promise<void> {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) return;

    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error('Google の認証スクリプトを読み込めませんでした。'));
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', fail, { once: true });
        return;
      }
      const el = document.createElement('script');
      el.src = GIS_SRC;
      el.async = true;
      el.addEventListener('load', () => resolve(), { once: true });
      el.addEventListener('error', fail, { once: true });
      document.head.appendChild(el);
    });

    if (typeof google === 'undefined' || !google.accounts?.oauth2) {
      throw new Error('Google の認証スクリプトを読み込めませんでした。');
    }
  }
}

export const driveSync = new DriveSync();
