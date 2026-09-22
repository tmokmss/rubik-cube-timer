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
</section>
