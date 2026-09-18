import './styles/main.scss';
import { demos } from './demos';
import { snippets, standaloneDoc } from './demos/snippets';
import { CATEGORY_LABEL, type Category, type Demo } from './demos/types';
import { highlight, type Lang } from './highlight';
import { hydrateIcons, icon } from './icons';

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

// Lazy mounting, in two rings, so the cost of the page follows what is on screen:
//  - within 600px of the viewport a demo is MOUNTED (so it is already there when it scrolls in),
//  - only while actually on screen is it RUNNING; the rest sit paused via .is-offscreen.
const mounted = new Map<Element, () => void>();
const demoByCard = new Map<Element, Demo>();
const nearby = new IntersectionObserver(
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
  { rootMargin: '600px' },
);
const onScreen = new IntersectionObserver((entries) => {
  for (const e of entries) e.target.classList.toggle('is-offscreen', !e.isIntersecting);
});

for (const [i, demo] of demos.entries()) {
  const card = document.createElement('article');
  card.className = 'card is-offscreen';
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
        <button class="btn btn--accent" type="button" data-open="${demo.id}">Learn &amp; copy ${icon('arrow-right')}</button>
      </footer>
    </div>`;
  demoByCard.set(card, demo);
  nearby.observe(card);
  onScreen.observe(card);
  cards.set(demo.id, card);
  grid.append(card);
}

/* ---------- filters ---------- */

const tabsEl = $('#tabs');
const tagsEl = $('#tags');
const statusEl = $('#status');
const emptyEl = $('#empty');
const searchEl = $<HTMLInputElement>('#search');
const clearEl = $<HTMLButtonElement>('#search-clear');
const filtersEl = $('.filters');
const moreEl = $('#more');

// Cards are revealed a page at a time as the sentinel below the grid scrolls into view.
const PAGE = 12;
let limit = PAGE;
const REVEAL_MARGIN = 400;
const sentinelNear = (): boolean => !moreEl.hidden && moreEl.getBoundingClientRect().top < window.innerHeight + REVEAL_MARGIN;

/** Reveal pages until the sentinel is pushed out of range (one page normally, more on a tall screen). */
function fill(): void {
  while (sentinelNear()) {
    limit += PAGE;
    render();
  }
}
// The observer catches the sentinel arriving; the scroll listener covers the case where it was
// already in range and therefore never "arrives" (for example after a filter change).
new IntersectionObserver(fill, { rootMargin: `${REVEAL_MARGIN}px` }).observe(moreEl);
window.addEventListener('scroll', fill, { passive: true });

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

  let matching = 0;
  for (const demo of demos) {
    const card = cards.get(demo.id)!;
    const isMatch = matches(demo, state);
    const visible = isMatch && matching < limit;
    // entrance stagger restarts with every revealed page
    if (visible && card.hidden) card.style.setProperty('--n', String(matching % PAGE));
    card.hidden = !visible;
    if (isMatch) matching++;
  }

  // The status line always says how many are on screen, how many match, and how many filters hide.
  const shown = Math.min(limit, matching);
  const filteredOut = demos.length - matching;
  const parts = [
    shown < matching
      ? `Showing <b>${shown}</b> of ${matching} ${filteredOut ? 'matching' : 'demos'} · more load as you scroll`
      : filteredOut
        ? `Showing all <b>${matching}</b> matching`
        : `Showing all <b>${demos.length}</b> demos`,
  ];
  if (filteredOut) {
    parts.push(`${filteredOut} hidden by your filters <button type="button" class="link" data-clear>Show all</button>`);
  }
  statusEl.innerHTML = parts.join(' · ');
  emptyEl.hidden = matching > 0;
  clearEl.hidden = !state.q;
  moreEl.hidden = shown >= matching;
  syncUrl();
}

/** A filter changed: start again from the first page, at the top of the results. */
function applyFilters(): void {
  limit = PAGE;
  render();
  // The filter bar is sticky, so its own offsetTop moves; the grid's does not.
  const top = grid.offsetTop - filtersEl.offsetHeight;
  // Jump rather than glide: a smooth scroll across thousands of pixels would mount and unmount
  // every demo on the way, and the list under the pointer has just changed anyway.
  if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
  fill();
}

hydrateIcons();

searchEl.value = state.q;
clearEl.addEventListener('click', () => {
  state.q = searchEl.value = '';
  applyFilters();
  searchEl.focus();
});
searchEl.addEventListener('input', () => {
  state.q = searchEl.value;
  applyFilters();
});

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cat],[data-tag],[data-clear],[data-open],[data-more]');
  if (!el) return;
  if (el.dataset.open) return openViewer(el.dataset.open);
  if ('more' in el.dataset) {
    limit += PAGE;
    return render();
  }
  if (el.matches('.tab')) state.cat = el.dataset.cat as Filters['cat'];
  else if (el.dataset.tag) state.tags.has(el.dataset.tag) ? state.tags.delete(el.dataset.tag) : state.tags.add(el.dataset.tag);
  else if ('clear' in el.dataset) {
    state.q = searchEl.value = '';
    state.cat = 'all';
    state.tags.clear();
  } else return;
  applyFilters();
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
    { key: 'run', label: `${icon('play')} Run snippet` },
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
          <button type="button" class="btn btn--accent" data-copy="pane">${icon('copy')} Copy</button>
          <button type="button" class="btn" data-copy="file">Copy as one HTML file</button>
          <a class="btn" href="${REPO}/blob/main/src/styles/demos/_${id}.scss" target="_blank" rel="noopener">Source on GitHub ${icon('arrow-up-right')}</a>
        </div>
        <p class="code__note"></p>
        <p class="code__thanks" hidden>Glad it helped. This site is free — if you like, <a href="${KOFI}" target="_blank" rel="noopener">buy me a coffee</a> ${icon('coffee')}</p>
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
    const label = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = `${icon('check')} Copied`;
      viewerBody.querySelector<HTMLElement>('.code__thanks')!.hidden = false;
    } catch {
      btn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (btn.innerHTML = label), 1800);
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
  pauseBtn.innerHTML = paused ? `${icon('play')} Play animations` : `${icon('pause')} Pause animations`;
}
function setTheme(theme: string): void {
  root.dataset.theme = theme;
  themeBtn.innerHTML = theme === 'dark' ? `${icon('sun')} Light` : `${icon('moon')} Dark`;
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
fill();
