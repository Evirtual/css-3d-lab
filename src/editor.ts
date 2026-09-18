import { highlight, type Lang } from './highlight';

/**
 * A tiny code editor: a transparent <textarea> laid exactly over a highlighted <pre>.
 * You type into the textarea (so caret, selection, undo, IME and mobile keyboards are all the
 * browser's own), and see the highlighted copy underneath. Both sit in one grid cell, so they
 * always have the same size and scroll together inside whatever container holds them.
 */
export interface Editor {
  el: HTMLElement;
  value(): string;
  set(code: string): void;
}

export function createEditor(lang: Lang, label: string, code: string, onInput: (code: string) => void): Editor {
  const el = document.createElement('div');
  el.className = 'editor';

  const pre = document.createElement('pre');
  pre.setAttribute('aria-hidden', 'true');
  const out = document.createElement('code');
  pre.append(out);

  const input = document.createElement('textarea');
  input.spellcheck = false;
  input.autocapitalize = 'off';
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('aria-label', `${label} code, editable`);
  input.wrap = 'off';

  // The trailing newline keeps the <pre> as tall as the textarea when the code ends in a blank line.
  const paint = () => (out.innerHTML = `${highlight(input.value, lang)}\n`);

  input.addEventListener('input', () => {
    paint();
    onInput(input.value);
  });

  // Tab indents instead of leaving the editor. Escape hands Tab back to the page, so keyboard
  // users are never trapped inside the textarea.
  let tabIndents = true;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tabIndents = false;
    if (e.key !== 'Tab' || !tabIndents || e.shiftKey) return;
    e.preventDefault();
    input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input'));
  });
  input.addEventListener('focus', () => (tabIndents = true));

  el.append(pre, input);
  const set = (next: string) => {
    input.value = next;
    paint();
  };
  set(code);
  return { el, value: () => input.value, set };
}
