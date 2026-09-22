import * as drive from './core/drive';
import { DriveError } from './core/drive';
import { mergeDocs, parseSyncDoc, type SyncDoc } from './core/sync';
import type { Solve, Tombstone } from './core/types';
import { app } from './state.svelte';

/**
 * ブラウザだけで完結させるため、Google Identity Services の token model を使う。
 * バックエンドが無いのでリフレッシュトークンは持てず、アクセストークンは1時間ほどで切れる。
 * 取り直しにはユーザー操作が要るので、裏で勝手に同期はせず「同期する」ボタン起点にしている。
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

  /** アクセストークンは localStorage には置かない(資格情報なので記憶に留める)。 */
  #token: string | null = null;
  #expiresAt = 0;

  async sync(): Promise<void> {
    if (this.working) return;
    this.working = true;
    this.message = null;
    try {
      const token = await this.#getToken();
      await this.#rememberAccount(token);
      const fileId = await drive.findFileId(token);
      const remote = fileId ? parseSyncDoc(await drive.download(token, fileId)) : null;

      const merged = mergeDocs(
        {
          solves: $state.snapshot(app.solves) as Solve[],
          deleted: $state.snapshot(app.deleted) as Tombstone[],
        },
        remote ?? { solves: [], deleted: [] },
      );
      app.applySync(merged.solves, merged.deleted);

      const doc: SyncDoc = {
        version: 1,
        updatedAt: new Date().toISOString(),
        solves: merged.solves,
        deleted: merged.deleted,
      };
      if (fileId) await drive.update(token, fileId, doc);
      else await drive.create(token, doc);

      this.lastSyncedAt = doc.updatedAt;
      writeLocal(LAST_SYNC_KEY, doc.updatedAt);

      const parts: string[] = [];
      if (merged.added) parts.push(`${merged.added}件を取り込みました`);
      if (merged.removed) parts.push(`${merged.removed}件が別の端末で消されていました`);
      this.message = {
        kind: 'ok',
        text: parts.length ? `${parts.join('。')}。` : '同期しました。差分はありませんでした。',
      };
    } catch (e) {
      // 401 は期限切れか権限の取り消し。次に押したときに取り直させる。
      if (e instanceof DriveError && e.status === 401) {
        this.#forgetToken();
        this.message = {
          kind: 'ng',
          text: 'Google の許可の期限が切れました。もう一度「同期」を押してください。',
        };
      } else {
        this.message = {
          kind: 'ng',
          text: e instanceof Error && e.message ? e.message : '同期できませんでした。',
        };
      }
    } finally {
      this.working = false;
    }
  }

  #forgetToken(): void {
    this.#token = null;
    this.#expiresAt = 0;
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
   * トークンはメモリにしか無いので、アプリを開き直すたびにここを通る。
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
   */
  async #getToken(): Promise<string> {
    // 期限ぎりぎりのトークンで往復を始めない。
    if (this.#token && Date.now() < this.#expiresAt - 60_000) return this.#token;
    await this.#loadGis();

    const hint = readLocal(ACCOUNT_KEY);

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
   * GIS のスクリプトは押されたときだけ読む。
   * 毎回読むと、オフライン起動や初回表示に外部スクリプトを巻き込むことになる。
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
