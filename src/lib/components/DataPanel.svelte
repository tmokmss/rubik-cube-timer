<script lang="ts">
  import {
    ImportError,
    downloadText,
    mergeSolves,
    parseImport,
    stampedName,
    toCsv,
    toJson,
  } from '../core/io';
  import type { Solve } from '../core/types';

  let {
    solves,
    onReplace,
  }: { solves: Solve[]; onReplace: (solves: Solve[]) => void } = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let pasted = $state('');
  let message = $state<{ kind: 'ok' | 'ng'; text: string } | null>(null);
  let csvOpen = $state(false);

  const csv = $derived(csvOpen ? toCsv(solves) : '');

  function take(text: string) {
    try {
      const incoming = parseImport(text);
      const { solves: merged, added, skipped } = mergeSolves(solves, incoming);
      onReplace(merged);
      message = {
        kind: 'ok',
        text:
          added > 0
            ? `${added}件を取り込みました。${skipped > 0 ? `重複していた${skipped}件は飛ばしました。` : ''}`
            : `新しい記録はありませんでした(${skipped}件はすでにあります)。`,
      };
      pasted = '';
    } catch (e) {
      message = {
        kind: 'ng',
        text: e instanceof ImportError ? e.message : '取り込めませんでした。',
      };
    }
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      take(await file.text());
    } finally {
      // 同じファイルをもう一度選べるようにする。
      input.value = '';
    }
  }
</script>

<section class="panel">
  <div class="panel-head">
    <h2>データの持ち出しと取り込み</h2>
  </div>

  <div class="io">
    <button
      type="button"
      class="btn"
      onclick={() => downloadText(stampedName('json'), toJson(solves), 'application/json')}
      disabled={solves.length === 0}
    >
      JSONで書き出す
    </button>
    <button
      type="button"
      class="btn"
      onclick={() => downloadText(stampedName('csv'), toCsv(solves), 'text/csv')}
      disabled={solves.length === 0}
    >
      CSVで書き出す
    </button>
    <button type="button" class="btn" onclick={() => fileInput?.click()}>
      ファイルから取り込む
    </button>
    <input
      bind:this={fileInput}
      class="visually-hidden"
      type="file"
      accept=".json,.csv,application/json,text/csv,text/plain"
      onchange={onFile}
    />
  </div>

  <p class="io-help">
    JSON / CSV のどちらでも取り込めます。すでにある記録(同じ日時・同じ合計)は飛ばすので、
    同じファイルを二度取り込んでも増えません。
  </p>

  {#if message}
    <p class="io-msg {message.kind}">{message.text}</p>
  {/if}

  <details>
    <summary>貼り付けて取り込む</summary>
    <textarea
      bind:value={pasted}
      placeholder="書き出した JSON か CSV を貼り付け"
      onkeydown={(e) => {
        if (e.key === 'Escape') (e.currentTarget as HTMLTextAreaElement).blur();
      }}
    ></textarea>
    <div class="io" style="margin-top:8px">
      <button type="button" class="btn" onclick={() => take(pasted)} disabled={!pasted.trim()}>
        取り込む
      </button>
    </div>
  </details>

  <details ontoggle={(e) => (csvOpen = (e.currentTarget as HTMLDetailsElement).open)}>
    <summary>CSVで見る</summary>
    <textarea
      readonly
      value={csv}
      onkeydown={(e) => {
        if (e.key === 'Escape') (e.currentTarget as HTMLTextAreaElement).blur();
      }}
    ></textarea>
  </details>
</section>
