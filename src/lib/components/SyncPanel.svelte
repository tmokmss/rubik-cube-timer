<script lang="ts">
  import { dateLabel } from '../core/format';
  import { driveSync } from '../drive.svelte';
</script>

<section class="panel">
  <div class="panel-head">
    <h2>端末間の同期</h2>
    {#if driveSync.lastSyncedAt}
      <span class="sync-at num">最終同期 {dateLabel(driveSync.lastSyncedAt)}</span>
    {/if}
  </div>

  <div class="io">
    <button
      type="button"
      class="btn"
      disabled={driveSync.working}
      onclick={() => driveSync.sync()}
    >
      {driveSync.working ? '同期中…' : 'Google Drive と同期'}
    </button>
  </div>

  {#if driveSync.message}
    <p class="io-msg {driveSync.message.kind}">{driveSync.message.text}</p>
  {/if}

  {#if driveSync.needsAuth}
    <p class="io-help">
      {driveSync.pending ? 'まだ送れていない変更があります。' : ''}Google
      の許可が切れて自動同期が止まっています。押すと再開します。
    </p>
  {:else if driveSync.pending && !driveSync.working}
    <p class="io-help">まだ送れていない変更があります。</p>
  {/if}

  <p class="io-help">
    記録を自分の Google Drive の「アプリ専用フォルダ」に置いて、スマホと PC で揃えます。
    このアプリが作ったファイル以外は見えません。一度押すと、記録を取ったとき・消したとき・
    アプリを開いたときに自動で揃うようになります。ただし Google の許可は1時間で切れるので、
    そのあとは押して繋ぎ直します(勝手に Google の画面を出さないため)。
  </p>
</section>
