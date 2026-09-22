/**
 * Google Identity Services のうち、このアプリが使う分だけの型。
 * 公式の型パッケージを足すほどの面積ではないので手で書いている。
 * https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token?: string;
    expires_in?: string | number;
    scope?: string;
    error?: string;
    error_description?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
    prompt?: '' | 'none' | 'consent' | 'select_account';
  }

  /**
   * `hint` は次回以降アカウント選択を飛ばすためのメールアドレス。
   * GIS 側で `login_hint` に読み替えられて認可 URL に載る。
   */
  interface TokenClient {
    requestAccessToken(overrides?: { prompt?: string; hint?: string }): void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, done?: () => void): void;
}
