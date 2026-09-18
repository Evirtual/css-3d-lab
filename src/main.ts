import './styles/main.scss';
import { demos } from './demos';
import { snippets, standaloneDoc } from './demos/snippets';
import { CATEGORY_LABEL, type Category, type Demo } from './demos/types';
import { highlight, type Lang } from './highlight';

const REPO = 'https://github.com/Evirtual/css-3d-lab';
const KOFI = 'https://ko-fi.com/edgarasneverdauskas';

// Real SCSS source of every demo, pulled in at build time so it can never drift.
const scssSources = import.meta.glob<string>('./styles/demos/_*.scss', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const scssFor = (id: string): string => scssSources[`./styles/demos/_${id}.scss`] ?? '';

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

/* ---------- state ---------- */

interface Filters {
  q: string;
  cat: 'all' | Category;
  tags: Set<string>;
}

const params = new URLSearchParams(location.search);
const catParam = params.get('cat');
const state: Filters = {
  q: params.get('q') ?? '',
  cat: catParam === 'css' || catParam === 'js' ? catParam : 'all',
  tags: new Set((params.get('tags') ?? '').split(',').filter(Boolean)),
};

const matches = (d: Demo, f: Filters): boolean => {
  if (f.cat !== 'all' && d.category !== f.cat) return false;
  for (const t of f.tags) if (!d.tags.includes(t)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  const haystack = [d.title, d.description, CATEGORY_LABEL[d.category], ...d.tags, ...d.technique].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
};

const count = (f: Filters): number => demos.filter((d) => matches(d, f)).length;

/* ---------- mounting demos ---------- */

let uid = 0;

function mount(demo: Demo, stage: HTMLElement): () => void {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  scene.innerHTML = demo.html.replaceAll('{{uid}}', String(++uid));
  stage.replaceChildren(scene);
  const cleanup = demo.init?.(scene, stage);
  return () => {
    cleanup?.();
    stage.replaceChildren();
  };
}

/* ---------- grid ---------- */

const grid = $('#grid');
const cards = new Map<string, HTMLElement>();

// Lazy mounting: a demo only exists in the DOM while its card is near the viewport,
// so the cost of the page depends on what is on screen, not on how many demos there are.
const mounted = new Map<Element, () => void>();
const demoByCard = new Map<Element, Demo>();
const visibility = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting && !mounted.has(e.target)) {
        mounted.set(e.target, mount(demoByCard.get(e.target)!, e.target.querySelector<HTMLElement>('.stage')!));
      } else if (!e.isIntersecting) {
        mounted.get(e.target)?.();
        mounted.delete(e.target);
      }
    }
  },
  { rootMargin: '250px' },
);

for (const [i, demo] of demos.entries()) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.cat = demo.category;
  card.style.setProperty('--n', String(i));
  card.innerHTML = `
    <div class="stage"></div>
    <div class="card__body">
      <header>
        <h2>${demo.title}</h2>
        <span class="badge badge--${demo.category}">${CATEGORY_LABEL[demo.category]}</span>
      </header>
      <p>${demo.description}</p>
      <footer>
        <ul class="card__tags">${demo.tags.map((t) => `<li>#${t}</li>`).join('')}</ul>
        <button class="btn btn--accent" type="button" data-open="${demo.id}">Learn &amp; copy →</button>
      </footer>
    </div>`;
  demoByCard.set(card, demo);
  visibility.observe(card);
  cards.set(demo.id, card);
  grid.append(card);
}

/* ---------- filters ---------- */

const tabsEl = $('#tabs');
const tagsEl = $('#tags');
const statusEl = $('#status');
const emptyEl = $('#empty');
const searchEl = $<HTMLInputElement>('#search');
const allTags = [...new Set(demos.flatMap((d) => d.tags))].sort();

function syncUrl(): void {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q.trim());
  if (state.cat !== 'all') p.set('cat', state.cat);
  if (state.tags.size) p.set('tags', [...state.tags].join(','));
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function render(): void {
  // Every count is "what you would see if you clicked this", given the other active filters.
  const tabs: Array<['all' | Category, string]> = [['all', 'All'], ['css', CATEGORY_LABEL.css], ['js', CATEGORY_LABEL.js]];
  tabsEl.innerHTML = tabs
    .map(([cat, label]) => {
      const n = count({ ...state, cat });
      return `<button type="button" class="tab" data-cat="${cat}" aria-pressed="${state.cat === cat}">${label} <b>${n}</b></button>`;
    })
    .join('');

  tagsEl.innerHTML = allTags
    .map((tag) => {
      const on = state.tags.has(tag);
      const n = on ? count(state) : count({ ...state, tags: new Set([...state.tags, tag]) });
      return `<button type="button" class="chip" data-tag="${tag}" aria-pressed="${on}"${n === 0 && !on ? ' disabled' : ''}>#${tag} <b>${n}</b></button>`;
    })
    .join('');

  let shown = 0;
  for (const demo of demos) {
    const visible = matches(demo, state);
    cards.get(demo.id)!.hidden = !visible;
    if (visible) shown++;
  }
  const hidden = demos.length - shown;
  statusEl.innerHTML = hidden
    ? `Showing <b>${shown}</b> of ${demos.length} demos · ${hidden} hidden by your filters <button type="button" class="link" data-clear>Show all</button>`
    : `Showing all <b>${demos.length}</b> demos`;
  emptyEl.hidden = shown > 0;
  syncUrl();
}

searchEl.value = state.q;
searchEl.addEventListener('input', () => {
  state.q = searchEl.value;
  render();
});

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cat],[data-tag],[data-clear],[data-open]');
  if (!el) return;
  if (el.dataset.open) return openViewer(el.dataset.open);
  if (el.matches('.tab')) state.cat = el.dataset.cat as Filters['cat'];
  else if (el.dataset.tag) state.tags.has(el.dataset.tag) ? state.tags.delete(el.dataset.tag) : state.tags.add(el.dataset.tag);
  else if ('clear' in el.dataset) {
    state.q = searchEl.value = '';
    state.cat = 'all';
    state.tags.clear();
  } else return;
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !(e.target as HTMLElement).matches('input, textarea')) {
    e.preventDefault();
    searchEl.focus();
  }
});

/* ---------- detail viewer ---------- */

const viewer = $<HTMLDialogElement>('#viewer');
const viewerBody = $('#viewer-body');
let unmountViewer: (() => void) | undefined;

interface Pane {
  key: string;
  label: string;
  lang?: Lang;
  code?: string;
}

function openViewer(id: string): void {
  const demo = demos.find((d) => d.id === id);
  if (!demo) return;
  const snip = snippets[id];
  const panes: Pane[] = [
    { key: 'html', label: 'HTML', lang: 'html', code: snip.html },
    { key: 'css', label: 'CSS', lang: 'css', code: snip.css },
    ...(snip.js ? [{ key: 'js', label: 'JS', lang: 'js' as Lang, code: snip.js }] : []),
    { key: 'run', label: '▶ Run snippet' },
    { key: 'scss', label: 'SCSS used here', lang: 'scss', code: scssFor(id) },
  ];

  viewerBody.innerHTML = `
    <header class="viewer__head">
      <span class="badge badge--${demo.category}">${CATEGORY_LABEL[demo.category]}</span>
      <h2>${demo.title}</h2>
      <p>${demo.description}</p>
    </header>
    <div class="viewer__cols">
      <section>
        <div class="stage stage--lg"></div>
        <h3>How it works</h3>
        <ol class="steps">${snip.how.map((s) => `<li>${s}</li>`).join('')}</ol>
        <h3>Key ingredients</h3>
        <ul class="ingredients">${demo.technique.map((t) => `<li><code>${t}</code></li>`).join('')}</ul>
      </section>
      <section class="code">
        <div class="code__tabs" role="tablist">
          ${panes.map((p, i) => `<button type="button" role="tab" data-pane="${p.key}" aria-selected="${i === 1}">${p.label}</button>`).join('')}
        </div>
        <div class="code__panel"></div>
        <div class="code__actions">
          <button type="button" class="btn btn--accent" data-copy="pane">Copy</button>
          <button type="button" class="btn" data-copy="file">Copy as one HTML file</button>
          <a class="btn" href="${REPO}/blob/main/src/styles/demos/_${id}.scss" target="_blank" rel="noopener">Source on GitHub ↗</a>
        </div>
        <p class="code__note"></p>
        <p class="code__thanks" hidden>Glad it helped. This site is free — if you like, <a href="${KOFI}" target="_blank" rel="noopener">buy me a coffee ☕</a></p>
      </section>
    </div>`;

  const panel = viewerBody.querySelector<HTMLElement>('.code__panel')!;
  const note = viewerBody.querySelector<HTMLElement>('.code__note')!;
  const copyPane = viewerBody.querySelector<HTMLButtonElement>('[data-copy=pane]')!;
  let current = panes[1];

  const show = (pane: Pane) => {
    current = pane;
    for (const tab of viewerBody.querySelectorAll<HTMLElement>('[data-pane]')) {
      tab.setAttribute('aria-selected', String(tab.dataset.pane === pane.key));
    }
    copyPane.hidden = pane.key === 'run';
    if (pane.key === 'run') {
      const frame = document.createElement('iframe');
      frame.title = `${demo.title} — standalone snippet`;
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.srcdoc = standaloneDoc(demo.title, snip);
      panel.replaceChildren(frame);
      note.textContent = 'This is the HTML + CSS' + (snip.js ? ' + JS' : '') + ' snippet running on its own in an isolated frame — exactly what you get when you paste it.';
    } else {
      panel.innerHTML = `<pre><code>${highlight(pane.code!, pane.lang!)}</code></pre>`;
      note.textContent =
        pane.key === 'scss'
          ? 'The actual stylesheet behind the demo on this page. It leans on this project’s Sass mixins and colour tokens — use the HTML/CSS tabs for a paste-anywhere version.'
          : 'Minimal standalone version: plain CSS, no build step, no dependencies.';
    }
  };

  const copy = async (btn: HTMLButtonElement, text: string) => {
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied ✓';
      viewerBody.querySelector<HTMLElement>('.code__thanks')!.hidden = false;
    } catch {
      btn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (btn.textContent = label), 1800);
  };

  viewerBody.onclick = (e) => {
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pane],[data-copy]');
    if (!el) return;
    if (el.dataset.pane) show(panes.find((p) => p.key === el.dataset.pane)!);
    else if (el.dataset.copy === 'file') void copy(el, standaloneDoc(demo.title, snip));
    else if (current.code) void copy(el, current.code);
  };

  show(current);
  unmountViewer = mount(demo, viewerBody.querySelector<HTMLElement>('.stage')!);
  viewer.showModal();
  viewer.scrollTop = 0;
}

viewer.addEventListener('close', () => {
  unmountViewer?.();
  unmountViewer = undefined;
  viewerBody.replaceChildren();
});
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.close(); // backdrop click
});

/* ---------- options: pause + theme ---------- */

const store = {
  get: (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string): void => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the choice just won't persist */
    }
  },
};

const root = document.documentElement;
const pauseBtn = $('#pause');
const themeBtn = $('#theme');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setPaused(paused: boolean): void {
  root.toggleAttribute('data-paused', paused);
  pauseBtn.setAttribute('aria-pressed', String(paused));
  pauseBtn.textContent = paused ? '▶ Play animations' : '❚❚ Pause animations';
}
function setTheme(theme: string): void {
  root.dataset.theme = theme;
  themeBtn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
}

// Respect the OS "reduce motion" setting: start paused, but leave the choice to the visitor.
setPaused(reducedMotion);
setTheme(store.get('theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

pauseBtn.addEventListener('click', () => setPaused(!root.hasAttribute('data-paused')));
themeBtn.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  store.set('theme', next);
});

/* ---------- hero stats ---------- */

$('#stat-total').textContent = String(demos.length);
$('#stat-css').textContent = String(demos.filter((d) => d.category === 'css').length);
$('#stat-js').textContent = String(demos.filter((d) => d.category === 'js').length);

render();
