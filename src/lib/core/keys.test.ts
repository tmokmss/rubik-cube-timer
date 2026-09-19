// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { isActivatable, isTextEntry, restoreFocus } from './keys';

function html(markup: string) {
  document.body.innerHTML = markup;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('isTextEntry', () => {
  it('textarea は文字入力', () => {
    html('<textarea id="t"></textarea>');
    expect(isTextEntry(document.getElementById('t'))).toBe(true);
  });

  it('readonly の textarea も文字入力扱い(元アプリで Space が死んでいた箇所)', () => {
    html('<textarea id="t" readonly></textarea>');
    expect(isTextEntry(document.getElementById('t'))).toBe(true);
  });

  it('text 系の input は文字入力', () => {
    html('<input id="i" type="text">');
    expect(isTextEntry(document.getElementById('i'))).toBe(true);
  });

  it('file / checkbox / button の input は文字入力ではない', () => {
    html('<input id="f" type="file"><input id="c" type="checkbox"><input id="b" type="button">');
    expect(isTextEntry(document.getElementById('f'))).toBe(false);
    expect(isTextEntry(document.getElementById('c'))).toBe(false);
    expect(isTextEntry(document.getElementById('b'))).toBe(false);
  });

  it('button は文字入力ではない', () => {
    html('<button id="b">x</button>');
    expect(isTextEntry(document.getElementById('b'))).toBe(false);
  });

  it('contenteditable は文字入力', () => {
    html('<div id="d" contenteditable="true"></div>');
    const d = document.getElementById('d') as HTMLElement;
    // jsdom は isContentEditable を実装しないので明示する
    Object.defineProperty(d, 'isContentEditable', { value: true });
    expect(isTextEntry(d)).toBe(true);
  });

  it('null や普通の div は false', () => {
    html('<div id="d"></div>');
    expect(isTextEntry(null)).toBe(false);
    expect(isTextEntry(document.getElementById('d'))).toBe(false);
  });
});

describe('isActivatable', () => {
  it('ボタンの中の要素もボタン扱い', () => {
    html('<button><span id="s">x</span></button>');
    expect(isActivatable(document.getElementById('s'))).toBe(true);
  });

  it('無関係な要素は false', () => {
    html('<p id="p">x</p>');
    expect(isActivatable(document.getElementById('p'))).toBe(false);
  });
});

describe('restoreFocus', () => {
  it('ボタンに残ったフォーカスをパッドに戻す', () => {
    html('<div id="pad" tabindex="0"></div><button id="b">削除</button>');
    const pad = document.getElementById('pad') as HTMLElement;
    const b = document.getElementById('b') as HTMLElement;
    b.focus();
    expect(document.activeElement).toBe(b);
    expect(restoreFocus(pad)).toBe(true);
    expect(document.activeElement).toBe(pad);
  });

  it('文字入力中は奪わない', () => {
    html('<div id="pad" tabindex="0"></div><textarea id="t"></textarea>');
    const pad = document.getElementById('pad') as HTMLElement;
    const t = document.getElementById('t') as HTMLElement;
    t.focus();
    expect(restoreFocus(pad)).toBe(false);
    expect(document.activeElement).toBe(t);
  });

  it('すでにパッドにあるなら何もしない', () => {
    html('<div id="pad" tabindex="0"></div>');
    const pad = document.getElementById('pad') as HTMLElement;
    pad.focus();
    expect(restoreFocus(pad)).toBe(false);
    expect(document.activeElement).toBe(pad);
  });

  it('パッドがまだ無くても落ちない', () => {
    expect(restoreFocus(null)).toBe(false);
  });
});
