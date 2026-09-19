/**
 * Space の効きがフォーカス位置で変わらないようにするための判定。
 *
 * 元の実装は `document` でキーを拾っていたが、
 *  - CSV の textarea にフォーカスが残ると Space が完全に死ぬ
 *  - 「削除」ボタン等にフォーカスが残ると Space がボタンの click も誘発する
 * という形でフォーカス依存が残っていた。
 * ここでは「文字入力中だけ Space を譲り、それ以外は必ずタイマーが取る」を徹底する。
 */

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

/** 文字入力中か。ここに当たるときだけ Space をアプリ側で使わない。 */
export function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'SELECT') return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  return false;
}

/** Space / Enter で誤作動しうるフォーカス可能な操作要素か。 */
export function isActivatable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return !!el.closest('button, summary, a[href], input, select, textarea, [tabindex]');
}

/**
 * タイマー以外に残ったフォーカスを外し、パッドに戻す。
 * 文字入力中は何もしない。戻したときだけ true。
 */
export function restoreFocus(pad: HTMLElement | null): boolean {
  if (!pad) return false;
  const active = document.activeElement;
  if (active === pad) return false;
  if (isTextEntry(active)) return false;
  if (active instanceof HTMLElement && active !== document.body) active.blur();
  // preventScroll: 画面下の「削除」を押した直後にページ先頭へ飛ばさない。
  pad.focus({ preventScroll: true });
  return true;
}
