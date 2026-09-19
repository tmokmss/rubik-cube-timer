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

  <p class="io-help">
    記録を自分の Google Drive の「アプリ専用フォルダ」に置いて、スマホと PC で揃えます。
    このアプリが作ったファイル以外は見えません。両方の端末で押すと双方向に揃い、
    片方で消した記録は相手でも消えます。
  </p>
</section>
