// Theme switch and the publishing kit's copy buttons. No dependencies.
// Copy feedback is only ever what happened: "Copied" appears after the clipboard promise resolves;
// if it rejects, the text is selected and the page says so.
(() => {
  const root = document.documentElement;
  const KEY = 'articles-theme';
  const toastEl = document.getElementById('toast');
  let toastTimer;

  function toast(message, bad = false) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.toggle('bad', bad);
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), bad ? 9000 : 3200);
  }

  // --- theme: Auto follows the system; Light and Dark are remembered when storage allows it ---
  const readTheme = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const saveTheme = (value) => {
    try {
      if (value === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, value);
      return true;
    } catch { return false; }
  };
  const applyTheme = (value) => {
    if (value === 'light' || value === 'dark') root.setAttribute('data-theme', value);
    else root.removeAttribute('data-theme');
  };
  const switcher = document.querySelector('.theme-switch');
  if (switcher) {
    const sync = () => {
      const current = root.getAttribute('data-theme') || 'system';
      for (const b of switcher.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.themeValue === current));
    };
    applyTheme(readTheme());
    switcher.hidden = false;
    sync();
    switcher.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme-value]');
      if (!b) return;
      applyTheme(b.dataset.themeValue);
      sync();
      if (!saveTheme(b.dataset.themeValue)) toast('Theme changed for this page only: this browser blocks saving it.');
    });
  }

  // --- the kit: open beside the article on wide screens, folded on phones ---
  const kit = document.getElementById('kit');
  if (kit && window.matchMedia('(min-width: 1100px)').matches) kit.open = true;

  // --- copying ---
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const FAIL = `Couldn't copy — text selected, press ${isMac ? '⌘C' : 'Ctrl+C'}`;

  function select(el) {
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
    el.scrollIntoView({ block: 'nearest' });
    if ('select' in el && typeof el.select === 'function') { el.focus(); el.select(); return; }
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function copied(btn, message) {
    const label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-done');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 2200);
    toast(message);
  }

  function failed(el) {
    select(el);
    toast(FAIL, true);
  }

  async function writeText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('No clipboard access');
    await navigator.clipboard.writeText(text);
  }

  async function copyPlain(btn) {
    const el = document.getElementById(btn.dataset.copy);
    if (!el) return;
    const text = ('value' in el && el.tagName === 'TEXTAREA' ? el.value : el.textContent).trim();
    const what = (btn.getAttribute('aria-label') || btn.textContent).replace(/^Copy\s*/i, '');
    try {
      await writeText(text);
      copied(btn, `Copied ${what || 'text'} (${text.length.toLocaleString('en-US')} characters).`);
    } catch {
      failed(el);
    }
  }

  async function copyRich(btn) {
    const data = JSON.parse(document.getElementById('kit-data').textContent);
    // Plain-text twin of the rich copy, as the browser lays it out.
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:680px;white-space:normal';
    holder.innerHTML = data.richHtml;
    document.body.append(holder);
    const text = holder.innerText.trim();
    holder.remove();
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([data.richHtml], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })]);
        copied(btn, 'Copied as rich text. Images aren’t included: a bold line marks each one, with its address.');
        return;
      } catch { /* try plain text below */ }
    }
    try {
      await writeText(text);
      copied(btn, 'Copied as plain text only: this browser would not copy rich text.');
    } catch {
      failed(document.getElementById('article-body'));
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-copy], button[data-copy-rich]');
    if (!btn) return;
    if (btn.hasAttribute('data-copy-rich')) copyRich(btn); else copyPlain(btn);
  });
})();
