import './styles/main.scss';
// AA-TEST (temporary): ?aa gives every 3D face a transparent outline, to compare edge smoothing
if (new URLSearchParams(location.search).has('aa')) document.documentElement.classList.add('aa-test');
import { initAnalytics, track } from './analytics';
import { initChrome } from './chrome';
import { createEditor } from './editor';
import { fitStages } from './fit';
import { initFullscreen } from './fullscreen';
import { LiveEdit, type Part } from './live-edit';
import { openShareMenu } from './share-menu';
import { shortHint } from './short-hint';
import { dotsHtml, initTint, modeHtml } from './tint';
import { initGroupLists } from './group-list';
import { initHero, initShapes } from './hero';
import { initStickyBars } from './sticky-bars';
import { trackDownloads, videoButton } from './video';
import { initZoom, STAGE_THEME_EVENT, stageTheme, zoomHtml } from './zoom';
import { cardMenuHtml, initCardLook } from './card-look';
import { interactionHtml } from './models/interaction';
import { demos, type GroupedDemo } from './models';
import { GROUPS, GROUP_ORDER, type Group } from './models/groups';
import { snippets } from './models/snippets';
import { CATEGORY_LABEL, type Category, type Demo } from './models/types';
import { highlight, type Lang } from './highlight';
import { hydrateIcons, icon } from './icons';
import { sizeScene } from './models/size';

const REPO = 'https://github.com/Evirtual/css-3d-lab';
const KOFI = 'https://ko-fi.com/edgarasneverdauskas';

// Real SCSS source of every demo, pulled in at build time so it can never drift.
const scssSources = import.meta.glob<string>('./styles/models/_*.scss', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const scssFor = (id: string): string => scssSources[`./styles/models/_${id}.scss`] ?? '';

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

/* ---------- state ---------- */

interface Filters {
  q: string;
  cat: 'all' | Category;
  group: 'all' | Group;
  tags: Set<string>;
}

const params = new URLSearchParams(location.search);
const catParam = params.get('cat');
const groupParam = params.get('group') as Group | null;
const state: Filters = {
  q: params.get('q') ?? '',
  cat: catParam === 'css' || catParam === 'js' ? catParam : 'all',
  group: groupParam && groupParam in GROUPS ? groupParam : 'all',
  tags: new Set((params.get('tags') ?? '').split(',').filter(Boolean)),
};

const matches = (d: GroupedDemo, f: Filters): boolean => {
  if (f.cat !== 'all' && d.category !== f.cat) return false;
  if (f.group !== 'all' && d.group !== f.group) return false;
  for (const t of f.tags) if (!d.tags.includes(t)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  const haystack = [d.title, d.description, CATEGORY_LABEL[d.category], GROUPS[d.group], ...d.tags, ...d.technique].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
};

const count = (f: Filters): number => demos.filter((d) => matches(d, f)).length;

/* ---------- mounting demos ---------- */

let uid = 0;

function mount(demo: Demo, stage: HTMLElement): () => void {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  sizeScene(scene, demo.id);
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
    ${interactionHtml(demo)}
    ${cardMenuHtml(demo.id)}
    <div class="card__body">
      <span class="card__group">${GROUPS[demo.group]}</span>
      <header>
        <h2><a href="models/${demo.id}/">${demo.title}</a></h2>
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
initCardLook(); // each card's own preview options
fitStages(grid); // each demo scales with its card

/* ---------- filters ---------- */

const tabsEl = $('#tabs');
const groupsEl = $('#groups');
const tagsEl = $('#tags');
const statusEl = $('#status');
const tagsBtn = $<HTMLButtonElement>('#tags-toggle');
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
  if (state.group !== 'all') p.set('group', state.group);
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

  const groups: Array<['all' | Group, string]> = [['all', 'All groups'], ...GROUP_ORDER.map((g): [Group, string] => [g, GROUPS[g]])];
  groupsEl.innerHTML = groups
    .map(([group, label]) => {
      const n = count({ ...state, group });
      const on = state.group === group;
      return `<button type="button" class="group" data-group="${group}" aria-pressed="${on}"${n === 0 && !on ? ' disabled' : ''}>${label} <b>${n}</b></button>`;
    })
    .join('');
  const hiddenByFilters = demos.length - count(state);
  if (hiddenByFilters) {
    groupsEl.insertAdjacentHTML(
      'afterbegin',
      `<button type="button" class="group group--clear" data-clear title="Clear every filter">${icon('x')} Clear <b>${hiddenByFilters} hidden</b></button>`,
    );
  }
  // the tag list lives behind a button; the button says how many tags are on
  tagsBtn.innerHTML = `${icon('hash')} <span class="btn__label">Tags</span>${state.tags.size ? ` <b>${state.tags.size}</b>` : ''}`;
  tagsBtn.setAttribute('aria-label', state.tags.size ? `Tags, ${state.tags.size} selected` : 'Tags');
  tagsBtn.classList.toggle('is-on', state.tags.size > 0);
  queueMicrotask(revealSelectedGroup);

  // Tags that would leave nothing to show are left out (the selected ones always stay).
  tagsEl.innerHTML = allTags
    .map((tag) => {
      const on = state.tags.has(tag);
      const n = on ? count(state) : count({ ...state, tags: new Set([...state.tags, tag]) });
      if (n === 0 && !on) return '';
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

  // Announced to screen readers only; on screen the counts on every filter say the same.
  const shown = Math.min(limit, matching);
  statusEl.textContent = matching === demos.length ? `${demos.length} effects` : `${matching} of ${demos.length} effects match`;

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
initAnalytics();
trackDownloads(track);
initHero();
initShapes();
initStickyBars();
initGroupLists();

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
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cat],[data-group],[data-tag],[data-clear],[data-open],[data-more]');
  if (!el) return;
  if (el.dataset.open) return openViewer(el.dataset.open);
  if ('more' in el.dataset) {
    limit += PAGE;
    return render();
  }
  if (el.matches('.tab')) state.cat = el.dataset.cat as Filters['cat'];
  else if (el.dataset.group) state.group = el.dataset.group as Filters['group'];
  else if (el.dataset.tag) state.tags.has(el.dataset.tag) ? state.tags.delete(el.dataset.tag) : state.tags.add(el.dataset.tag);
  else if ('clear' in el.dataset) {
    state.q = searchEl.value = '';
    state.cat = 'all';
    state.group = 'all';
    state.tags.clear();
  } else return;
  applyFilters();
});

/* ---------- groups and tags rows: fades / arrows only where there is more to scroll ---------- */
function scrollRow(row: HTMLElement): { update: () => void; reveal: (el: HTMLElement | null) => void } {
  const track = row.querySelector<HTMLElement>('.scrollrow__track')!;
  const update = () => {
    const { scrollLeft, scrollWidth, clientWidth } = track;
    row.classList.toggle('can-prev', scrollLeft > 2);
    row.classList.toggle('can-next', scrollLeft + clientWidth < scrollWidth - 2);
  };
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  for (const [sel, dir] of [['.scrollrow__arrow--prev', -1], ['.scrollrow__arrow--next', 1]] as const) {
    row.querySelector(sel)!.addEventListener('click', () => track.scrollBy({ left: dir * track.clientWidth * 0.7, behavior: 'smooth' }));
  }
  // bring a chosen pill into view, clear of the fading edges
  const reveal = (el: HTMLElement | null) => {
    if (el) {
      const { offsetLeft, offsetWidth } = el;
      const { scrollLeft, clientWidth } = track;
      if (offsetLeft < scrollLeft + 48) track.scrollLeft = offsetLeft - 48;
      else if (offsetLeft + offsetWidth > scrollLeft + clientWidth - 48) track.scrollLeft = offsetLeft + offsetWidth - clientWidth + 48;
    }
    update();
  };
  return { update, reveal };
}
const tagsRow = $('#tags-row');
const groupsScroll = scrollRow(groupsEl.closest<HTMLElement>('.scrollrow')!);
const tagsScroll = scrollRow(tagsRow);
function revealSelectedGroup(): void {
  groupsScroll.reveal(groupsEl.querySelector<HTMLElement>('.group[aria-pressed="true"]'));
  tagsScroll.update();
}

tagsBtn.addEventListener('click', () => {
  const open = tagsRow.hidden;
  tagsRow.hidden = !open;
  tagsBtn.setAttribute('aria-expanded', String(open));
  tagsScroll.update();
});
// arriving with tags in the URL: show them
if (state.tags.size) tagsBtn.click();

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
let restage: (() => void) | undefined;

interface Pane {
  key: string;
  label: string;
  lang?: Lang;
  code?: string;
}

function openViewer(id: string): void {
  const demo = demos.find((d) => d.id === id);
  if (!demo) return;
  track(`open/${id}`);
  const snip = snippets[id];
  // Edits are stored per demo, so they are shared with the demo's full page.
  const live = new LiveEdit(id, demo.title, { html: snip.html, css: snip.css, ...(snip.js ? { js: snip.js } : {}) });
  const panes: Pane[] = [
    { key: 'html', label: 'HTML', lang: 'html' },
    { key: 'css', label: 'CSS', lang: 'css' },
    ...(snip.js ? [{ key: 'js', label: 'JS', lang: 'js' as Lang }] : []),
    { key: 'scss', label: 'Sass source', lang: 'scss', code: scssFor(id) },
  ];
  const isPart = (key: string): key is Part => key === 'html' || key === 'css' || key === 'js';
  const lineCount = (code: string) => code.trimEnd().split('\n').length;

  const tab = (p: Pane, cls = '', title = ''): string =>
    `<button type="button" role="tab" class="${cls}" data-pane="${p.key}" aria-selected="${p.key === 'css'}"${title ? ` title="${title}"` : ''}>${p.label}</button>`;

  viewerBody.innerHTML = `
    <header class="viewer__head">
      <p class="viewer__meta">
        <span class="badge badge--${demo.category}">${CATEGORY_LABEL[demo.category]}</span>
        <span class="card__group">${GROUPS[demo.group]}</span>
        <span class="viewer__tags">${demo.tags.map((t) => `#${t}`).join(' ')}</span>
      </p>
      <h2>${demo.title}</h2>
      <p>${demo.description}</p>
    </header>
    <div class="viewer__cols">
      <section>
        <div class="stage-wrap">
          <div class="stage stage--lg"></div>
          ${zoomHtml()}
          <button type="button" class="stage__fs" data-fullscreen aria-label="Full screen"></button>
          <p class="stage__edited" data-edited hidden>Your edited version <button type="button" class="link" data-reset>Reset to original</button></p>
        </div>
        <h3>How it works</h3>
        <ol class="steps">${snip.how.map((s) => `<li>${s}</li>`).join('')}</ol>
        <h3>Key ingredients</h3>
        <ul class="ingredients">${demo.technique.map((t) => `<li><code>${t}</code></li>`).join('')}</ul>
      </section>
      <section class="code">
        <div class="codebox">
          <div class="codebox__bar">
            <div class="codebox__tabs" role="tablist">
              <div class="codebox__seg" title="The standalone snippet: edit it here, copy it into your project">
                ${panes.filter((p) => isPart(p.key)).map((p) => tab(p)).join('')}
              </div>
              ${tab(panes.find((p) => p.key === 'scss')!, 'codebox__tab--source', 'How this site builds the effect, using the project Sass mixins. For reading, not for pasting')}
            </div>
            <div class="codebox__look">${dotsHtml()}${modeHtml()}</div>
            <button type="button" class="codebox__copy" data-copy="pane">${icon('copy')} Copy</button>
          </div>
          <div class="code__panel"></div>
          <div class="codebox__foot"><span class="code__note"></span><span class="codebox__lines"></span></div>
        </div>
        <div class="code__actions">
          <button type="button" class="btn btn--accent" data-copy="file">${icon('copy')} Copy as one HTML file</button>
          ${videoButton(id)}
          <button type="button" class="btn" data-act="print">${icon('printer')} Print / PDF</button>
          <button type="button" class="btn" data-act="share">${icon('share')} Share</button>
          <button type="button" class="btn" data-act="newtab">${icon('arrow-up-right')} Open in new tab</button>
          <a class="btn" href="${REPO}/blob/main/src/styles/models/_${id}.scss" target="_blank" rel="noopener">Source on GitHub ${icon('arrow-up-right')}</a>
          <a class="btn" href="models/${id}/">Full page ${icon('arrow-right')}</a>
        </div>
        <p class="code__thanks" hidden>Glad it helped. This site is free — if you like, <a href="${KOFI}" target="_blank" rel="noopener">buy me a coffee</a> ${icon('coffee')}</p>
      </section>
    </div>`;

  const stageEl = viewerBody.querySelector<HTMLElement>('.stage')!;
  const editedBar = viewerBody.querySelector<HTMLElement>('[data-edited]')!;
  const panel = viewerBody.querySelector<HTMLElement>('.code__panel')!;
  const note = viewerBody.querySelector<HTMLElement>('.code__note')!;
  const lines = viewerBody.querySelector<HTMLElement>('.codebox__lines')!;
  let current = panes[1];

  /* the stage shows the site's own demo, or the visitor's edited snippet */
  let showingEdit = false;
  const refreshStage = () => {
    if (live.edited) {
      unmountViewer?.();
      unmountViewer = undefined;
      stageEl.replaceChildren(live.frame(stageTheme()));
      showingEdit = true;
    } else if (showingEdit || !stageEl.firstElementChild) {
      unmountViewer = mount(demo, stageEl);
      showingEdit = false;
    }
    editedBar.hidden = !live.edited;
  };
  restage = () => showingEdit && refreshStage(); // an edited frame has the stage theme baked in
  let timer = 0;
  const refreshSoon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(refreshStage, 350); // not on every keystroke
  };

  const show = (pane: Pane) => {
    current = pane;
    for (const t of viewerBody.querySelectorAll<HTMLElement>('[role=tab]')) {
      t.setAttribute('aria-selected', String(t.dataset.pane === pane.key));
    }

    if (isPart(pane.key)) {
      const part = pane.key;
      const editor = createEditor(pane.lang!, pane.label, live.current[part] ?? '', (code) => {
        live.set(part, code);
        lines.textContent = `${lineCount(code)} lines`;
        refreshSoon();
      });
      panel.replaceChildren(editor.el);
      const counts = Object.fromEntries(panes.filter((p) => isPart(p.key)).map((p) => [p.key, lineCount(live.current[p.key as Part] ?? '')]));
      panel.insertAdjacentHTML('beforeend', shortHint(part, counts[part], counts));
      lines.textContent = `${counts[part]} lines`;
      note.textContent = 'Editable \u00b7 type here and the effect updates. Saved in this browser only.';
    } else {
      panel.innerHTML = `<pre><code>${highlight(pane.code!, pane.lang!)}</code></pre>`;
      lines.textContent = `${lineCount(pane.code!)} lines`;
      note.textContent = 'This site\u2019s own stylesheet for this effect (read-only). It needs the project\u2019s Sass mixins, so copy from HTML / CSS instead.';
    }
  };

  const copy = async (btn: HTMLButtonElement, text: string, what: string) => {
    const label = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = `${icon('check')} Copied`;
      track(`copy/${id}/${what}${live.edited ? '/edited' : ''}`);
      viewerBody.querySelector<HTMLElement>('.code__thanks')!.hidden = false;
    } catch {
      btn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (btn.innerHTML = label), 1800);
  };

  viewerBody.onclick = (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-reset]')) {
      live.reset();
      refreshStage();
      show(current);
      track(`reset/${id}`);
      return;
    }
    const act = target.closest<HTMLButtonElement>('[data-act]');
    if (act?.dataset.act === 'share') return openShareMenu(id, demo.title);
    if (act?.dataset.act === 'print') {
      track(`print/${id}`);
      // the current code (edited or not) on an A4 page that opens the print dialog; "Save as PDF" is in there
      window.open(URL.createObjectURL(new Blob([live.printDoc()], { type: 'text/html' })), '_blank', 'noopener');
      return;
    }
    if (act?.dataset.act === 'newtab') {
      track(`run/${id}`);
      window.open(URL.createObjectURL(new Blob([live.doc()], { type: 'text/html' })), '_blank', 'noopener');
      return;
    }
    const el = target.closest<HTMLButtonElement>('[data-pane],[data-copy]');
    if (!el) return;
    if (el.dataset.pane) show(panes.find((p) => p.key === el.dataset.pane)!);
    else if (el.dataset.copy === 'file') void copy(el, live.doc(), 'file');
    else void copy(el, isPart(current.key) ? (live.current[current.key] ?? '') : (current.code ?? ''), current.key);
  };

  initFullscreen(viewerBody);
  fitStages(viewerBody);
  initTint();
  initZoom();
  show(current);
  refreshStage();
  viewer.showModal();
  viewer.scrollTop = 0;
}

document.addEventListener(STAGE_THEME_EVENT, () => restage?.());

viewer.addEventListener('close', () => {
  restage = undefined;
  unmountViewer?.();
  unmountViewer = undefined;
  viewerBody.replaceChildren();
});
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.close(); // backdrop click
});

initChrome();

/* ---------- hero stats ---------- */

$('#stat-total').textContent = String(demos.length);
$('#stat-css').textContent = String(demos.filter((d) => d.category === 'css').length);
$('#stat-js').textContent = String(demos.filter((d) => d.category === 'js').length);

render();
fill();
