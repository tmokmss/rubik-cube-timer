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

/**
 * appDataFolder の中の保存ファイルを探す。無ければ null。
 * appDataFolder はこのアプリ専用の隠しフォルダで、利用者の他のファイルは見えない。
 */
export async function findFileId(token: string): Promise<string | null> {
  const url = new URL(`${API}/files`);
  url.searchParams.set('spaces', 'appDataFolder');
  url.searchParams.set('q', `name = '${SYNC_FILE_NAME}' and trashed = false`);
  url.searchParams.set('fields', 'files(id,modifiedTime)');
  url.searchParams.set('pageSize', '10');
  const json = (await (await call(url.toString(), token)).json()) as {
    files?: Array<{ id: string }>;
  };
  return json.files?.[0]?.id ?? null;
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
