import { SYNC_FILE_NAME, type SyncDoc } from './sync';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function call(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new DriveError('Google Drive に繋がりませんでした。通信を確認してください。');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new DriveError(
      `Google Drive の呼び出しに失敗しました (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
      res.status,
    );
  }
  return res;
}

/** appDataFolder に置いた保存ファイル。 */
export interface RemoteFile {
  id: string;
  /**
   * サーバー側の更新ごとに増える番号。書き込む直前にもう一度読んで、
   * 間に他の端末が書いていないかを確かめるために使う。
   */
  version: string;
}

/**
 * appDataFolder の中の保存ファイルを古い順に返す。
 * appDataFolder はこのアプリ専用の隠しフォルダで、利用者の他のファイルは見えない。
 *
 * 常に1つのはずだが、2台の初回同期がぶつかると2つできうる。どれを正とするかが
 * 端末ごとにぶれないよう `createdTime` で並べ、読むときは見つかった全部を混ぜる。
 */
export async function findFiles(token: string): Promise<RemoteFile[]> {
  const url = new URL(`${API}/files`);
  url.searchParams.set('spaces', 'appDataFolder');
  url.searchParams.set('q', `name = '${SYNC_FILE_NAME}' and trashed = false`);
  url.searchParams.set('fields', 'files(id,version)');
  url.searchParams.set('orderBy', 'createdTime');
  url.searchParams.set('pageSize', '10');
  const json = (await (await call(url.toString(), token)).json()) as {
    files?: Array<{ id: string; version?: string }>;
  };
  return (json.files ?? []).map((f) => ({ id: f.id, version: f.version ?? '' }));
}

/** 書き込む直前の突き合わせ用。`findFiles` が返した `version` と比べる。 */
export async function fileVersion(token: string, fileId: string): Promise<string> {
  const json = (await (
    await call(`${API}/files/${encodeURIComponent(fileId)}?fields=version`, token)
  ).json()) as { version?: string };
  return json.version ?? '';
}

/**
 * 同期に使っているアカウントのメールアドレス。次の認可で `login_hint` に渡し、
 * アカウント選択の画面を出させないためだけに使う。
 *
 * `about.get` は `drive.appdata` スコープで呼べるので、これのためにスコープは増えない。
 * `fields` は必須。
 */
export async function findAccountEmail(token: string): Promise<string | null> {
  const json = (await (await call(`${API}/about?fields=user(emailAddress)`, token)).json()) as {
    user?: { emailAddress?: string };
  };
  return json.user?.emailAddress ?? null;
}

export async function download(token: string, fileId: string): Promise<unknown> {
  const res = await call(`${API}/files/${encodeURIComponent(fileId)}?alt=media`, token);
  return res.json().catch(() => null);
}

export async function create(token: string, doc: SyncDoc): Promise<string> {
  const boundary = `b${Math.random().toString(36).slice(2)}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: SYNC_FILE_NAME, parents: ['appDataFolder'] }),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(doc),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const json = (await (
    await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, token, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
  ).json()) as { id: string };
  return json.id;
}

export async function update(token: string, fileId: string, doc: SyncDoc): Promise<void> {
  await call(`${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(doc),
  });
}
