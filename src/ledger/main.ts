import { icon } from '../icons.ts';
/* The ledger's behaviour, split out of docs/ledger.html and built by Vite like the app's own.
   Nothing here changed in the split. */

(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = [
    // short names for the same exclusive buckets as the summary: never read as running totals
    { key: 'to check', short: 'To check', long: 'to check: an automated check is not cleared', cls: 's-conv', color: 'var(--st-conv)' },
    { key: 'approved', short: 'Approved', long: 'approved', cls: 's-ok', color: 'var(--st-ok)' },
  ];
  /** The overall status as one compact pill; the bucket's full name is in the tooltip. */
  const chipFor = (s, won = false) => { const x = STATUS.find((y) => y.key === s); return `<span class="chip ${x?.cls ?? 's-none'}${won ? ' won' : ''}" data-tip data-tiptext="${esc(x ? `Status: ${x.long}` : s)}">${esc(x?.short ?? s)}</span>`; };

  /** Seconds since an ISO time, or null. */
  const age = (iso) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? (Date.now() - t) / 1000 : null; };
  const fmtAge = (s) => {
    if (s == null) return 'unknown';
    if (s < -5) return 'in the future (clock skew?)';
    s = Math.max(0, s);
    if (s < 90) return `${Math.round(s)} s ago`;
    if (s < 5400) return `${Math.round(s / 60)} min ago`;
    if (s < 129600) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
  };
  const ago = (iso) => fmtAge(age(iso));
  /** The same age, at the width a table column can spare: "18m ago", "5h ago", "2d ago". The exact
      local date and time is never dropped -- it moves into the tooltip beside the commit it belongs
      to -- so the short form is a convenience and not the only place the moment is written. */
  const fmtAgeShort = (s) => {
    if (s == null) return 'unknown';
    if (s < -5) return 'ahead';
    s = Math.max(0, s);
    if (s < 60) return 'just now';
    if (s < 5400) return `${Math.round(s / 60)}m ago`;
    if (s < 172800) return `${Math.round(s / 3600)}h ago`;
    if (s < 5184000) return `${Math.round(s / 86400)}d ago`;
    return `${Math.round(s / 2592000)}mo ago`;
  };
  /** A live "N s ago": the one-second tick rewrites every [data-ago]. */
  const agoSpan = (iso) => `<span data-ago="${esc(iso ?? '')}">${esc(ago(iso))}</span>`;
  const when = (iso) => iso ? `${esc(new Date(iso).toLocaleString())} (${agoSpan(iso)})` : 'unknown';
  const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ---------- theme (per viewer, a convenience only) ---------- */
  const modes = ['auto', 'light', 'dark'];
  let mode = 'auto';
  try { mode = localStorage.getItem('ledger-theme') || 'auto'; } catch {}
  const applyTheme = () => {
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    /*
     * Update the LABEL, not the button.
     *
     * paintNavIcons wraps each header button as .nav__i (the glyph) + .nav__t (the words), so
     * setting the button's textContent threw the icon away and the next paint put it back -- and
     * hiding the words with CSS left a pill with no icon and no label, an empty circle in the
     * header. Twice. The words live in .nav__t; that is the thing to write to.
     */
    const themeLabel = mode === 'auto' ? 'follows the system' : mode;
    const themeText = $('theme').querySelector('.nav__t') ?? $('theme');
    themeText.textContent = `Theme: ${mode}`;
    $('theme').setAttribute('aria-label', `Theme: ${themeLabel}. Click to change.`);
    $('theme').dataset.tiptext = `Theme: ${themeLabel}. Click to change: auto, light, dark.`;
    $('theme').dataset.tip = '';
    /* Icon-only now, so the icon IS the label: a sun that never changes on a button whose whole
       job is switching between light, dark and auto is a control that reports nothing. The
       words survive in .nav__t for a screen reader and in the tooltip for a mouse. */
    const themeIcon = $('theme').querySelector('.nav__i');
    if (themeIcon) themeIcon.innerHTML = icon(mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'contrast');
  };
  $('theme').addEventListener('click', () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    try { localStorage.setItem('ledger-theme', mode); } catch {}
    applyTheme();
  });
  applyTheme();

  /* ---------- checks ---------- */
  /* The checks come from the ledger (ledger.json checkList, written from scripts/checks-registry.mjs):
     a check registered there gets its bar, its column, its part in "checked" and its definition here
     without this page changing. A ledger built before the registry falls back to the four it had. */
  const OLD_CHECKS = [
    { key: 'models', scope: 'model', name: 'contract', short: 'Contract', title: 'Contract check (check-models)' },
    { key: 'stages', scope: 'model', name: 'stages', short: 'Stages', title: 'Same on every surface (check-stages)' },
    { key: 'motion', scope: 'model', name: 'motion', short: 'Motion', title: 'Motion flags (check-motion)' },
    { key: 'exports', scope: 'model', name: 'exports', short: 'Export', title: 'Export at default settings (check-exports)' },
  ];
  let CHECK_LIST = OLD_CHECKS, CHECK_NAMES = {}, COLS = [], GATE_NAME = {};
  function syncChecks(list) {
    CHECK_LIST = Array.isArray(list) && list.length ? list : OLD_CHECKS;
    CHECK_NAMES = Object.fromEntries(CHECK_LIST.map((c) => [c.key, c.title]));
    COLS = CHECK_LIST.filter((c) => c.scope === 'model').map((c) => [c.key, c.short]);
    GATE_NAME = Object.fromEntries(CHECK_LIST.map((c) => [c.key, c.name]));
  }
  syncChecks(null);

  /* ---------- a check's sub-steps: what it covers, part by part ---------- */
  /* The list of parts is the check's own declaration (ledger.json checkList `steps`, from
     scripts/checks-registry.mjs). Where each part stands is `stepTotals`, which
     scripts/capture-check.mjs read back out of the lines every recorded result kept. Nothing here
     fills a gap: a part no result speaks to says so, and a part the check does not judge yet says
     "not implemented yet". */
  /** Which blocks are open, remembered per visitor. Browser storage can be blocked or empty, so every touch is guarded. */
  const SS_KEY = 'ledger.substeps.open';
  let ssOpen = (() => { try { return JSON.parse(localStorage.getItem(SS_KEY) ?? '{}') ?? {}; } catch { return {}; } })();
  const ssSave = () => { try { localStorage.setItem(SS_KEY, JSON.stringify(ssOpen)); } catch {} };
  /** A run's parts start open, so what it is doing now is in sight; a check bar's start closed. */
  const ssDefault = (id) => id.startsWith('run:');
  /** Open, if this visitor has said so before; otherwise the block's own default. */
  const ssIsOpen = (id, dflt = ssDefault(id)) => (typeof ssOpen?.[id] === 'boolean' ? ssOpen[id] : dflt);
  const SS_STATES = [['pass', 'pass', 'var(--k-pass)'], ['fail', 'fail', 'var(--k-fail)'], ['flag', 'flagged', 'var(--k-flag)'],
    ['listed', 'listed, not failed', 'var(--st-conv)'], ['skip', 'skipped', 'var(--k-never)'], ['notRecorded', 'not recorded', 'var(--k-broke)']];
  /*
   * The icons are the app's own set, src/icons.ts: 24x24 Lucide outlines, 2px round stroke,
   * coloured by currentColor and sized by CSS. The ledger had been drawing its own, and before
   * that using the characters U+25B6, U+25A0 and a pair of U+2759 -- and a character is placed by
   * its font's metrics, so a triangle and a square from possibly two different fallback fonts
   * never centre on the same point in the same button. The app had already solved this and
   * written down why. There is no reason for this page to have a second answer.
   */
  const PLAY = icon('play');
  const PAUSE = icon('pause');
  const STOP = icon('stop');
  const ssChevron = '<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true" focusable="false"><path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* No data-tip here: the page's tooltip writes aria-expanded on whatever it points at, which on a
     disclosure would both fight this button's own state and tell a screen reader the wrong thing. */
  /* `iconOnly` is the chevron alone, for a run bar: the bar is one nowrap row of a name, a track,
     a count and its buttons, and a worded disclosure there costs more width than the track. The
     words become the accessible name instead, so nothing is lost to a screen reader. */
  const ssToggle = (id, label, open, iconOnly = false) => `<button type="button" class="sstog${iconOnly ? ' sstog--icon' : ''}" data-ss="${esc(id)}" aria-expanded="${open}" aria-controls="ss-${esc(id)}"${iconOnly ? ` aria-label="${esc(label)}" title="${esc(label)}"` : ''}>${ssChevron}${iconOnly ? '' : esc(label)}</button>`;
  /**
   * The open panel. `c` is a checkList entry; `run` its progress record when one is going, whose
   * `steps` say what THIS run covers and whose `step` is the latest part its output named.
   * The one panel there is: "Running now" and the check bars both draw this, off the same
   * checkList entry and the same `running` record, so a check reads the same while it runs and
   * after. They differ in one thing only: a run's panel starts open, a bar's starts closed.
   */
  function ssPanel(c, id, run) {
    const steps = c.steps ?? [];
    const file = `docs/checks/${c.key}.json`;
    const box = (inner) => `<div class="substeps" id="ss-${esc(id)}">${inner}</div>`;
    if (!steps.length) return box(`<p><b>Not listed yet.</b> ${esc(c.title)} does not say what it covers in <code>scripts/checks-registry.mjs</code>, so there is nothing to show here.</p>`);
    const t = c.stepTotals;
    const passWord = c.scope === 'site' ? 'no finding' : 'pass';
    let head = '';
    if (run) {
      const named = run.step ? steps.find((s) => s.key === run.step) : null;
      head = named
        ? `<p><span class="ss__now${run.alive === false ? ' ss__now--gone' : ''}">${run.alive === false ? 'Stopped' : 'Running now'}</span> <b>${esc(named.label)}</b> <span class="muted">· ${esc(run.stepFrom ?? 'from the check\'s own output')}</span></p>`
        : `<p><span class="ss__now${run.alive === false ? ' ss__now--gone' : ''}">${run.alive === false ? 'Stopped' : 'Running now'}</span> ${run.last ? `${c.unit === 'pages' ? 'page' : 'model'} <code>${esc(run.last)}</code>. ` : ''}This check does not say which part it is on while it runs, so the list below is what the run covers, not where it has got to.</p>`;
    }
    if (!t) head += `<p><b>No sub-step results recorded yet.</b> <code>${esc(file)}</code> was written before the checks read their own parts back${c.captured ? '' : ', and this check has never been captured'}. The list below is what it covers; the counts appear once it runs again (or after <code>npm run capture -- ${esc(c.key)} --steps</code>, which re-reads the file without running the check).</p>`;
    const rows = steps.map((s) => {
      const mine = t?.totals?.[s.key];
      const inRun = run?.steps?.[s.key];
      const now = Boolean(run && run.step === s.key);
      const bits = [];
      if (s.implemented === false) bits.push('<span class="ss__none">not implemented yet</span>');
      else if (mine) {
        const any = SS_STATES.some(([k]) => mine[k] > 0);
        if (!any) bits.push(`<span class="ss__none">not recorded yet</span>`);
        else bits.push(`<span class="ss__counts">${SS_STATES.filter(([k]) => mine[k] > 0).map(([k, label, col]) =>
          `<span class="ss__c"><i style="background:${col}"></i>${esc(k === 'pass' ? passWord : label)} <b>${mine[k]}</b></span>`).join('')}</span>`);
      }
      const why = [];
      for (const [reason, n] of Object.entries(mine?.skipped ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
        why.push(`<span class="ss__why"><b>${n} skipped:</b> ${esc(reason)}</span>`);
      }
      if (inRun && inRun.in === false) why.push(`<span class="ss__why"><b>left out of this run:</b> ${esc(inRun.why ?? 'the arguments it was given do not make it')}</span>`);
      else if (inRun) why.push('<span class="ss__why">in this run</span>');
      return `<li class="ss${now ? ' is-now' : ''}"><div class="ss__head"><span class="ss__name">${esc(s.label)}</span>${bits.join('')}${now ? '<span class="ss__now">on this now</span>' : ''}</div>
        <span class="ss__proves">${esc(s.proves ?? '')}</span>${why.length ? `<span class="ss__counts">${why.join('')}</span>` : ''}</li>`;
    }).join('');
    const loose = Object.entries(t?.unattributed ?? {});
    const foot = t
      ? `<footer>Over the <b>${t.entries}</b> ${c.unit === 'pages' ? 'page' : 'model'} result${t.entries === 1 ? '' : 's'} recorded in <code>${esc(file)}</code> — every result the file holds, not only the ${esc(c.unit === 'pages' ? 'pages' : 'models')} the bar above counts. Read from each result's own lines; a part no line speaks to is counted “not recorded”, never as a pass.${loose.length ? ` ${loose.reduce((n, x) => n + x[1], 0)} line(s) could not be placed under a part and are counted under none of them.` : ''}${c.scope === 'site' ? ' A rule’s “no finding” count is pages the run reported nothing under it — not proof the rule applies to each of them.' : ''}</footer>`
      : '';
    return box(`${head}<ol>${rows}</ol>${foot}`);
  }
  /** Clicking a disclosure remembers the choice and redraws the block it belongs to. */
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-ss]');
    if (!b || !L) return;
    e.stopPropagation();
    const id = b.dataset.ss;
    // read the state from what was remembered, never off the button: the page's tooltip writes
    // aria-expanded on hover, so the attribute is not this disclosure's alone
    ssOpen[id] = !ssIsOpen(id);
    ssSave();
    // Redraw now rather than on the next poll: three seconds between a click and the panel opening
    // reads as a button that does not work.
    redrawControls();
    document.querySelector(`[data-ss="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  });

  /** How many table columns there are, for a row that spans them all. */
  const colCount = () => 5 + COLS.length;
  // checkChip used to live here: a verdict as a text pill. Nothing called it -- it was written,
  // and then the grid was built out of the compact marks below instead, and the pill stayed for
  // months rendering nothing. Deleted rather than kept "in case": dead code that LOOKS like the
  // thing you are reading is how you end up editing the wrong one, which is exactly what happened
  // the first time this ageing was written.

  /* ---------- the compact marks: each has its words in the tooltip and in its accessible name ---------- */
  // Drawn as SVG on a centred 12×12 box, not as text: a font's ✓ ✗ ~ ! – sit off the middle of the
  // circle by different amounts in every font (the legend showed them all a little high and left).
  const ico = (d) => `<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const GLYPH = {
    tick: ico('M2.5 6.2 5 8.6 9.5 3.6'), cross: ico('M3.2 3.2l5.6 5.6M8.8 3.2 3.2 8.8'), tilde: ico('M2.2 6.6c1.2-1.6 2.4-1.6 3.8 0s2.6 1.6 3.8 0'),
    bang: ico('M6 2.6v4.2M6 9.3v.1'), dash: ico('M3 6h6'), bolt: ico('M6.8 2.2 4 6.4h4L5.2 9.8'),
  };
  const MARKS = {
    pass: [GLYPH.tick, 'pass'], cleared: [GLYPH.tick, 'flags cleared'], stale: [GLYPH.tilde, 'passed on older code'], flag: [GLYPH.bang, 'open flags'],
    fail: [GLYPH.cross, 'failed'], broke: [GLYPH.bolt, "didn't run (test crashed)"], never: [GLYPH.dash, 'not run yet'],
  };
  /** What a check result reads as: its mark kind and its words. */
  function markKind(r) {
    if (!r || r.status === 'never') return ['never', 'not run yet'];
    if (r.status === 'untested') return ['never', 'not run at the default settings'];
    if (r.status === 'pass') return r.stale ? ['stale', 'passed on older code'] : ['pass', 'pass'];
    if (r.status === 'flagged' && r.openFlags === 0) return r.stale ? ['stale', 'flags cleared on older code'] : ['cleared', 'flags cleared'];
    if (r.status === 'flagged') return ['flag', `${r.openFlags ?? '?'} open flag${r.openFlags === 1 ? '' : 's'}${r.stale ? ' (older code)' : ''}`];
    // the test crashed or a tab could not be run: the model was never judged, so this is not "failed"
    if (r.status === 'broke' || r.status === 'error') return ['broke', `${r.status === 'error' ? "didn't run (a tab could not be run)" : "didn't run (test crashed)"}${r.stale ? ' (older code)' : ''}`];
    return ['fail', `${{ fail: 'failed' }[r.status] ?? r.status}${r.stale ? ' (older code)' : ''}`];
  }
  const markHtml = (kind, label, tipText, glyph, extra = '', style = '') => `<span class="mk mk--${kind}${extra}"${style ? ` style="${style}"` : ''} role="img" aria-label="${esc(label)}" data-tip data-tiptext="${esc(tipText)}">${glyph}</span>`;
  /** One check's mark for one model. The run in progress, if it is on this model now, pulses. */
  /**
   * Is this check being run on this model at this moment?
   *
   * The run record names the model it last wrote a result for, so the one it is working on is the
   * one after that -- but the record also says which models the run covers and which have already
   * reported, and the honest answer is "this model is in the run and has not reported yet".
   * Until it reports, the mark in its cell is the PREVIOUS verdict: true a minute ago, about to be
   * replaced, and drawn exactly like one that was just confirmed. That is the one thing this page
   * must never do, so the cell says it is being decided.
   */
  function runStateOf(key, m) {
    const p = L.running?.[key];
    if (!isLive(key)) {
      /*
       * The board knows before the ledger does.
       *
       * Running every check on a model spawns one process that walks the checks in turn. Each
       * writes its own result file as it finishes, and the ledger only notices when one of those
       * files changes -- so for the first stretch, and again between checks, the ledger has no
       * record for the check that is actually going and every cell in the row looked idle while
       * the machine was busy on it.
       *
       * The board does know: it holds the process and the models it was given. That is enough to
       * say a cell is waiting its turn -- not which one is under way, which only a result file can
       * settle, so these get the quiet state and not the spinner.
       */
      const on = RUN_NOW.runs.find((r) => r.what === key || r.what === 'all');
      if (!on) return '';
      const over = on.models ?? [];
      return !over.length || over.includes(m.id) ? 'is-waiting' : '';
    }
    const ids = idsOfRun(p);
    if (ids.length && !ids.includes(m.id)) return '';
    if (doneInRun(key, p).has(m.id)) return ''; // it has reported: the mark is this run's answer
    /*
     * Which one is it actually on?
     *
     * The run writes the id of the model it last finished, so the one in flight is the next in
     * the order it is working through that has not reported. That is an inference, not a fact the
     * run states, so only this one gets the "being checked" spinner and the rest get a quieter
     * "waiting its turn" -- and the tooltip says which of the two it is. The reason either exists
     * is that until a model reports, the mark in its cell is the PREVIOUS verdict: true a minute
     * ago, about to be replaced, and otherwise drawn exactly like one just confirmed.
     */
    // The run says which model it is on (capture-check: progress.doing), so take its word for it.
    // What follows is the old guess, kept for a result file written before runs said so: `last`
    // already named the model being worked on, and stepping one past it put the spinner a row
    // below the truth and never on the first model.
    if (p.doing) return p.doing === m.id ? 'is-checking' : 'is-waiting';
    const order = ids.length ? ids : L.models.map((x) => x.id);
    const at = p.last ? order.indexOf(p.last) : -1;
    const done = doneInRun(key, p);
    const next = order.slice(at + 1).find((id) => !done.has(id));
    return next === m.id ? 'is-checking' : 'is-waiting';
  }

  function checkMark(key, m) {
    const r = m.checks[key];
    const [kind, word] = markKind(r);
    const title = CHECK_NAMES[key] ?? key;
    const run = L.running?.[key];
    /*
     * Which model is being checked, asked once.
     *
     * This used to be `run.last === m.id`, and run.last is the model the run last FINISHED --
     * so the ring landed on a model that had already reported, one row from the one actually
     * being worked on, and the legend called it "running on it now". runStateOf infers the one
     * in flight (the next in order that has not reported) and the cell was already tinted from
     * it. One inference, so the mark and the cell it sits in cannot point at different models.
     */
    const now = runStateOf(key, m) === 'is-checking';
    // pressed on this very cell, not yet answered: the same ring, teal rather than amber
    const starting = pendingOn(runKey(key, [m.id])) === 'run';
    const when = r && r.status !== 'never' ? ` Ran ${r.ranAt ? `${new Date(r.ranAt).toLocaleString()}, ${fmtAgeShort(age(r.ranAt))}` : 'at an unknown time'}${r.commit ? ` at ${r.commit}` : ''}.` : ' No captured run has reported this model.';
    // nothing has run here, but the committed snapshot has a verdict: said as the last release's
    // state, with the commit it was taken at, and never folded into the mark, which stays "not run yet"
    const s = r?.status === 'never' ? r.snapshot : null;
    const rel = s ? ` At the last release (commit ${L.release?.head ?? '?'}) this check said "${s.status}"${s.ranAt ? `, run ${new Date(s.ranAt).toLocaleString()}` : ''}. That is the committed snapshot (${L.release?.file ?? 'docs/release-snapshot.json'}), not a run on this machine.` : '';

    const text = `${title}: ${word}.${r?.summary ? ` ${r.summary}.` : ''}${when}${rel}${r?.stale ? ` Stale: ${r.staleWhy.join('; ')}.` : ''}${now ? ' Running on this model now.' : ''}`;
    // How old the verdict is: 0 for its first day, up to 1 a fortnight later. Nothing here judges
    // the model. It only stops "we checked" and "we checked last week" being drawn the same green.
    const secs = r && r.status !== 'never' ? age(r.ranAt) : null;
    const aged = secs == null ? 0 : Math.max(0, Math.min(1, (secs - 86400) / (13 * 86400)));
    return markHtml(kind, `${title}: ${word}${s ? `, ${s.status} at the last release` : ''}${now ? ', running now' : ''}${starting ? ', starting' : ''}`, text, MARKS[kind][0], `${now ? ' is-running' : ''}${starting ? ' is-starting' : ''}${s ? ' mk--wasrel' : ''}`, aged ? `--age:${aged.toFixed(2)}` : '');
  }
  function renderMarkLegend() {
    const items = [['pass', 'pass'], ['cleared', 'flags cleared'], ['stale', 'passed on older code'], ['flag', 'open flags'], ['fail', 'failed'], ['broke', "didn't run (test crashed)"], ['never', 'not run yet']];
    $('marklegend').innerHTML = items.map(([k, w]) => `<span><span class="mk mk--${k}" aria-hidden="true">${MARKS[k][0]}</span>${esc(w)}</span>`).join('')
      + `<span><span class="mk mk--pass is-running" aria-hidden="true">${GLYPH.tick}</span>running on it now</span>`
;
  }

  /* ---------- state ---------- */
  let L = null, W = null, wMissing = false;
  // what the reader has chosen; kept for this tab (a convenience: the page works without it)
  const PAGE = 40; // rows rendered at first, and added each time the list end comes near
  // blk: the blocker (from "What's holding models back") the table is filtered to, or null
  let filter = 'all', group = 'all', tags = new Set(), query = '', limit = PAGE, tagsOpen = false, blk = null;
  const open = new Set();
  try {
    const s = JSON.parse(sessionStorage.getItem('ledger-view') || '{}');
    filter = s.filter || 'all'; group = s.group || 'all'; tags = new Set(s.tags || []); query = s.query || ''; tagsOpen = Boolean(s.tagsOpen); blk = s.blk || null;
    for (const id of s.open || []) open.add(id);
    limit = Math.max(PAGE, s.limit || PAGE);
    if (tags.size) tagsOpen = true; // as the gallery does when it opens with tags picked
  } catch {}
  const saveView = () => { try { sessionStorage.setItem('ledger-view', JSON.stringify({ filter, group, tags: [...tags], query, open: [...open], limit, tagsOpen, blk })); } catch {} };
  let prevSig = null; // model id → what its row shows, to mark rows that changed on a refresh
  let flash = new Set();
  // which models crossed into approved on the last refresh, so only those pills take the sweep
  let justApproved = new Set(), wasStatus = new Map();

  /* One colour per group, taken from the site's palette and picked by the group's key, so a group keeps
     its colour as the list is filtered and re-sorted. It is used for fills, dots and edges only: the
     amber and the pink are too light in one theme or the other to carry small text, so anything written
     in a group's colour is mixed toward --text first. */
  const GROUP_C = ['var(--accent)', 'var(--accent-2)', 'var(--good)', 'var(--warm)', 'var(--hot)'];
  const gcFor = (key) => { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return GROUP_C[h % GROUP_C.length]; };

  const rowSig = (m) => JSON.stringify([m.status, ...COLS.map(([k]) => [m.checks[k]?.status, m.checks[k]?.stale, m.checks[k]?.ranAt]), m.commits.length]);

  /* ---------- the overview: one sentence, one bar, what holds the rest, what is running ---------- */
  /** A rounded bar of segments with a hairline between them; a segment shows its count when there is room. */
  const segBar = (segs, total) => {
    const live = segs.filter((s) => s.n);
    return `<span class="bdbar" aria-hidden="true">${live.map((s) => { const share = s.n / Math.max(1, total); return `<i style="flex-grow:${s.n};background:${s.c}">${share >= 0.15 ? `<em>${s.n}</em>` : ''}</i>`; }).join('')}<i class="bdbar__rest" style="flex-grow:${Math.max(0, total - live.reduce((a, x) => a + x.n, 0))}"></i></span>`;
  };
  /* one swatch per reason, the same in the blockers, the check bars and the table's marks */
  const KIND_SW = { never: 'var(--k-never)', broke: 'var(--k-broke)', flagged: 'var(--k-flag)', failed: 'var(--k-fail)', 'stale-pass': 'var(--k-stale)' };
  const REVIEW_SW = { none: 'var(--k-never)', stale: 'var(--k-stale)', problem: 'var(--k-fail)' };
  const KIND_SHORT = { never: 'not run yet', broke: "didn't run", flagged: 'flagged', failed: 'failed', 'stale-pass': 'passed on older code' };
  const cap = (s) => String(s ?? '').charAt(0).toUpperCase() + String(s ?? '').slice(1);
  const fmtDur = (s) => (s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
  /** How long a run has left at its pace so far: an estimate; null while there is no pace to go by. */
  function etaOf(p) {
    if (!p || p.alive === false || !p.done || !p.total || p.done >= p.total) return null;
    const el = (Date.parse(p.updatedAt) - Date.parse(p.startedAt)) / 1000;
    if (!(el > 0)) return null;
    const per = el / p.done;
    return { left: per * (p.total - p.done), per };
  }
  /** The model ids a run was started on (its args, flags left out), and those it has reported so far. */
  const idsOfRun = (p) => { const known = new Set(L.models.map((m) => m.id)); return (p?.args ?? []).filter((a) => known.has(a)); };
  const doneInRun = (key, p) => new Set(L.models.filter((m) => p?.runId && m.checks[key]?.runId === p.runId).map((m) => m.id));
  /** The words on the filter chip for a blocker key: "motion didn't run", "visual review stale". */
  function chipLabel(key) {
    if (key === 'stale:any') return 'passed on older code';
    if (String(key).startsWith('status:')) return STEP_SHORT[key.slice(7)] ?? key.slice(7);
    const [a, b, c] = String(key).split(':');
    return `${GATE_NAME[a] ?? a} ${KIND_SHORT[b] ?? b}`;
  }

  /* Every filter the overview can set, by key: the ledger's blockers (ledger.json counts.blockers,
     each with its model ids), plus one row folding "passed on older code" across every check. */
  let BLK = new Map();
  function blockerRows() {
    const bl = L.counts?.blockers;
    if (!Array.isArray(bl)) return null;
    for (const b of bl) BLK.set(b.key, { ids: new Set(b.ids), chip: chipLabel(b.key) });
    const byId = new Map(L.models.map((m) => [m.id, m]));
    const stale = bl.filter((b) => b.scope === 'check' && b.kind === 'stale-pass');
    const rows = bl.filter((b) => !stale.includes(b)).map((b) => ({ key: b.key, b, scope: b.scope, count: b.count, alone: b.alone, ids: b.ids }));
    if (stale.length) {
      const ids = [...new Set(stale.flatMap((b) => b.ids))];
      const alone = ids.filter((id) => (byId.get(id)?.holds ?? []).every((h) => h.endsWith(':stale-pass'))).length;
      BLK.set('stale:any', { ids: new Set(ids), chip: chipLabel('stale:any') });
      rows.push({ key: 'stale:any', stale, scope: 'check', count: ids.length, alone, ids });
    }
    // the checks' reasons, largest first; the reviews last
    const rank = () => 1;
    rows.sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? b.count - a.count : 0));
    return rows;
  }
  function blockerText(r) {
    if (r.key === 'stale:any') return {
      title: 'Passed on older code', sw: KIND_SW['stale-pass'],
      why: `${esc(cap(r.stale[0].means))}. By check: ${r.stale.map((s) => `${esc(GATE_NAME[s.check] ?? s.check)} ${s.count}`).join(', ')}.`,
      state: 'A re-run of that check on the current code clears it.',
    };
    const b = r.b;
    const short = CHECK_LIST.find((c) => c.key === b.check)?.short ?? b.check;
    const run = L.running?.[b.check];
    // the models a run in progress has still to reach: named in its args, not reported by it yet
    const reported = run ? doneInRun(b.check, run) : new Set();
    const runIds = run ? new Set(idsOfRun(run).filter((id) => !reported.has(id))) : new Set();
    const inRun = b.ids.filter((id) => runIds.has(id)).length;
    const e = etaOf(run);
    const runLine = !run ? '' : run.alive === false
      ? `A run stopped without finishing (${esc(run.done)} of ${run.total ?? '?'} reported)`
      : `A run is in progress: ${esc(run.done)} of ${run.total ?? '?'} done${e ? `, about ${fmtDur(e.left)} left (estimate)` : ''}`;
    let state = '';
    if (b.kind === 'never') {
      state = run && run.alive !== false ? `${runLine}; ${inRun === b.count ? 'it will reach all of these' : `it will reach ${inRun} of these, not the other ${b.count - inRun}`}.`
        : `${run ? `${runLine}. ` : ''}No run is going that will reach them: <code>npm run capture -- ${esc(b.check)}</code> starts one.`;
    } else if (b.kind === 'broke') {
      // what the test said when it crashed: the most common error among these models
      const errs = new Map();
      for (const id of b.ids) { const s = L.models.find((m) => m.id === id)?.checks[b.check]?.summary || 'no error recorded'; errs.set(s, (errs.get(s) ?? 0) + 1); }
      const [top, topN] = [...errs].sort((x, y) => y[1] - x[1])[0] ?? ['no error recorded', 0];
      const rerun = run && run.alive !== false && inRun ? `The run in progress will reach ${inRun} of them.`
        : 'No re-run is in progress.';
      state = `The test's error: “${esc(top)}”${topN < b.count ? ` (${topN} of ${b.count})` : ''}. ${rerun}`;
    } else if (b.kind === 'flagged') {
      state = 'Open one in the table for what it saw. A flag does not hold the model back: looking at it is a review, and reviews happen on the real product.';
    } else if (b.kind === 'failed') {
      state = run && run.alive !== false && inRun ? `The run in progress will re-run ${inRun} of them. Open one in the table for what failed.` : 'Open one in the table for what failed.';
    } else if (b.kind === 'stale-pass') state = 'A re-run of the check on the current code clears it.';
    return { title: `${esc(short)}: ${esc(b.label)}`, sw: KIND_SW[b.kind] ?? 'var(--k-never)', why: `${esc(cap(b.means))}.`, state };
  }

  /* the three states as one extruded arrow, and as tabs: exactly one is selected, and its panel shows
     that stage's detail. Selecting one does not filter the table; its panel has a button that does. */
  const STEP_SHORT = { 'to check': 'To check', approved: 'Approved' };
  const STEP_SUB = { 'to check': 'an automated check is not yet cleared', approved: 'every check clear at once, on the code as it is now' };
  // the title's own ramp, so the panel under an arrow is the colour of the arrow above it
  const STAGE_C = ['var(--accent)', 'var(--hot)', 'var(--warm)'];
  let stage = null; // the selected tab's state key; remembered per viewer
  try { stage = localStorage.getItem('ledger-stage'); } catch {}
  /** The selected stage: the remembered one if it still exists, else the first with models in it. */
  function pickStage(buckets) {
    if (!buckets.some((b) => b.key === stage)) stage = (buckets.find((b) => b.count) ?? buckets[0])?.key ?? null;
    return stage;
  }
  function selectStage(key, focus = false) {
    stage = key;
    try { localStorage.setItem('ledger-stage', key); } catch {}
    /* Picking a tab changes which tab is picked and what is under it. Nothing else. It used to redraw
       the whole overview, which built the strip again from scratch -- so the wave jumped back to its
       beginning on every click, as if the page had reloaded. The scene is not a function of the
       selection: it is a function of the counts, and those have not changed. */
    const tabs = [...$('stats').querySelectorAll('[data-stage]')];
    if (tabs.length) {
      for (const t of tabs) {
        const on = t.dataset.stage === key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      }
      // The panel that used to open here listed the stage's models and what held them. That was a
      // second, worse answer to what the table below answers: the table can be filtered to exactly
      // those models, searched, sorted, and each row names the check holding it. So picking a stage
      // sets that filter, and the chip above the table says what is on screen.
      // A step is a check now, so picking one shows the models that check is holding -- and the last
      // step is the only state left, so that one still filters by status.
      if (String(key).startsWith('check:')) showBad(String(key).slice(6));
      else showOnly(`status:${key}`, 'stats', { toggle: false });
    } else renderOverview(); // nothing drawn yet: the first paint still has to happen
    if (focus) $('stats').querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
  }
  /* The liquid's surface is three waves, not one: different lengths, weights and speeds, so it never
     reads as a repeating sine. Each is drawn from -240 to 500 -- wide enough that the 120px slide never
     runs out of wave -- and every period divides that slide, so each loop lands where it started.
     Built once, at load; nothing here runs per frame. */
  const wavePath = (y, h, a, up) => { // y: the flat line, h: half a period, a: how far it swings
    let d = `M-240 ${y}`;
    for (let x = -240; x < 500; x += h) { d += ` Q${x + h / 2} ${up ? y - a : y + a} ${x + h} ${y}`; up = !up; }
    return `${d} V30 H-240 Z`;
  };
  const WAVE = '<svg class="step__wave" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
    + `<path class="w2" d="${wavePath(7, 60, 3.4, true)}"/>`
    + `<path class="w3" d="${wavePath(11.5, 20, 2.2, false)}"/>`
    + `<path class="w1g" d="${wavePath(9, 30, 5, true)}"/>`
    + `<path class="w1" d="${wavePath(9, 30, 5, true)}"/></svg>`;
  const LIQUID = '<i class="b b1"></i><i class="b b2"></i><i class="b b3"></i>' + WAVE;
  /* The deep end of each glass, below the last line of text: four small fish of three shapes drifting at
     their own depths and speeds, and behind them a whale and a dolphin that cross only now and then.
     Every shape is drawn facing left; the CSS mirrors the ones heading right. Set SEA to false and the
     markup goes with it. Silhouettes in the liquid's own colours, never a bright cartoon. */
  const SEA = true;
  const SHAPE = { // each one faces left: head at the low x, tail at the high x
    a: [18, 10, 'M2 5C4 1.6 10 1.6 12.6 5 10 8.4 4 8.4 2 5Z M12.6 5 17 2.3 17 7.7Z'],
    b: [14, 8, 'M1 4C2.6 1.3 7.4 1.3 9.5 4 7.4 6.7 2.6 6.7 1 4Z M9.5 4 13.5 1.6 13.5 6.4Z'],
    c: [22, 9, 'M1.5 4.5C4 1.8 12 1.8 16 4.5 12 7.2 4 7.2 1.5 4.5Z M16 4.5 21 1.8 21 7.2Z M9 2.4 10.6 0.5 12 2.6Z'],
    whale: [56, 22, 'M2 12.5C8 5 21 2 33 4.6 40 6.1 45 8.8 48 12.1 44 15.7 37 18.6 28 18.6 17 18.6 6 16.4 2 12.5Z M48 12.1C50.6 9.7 53 7.9 56 6.7 55 10.3 55 13.9 56 17.5 53 16.3 50.6 14.5 48 12.1Z'],
    dolphin: [48, 18, 'M2 10C8 4 20 2 30 3.6 37 4.8 42 7 45 10 41 13.6 34 16 26 16 16 16 6 14 2 10Z M24 3.6 27 0.5 30 4Z M45 10 48 6.6 48 13.4Z'],
  };
  const swimmer = (shape, cls) => { const [w, h, d] = SHAPE[shape]; return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`; };
  const WEATHER = true;
  const SKY = WEATHER ? '<span class="step__sky" aria-hidden="true"></span>' : '';
  const SEALIFE = SEA ? `<span class="step__sea" aria-hidden="true">${swimmer('whale', 'big1 swimL')}${swimmer('dolphin', 'big2 swimR')}${swimmer('a', 'f1 swimR')}${swimmer('b', 'f2 swimL')}${swimmer('c', 'f3 swimR')}${swimmer('b', 'f4 swimL')}</span>` : '';
  /* The one sea. Its surface is flat at each stage's level across the middle of that stage's arrow --
     where the count and the label sit, so the level a viewer reads is that stage's own share -- and it
     swells from one level to the next across the chevron joins instead of stepping.
     WHERE THE SWELLS GO, in the SVG's own 1000-wide space. Two things fix them, and they were measured
     rather than guessed (901px to 1920px, which is every width this layout runs at):
       the joins -- a chevron's tip -- sit at 345..354 and 673..677, drifting only because the notch is
         a fixed 26px while the strip is not, so one pair of numbers covers every width;
       the ink -- each arrow's label, count and line of description, all of them left-aligned -- runs
         from 11..19 to 144..252 on the first arrow, 355..371 to 476..582 on the second, and 682..694 to
         773..853 on the third.
     A swell has to cross its join and clear both neighbours' ink, which leaves exactly two windows:
     257..352 and 587..679. Each holds its join, so the change really is eased across it, and outside
     them every arrow's own words sit over water that is flat at that stage's own share of the models.
     Anything wider than this would put a slope under a word at 901px; anything narrower reads as a step.
     The three masks further down (the chop, the smooth crest, the colour ramp) are cut to these same
     numbers, so they cross-fade exactly where the surface starts and stops changing. */
  const RAMPS = [[257, 352], [587, 679]];
  const SEA_H = 128;              // the wide layout's glass height, so the path's y units are CSS pixels
  const SEA_DROP = 4.5;           // the fill starts at the wave's troughs, not at its mean line
  /** The water's outline for three levels: the filled body, the surface alone, and the body in 0..1. */
  /*
   * The sea is drawn from three heights, one per stage, because there were three stages when it was
   * drawn. There are two now -- reviewing left this page -- and the third height came out undefined,
   * so every curve after the second ramp was built from NaN and the browser refused the path.
   * Rather than redraw the scene, the heights it is given are padded to three by repeating the last
   * one: with two stages the sea simply runs level from the second ramp to the shore, which is what
   * it should look like when there is nothing after the second stage.
   */
  function seaPath(lvsIn) {
    const lvs = [lvsIn[0] ?? 0, lvsIn[1] ?? lvsIn[0] ?? 0, lvsIn[2] ?? lvsIn[lvsIn.length - 1] ?? 0];
    const at = (w, h) => {
      // an empty stage's surface rests on the floor of the strip, never below it: a level of 0 is a
      // waterline along the bottom, which is what that stage has, and the path stays a simple outline
      const y = lvs.map((lv) => +(Math.min((1 - lv) * SEA_H + SEA_DROP, SEA_H) * (h / SEA_H)).toFixed(4));
      const x = (v) => +((v / 1000) * w).toFixed(4);
      const ease = (a, b, y0, y1) => { const c = x((a + b) / 2); return ` C${c} ${y0} ${c} ${y1} ${x(b)} ${y1}`; };
      const top = `M0 ${y[0]} L${x(RAMPS[0][0])} ${y[0]}${ease(RAMPS[0][0], RAMPS[0][1], y[0], y[1])}`
        + ` L${x(RAMPS[1][0])} ${y[1]}${ease(RAMPS[1][0], RAMPS[1][1], y[1], y[2])} L${w} ${y[2]}`;
      return { top, fill: `${top} L${w} ${h} L0 ${h} Z` };
    };
    const px = at(1000, SEA_H), unit = at(1, 1);
    return { fill: px.fill, edge: px.top, box: unit.fill };
  }
  /* The whole scene: three skies, one body of water, one shoal. It sits under the buttons and takes no
     pointer events, so the arrows are still tabs. Ids are fixed because there is only ever one of it. */
  const seaStop = (o, v) => `<stop offset="${o}" style="stop-color:var(${v})"/>`;
  /* the three stages' colours change where their levels do, so a stage's own tone is flat over its own
     ink and only the swell carries one into the next -- these offsets are RAMPS, in 0..1 */
  const seaRamp = (a, b, c) => seaStop(0, a) + seaStop(0.257, a) + seaStop(0.352, b) + seaStop(0.587, b) + seaStop(0.679, c) + seaStop(1, c);
  function sceneHtml(lvs, sel) {
    const p = seaPath(lvs);
    const sky = [0, 1, 2].map((i) => `<div class="scene__sky s${i + 1}" style="--i:${i}"></div>`).join('');
    const chop = [1, 2, 3].map((i) => `<div class="scene__chop c${i}">${WAVE}</div>`).join('');
    const life = SEA ? `<div class="scene__life"><i class="b b1"></i><i class="b b2"></i><i class="b b3"></i><i class="b b4"></i>`
      + `${swimmer('whale', 'big1 swimL')}${swimmer('dolphin', 'big2 swimR')}${swimmer('a', 'f1 swimR')}${swimmer('b', 'f2 swimL')}${swimmer('c', 'f3 swimR')}${swimmer('b', 'f4 swimL')}</div>` : '';
    return `<div class="flow__scene" aria-hidden="true" data-sel="${sel}" style="--lv1:${lvs[0] ?? 0};--lv2:${lvs[1] ?? lvs[0] ?? 0};--lv3:${lvs[2] ?? lvs[lvs.length - 1] ?? 0}">
      ${sky}<div class="scene__blend j1"></div><div class="scene__blend j2"></div>
      <svg class="scene__sea" viewBox="0 0 1000 ${SEA_H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="sea-surf">${seaRamp('--liq1', '--liq2', '--liq3')}</linearGradient>
          <linearGradient id="sea-deep">${seaRamp('--dep1', '--dep2', '--dep3')}</linearGradient>
          <linearGradient id="sea-crest">${seaRamp('--crt1', '--crt2', '--crt3')}</linearGradient>
          <linearGradient id="sea-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="0.3" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
          <linearGradient id="sea-swell"><stop offset="0.235" stop-color="#000"/><stop offset="0.28" stop-color="#fff"/><stop offset="0.329" stop-color="#fff"/><stop offset="0.374" stop-color="#000"/><stop offset="0.565" stop-color="#000"/><stop offset="0.61" stop-color="#fff"/><stop offset="0.656" stop-color="#fff"/><stop offset="0.701" stop-color="#000"/></linearGradient>
          <mask id="sea-deepmask"><rect width="1000" height="${SEA_H}" fill="url(#sea-depth)"/></mask>
          <mask id="sea-swellmask"><rect width="1000" height="${SEA_H}" fill="url(#sea-swell)"/></mask>
          <clipPath id="sea-clip" clipPathUnits="objectBoundingBox"><path d="${p.box}"/></clipPath>
        </defs>
        <path class="sea__fill" d="${p.fill}"/>
        <path class="sea__deep" d="${p.fill}" mask="url(#sea-deepmask)"/>
        <path class="sea__edge" d="${p.edge}" mask="url(#sea-swellmask)"/>
      </svg>
      ${chop}${life}</div>`;
  }
  /* ---------- the strip, and the sea it used to be ----------
     OCEAN is the sea under three skies this strip was until now (commit e196e17). None of it was thrown
     away: the builders above still make its markup, and <style id="ledger-ocean"> in the head carries
     its CSS whole, inert behind media="not all". Setting this one constant to true turns that
     stylesheet on and builds the sea instead of the wave. Nothing else has to change. */
  const OCEAN = false;
  if (OCEAN) document.getElementById('ledger-ocean')?.removeAttribute('media');

  /* ---------- the wave ----------
     A sine drawn as cubic Beziers: each half period is one curve whose two control points sit at four
     thirds of the amplitude, which puts the curve's own peak exactly at the amplitude -- closer to a
     sine than any eye at this size can tell, and one curve where a polyline would need dozens.
     The path runs two periods past each end of the layer, so the round caps at its ends are always off
     screen and the slide never runs out of wave. Built when the counts change and never again:
     nothing in here runs per frame, and the travel is a transform on an HTML element.
     fw/tv are the two numbers that make the loop seamless: the layer is one period wider than the
     strip (fw), and it slides by exactly that one period (tv, the same length written as a share of
     the layer's own width). Every loop therefore lands on the frame it started from.
     This is the STACKED arrow's wave: one panel, one height, no join to cross. Side by side, where the
     three stand in one strip and the line has to cross two gates, the strip draws one enveloped path
     instead -- envPath and waveFrames below. */
  const WV = { vw: 1092, h: 128, cy: 100, amp: 18, per: 92, a: -46, b: 1138 };
  const WVN = { vw: 384, h: 100, cy: 72, amp: 11, per: 64, fw: '120%', tv: '-16.6667%', a: -128, b: 512 };
  function sinePath(o, amp, per, phase) {
    const half = per / 2, c = amp * 4 / 3, r = (n) => Math.round(n * 100) / 100;
    let x = o.a + (phase || 0), up = true, d = `M${r(x)} ${o.cy}`;
    while (x < o.b) {
      const s = up ? -1 : 1;
      d += ` C${r(x + per / 6)} ${r(o.cy + s * c)} ${r(x + per / 3)} ${r(o.cy + s * c)} ${r(x + half)} ${o.cy}`;
      x += half; up = !up;
    }
    return d;
  }
  /** How tall a stage's wave stands: that stage's share of every model, and nothing else. A stage
      holding nothing is a flat line -- empty reads as empty, and no floor lifts it off the axis, though
      the line itself carries on lit through the stage so the waveform is never broken. A stage holding
      anything stands at least at WV_MIN of the tallest, so "a few" can never read as "none"; above that
      the height is the share, straight. The number itself is the count printed on the arrow and the
      first line of its tooltip, so the picture never has to be measured. */
  const WV_MIN = 0.14;
  const waveAmp = (share, count, max) => (count ? max * (WV_MIN + (1 - WV_MIN) * share) : 0);
  /* One stage's stretch of the wave: three strokes of the same path -- wide and faint, narrower, then
     the core -- which is the soft falloff, paid for in paint instead of a blur filter over the strip
     every frame. With them the harmonic, a third of the height and half the period, in the same
     travelling layer so it moves at the carrier's own speed and the two stay locked into one shape. */
  const waveLayer = (o, i, amp) =>
    `<div class="wv w${i}" style="--wvw:${o.fw};--wvt:${o.tv}">`
    + `<div class="wv__flow"><svg viewBox="0 0 ${o.vw} ${o.h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">`
    + ['h3', 'h2', 'h1'].map((c) => `<path class="${c}" d="${sinePath(o, amp, o.per, 0)}"/>`).join('')
    + `<path class="hm" d="${sinePath(o, amp / 3, o.per / 2, o.per / 4)}"/>`
    + '</svg></div></div>';
  /* ---------- the one line across the strip ----------
     Side by side the three arrows are one scene, so the wave is ONE path over the whole of it and its
     height is a function of x. THE WINDOWS the height changes in are the only two stretches where no
     arrow has a word, so each stage still stands at its own true height everywhere its count and its
     label are, and every bit of the change happens in the gap between two stages' words. */
  const WV_GATE = [[0.257, 0.352], [0.587, 0.679]];
  /* smootherstep: zero slope AND zero curvature at both ends of a window, so where one stage's height
     meets the next the line's height and its slope match and the ease shows no corner. */
  const sstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const dsstep = (t) => 30 * t * t * (t - 1) * (t - 1);
  /** A(x) and A'(x) down the strip: each stage's amplitude flat across its own words, eased into the
      next across the window at the gate. A stage holding nothing is 0 here -- a flat line, still lit
      and still drawn, so empty reads as empty without cutting the wave. */
  function envelope(ampsIn, vw) {
    const g = WV_GATE.map(([s, e]) => [s * vw, e * vw]);
    /* One amplitude per stage, and one more than there are gates between them. The strip was drawn
       for three stages; there are two now, so the amplitude past the last gate came out undefined
       and every curve built from it was NaN. It is padded by repeating the last real height: with
       two stages the line simply runs level past the second gate. */
    const amps = ampsIn.length > g.length ? ampsIn
      : [...ampsIn, ...Array(g.length + 1 - ampsIn.length).fill(ampsIn[ampsIn.length - 1] ?? 0)];
    return (x) => {
      for (let i = 0; i < g.length; i++) {
        const [s, e] = g[i];
        if (x <= s) return [amps[i], 0];
        if (x < e) {
          const len = e - s, t = (x - s) / len, d = amps[i + 1] - amps[i];
          return [amps[i] + d * sstep(t), (d * dsstep(t)) / len];
        }
      }
      return [amps[g.length], 0];
    };
  }
  /** One frame of the line: y = cy - A(x)·sin(2π(x - phase)/q), as cubic Hermite segments on an x grid
      that is FIXED -- the same x at every frame, so from one frame to the next only the heights move
      and the browser's interpolation between two frames is the wave travelling, never a drift
      sideways. Six samples a period with the exact slope at each puts the curve inside a twentieth of
      a pixel of the sine, and the whole path is two half periods wider than the strip so the round
      caps at its ends are always outside it. */
  function envPath(o, env, k, q, phase, div) {
    const w = (2 * Math.PI) / q, step = q / div, n = Math.ceil((o.b - o.a) / step);
    const r = (v) => Math.round(v * 10) / 10;
    const at = (x) => {
      const [A, dA] = env(x), th = w * (x - phase), s = Math.sin(th), c = Math.cos(th);
      return [o.cy - k * A * s, -k * (dA * s + A * w * c)];
    };
    let x0 = o.a, [y0, m0] = at(x0), d = `M${r(x0)} ${r(y0)}`;
    for (let i = 1; i <= n; i++) {
      const x1 = o.a + i * step, h = step, [y1, m1] = at(x1);
      d += `C${r(x0 + h / 3)} ${r(y0 + (m0 * h) / 3)} ${r(x1 - h / 3)} ${r(y1 - (m1 * h) / 3)} ${r(x1)} ${r(y1)}`;
      x0 = x1; y0 = y1; m0 = m1;
    }
    return d;
  }
  /* THE TRAVEL, with the envelope standing still: twelve frames of d, one per twelfth of a period,
     which the browser interpolates. Frame twelve is frame zero -- moving the phase by a whole period
     under a fixed envelope returns the same curve -- so the loop is seamless. The harmonic takes its
     twelve frames over half the duration, which is one of its own periods and therefore the carrier's
     own speed. Built here, once, when the counts change; nothing runs per frame in script. */
  const WV_FRAMES = 12;
  const WV_CSS = document.head.appendChild(Object.assign(document.createElement('style'), { id: 'wv-frames' }));
  function waveFrames(o, amps) {
    const env = envelope(amps, o.vw), main = [], harm = [];
    for (let i = 0; i <= WV_FRAMES; i++) {
      const t = i / WV_FRAMES;
      main.push(envPath(o, env, 1, o.per, t * o.per, 6));
      harm.push(envPath(o, env, 1 / 3, o.per / 2, o.per / 4 + (t * o.per) / 2, 4));
    }
    const kf = (name, fr) => `@keyframes ${name}{`
      + fr.map((d, i) => `${Math.round((i / WV_FRAMES) * 1e4) / 100}%{d:path("${d}")}`).join('') + '}';
    WV_CSS.textContent = kf('wvmain', main) + kf('wvharm', harm);
    return { main: main[0], harm: harm[0] };
  }
  /* One line, three strokes of it -- wide and faint, narrower, then the core -- which is the soft
     falloff, paid for in paint instead of a blur filter over the strip every frame. The colour runs
     along it in one gradient in the strip's own coordinates (userSpaceOnUse, so a stage's colour stays
     over that stage whatever the strip is scaled to), changing across the same two windows the height
     does. `rise` is the group the counts' height is reached by scaling. */
  const wvStop = (off, cls, v) => `<stop offset="${off}" class="${cls}" style="stop-color:var(${v})"/>`;
  const wvRamp = (v) => wvStop(0, 'sa', v) + wvStop(WV_GATE[0][0], 'sa', v) + wvStop(WV_GATE[0][1], 'sb', v)
    + wvStop(WV_GATE[1][0], 'sb', v) + wvStop(WV_GATE[1][1], 'sc', v) + wvStop(1, 'sc', v);
  function envLayer(o, amps, flat) {
    const f = waveFrames(o, amps);
    const gu = `gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${o.vw}" y2="0"`;
    return `<div class="wv wv--env"><svg viewBox="0 0 ${o.vw} ${o.h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">`
      + `<defs><linearGradient id="wv-core" ${gu}>${wvRamp('--core')}</linearGradient>`
      + `<linearGradient id="wv-halo" ${gu}>${wvRamp('--sw-halo-c')}</linearGradient></defs>`
      + `<g class="wv__rise" style="transform-origin:0 ${o.cy}px${flat ? ';transform:scaleY(0)' : ''}">`
      + ['h3', 'h2', 'h1'].map((c) => `<path class="${c}" d="${f.main}"/>`).join('')
      + `<path class="hm" d="${f.harm}"/></g></svg></div>`;
  }
  /* The whole scene: one field, one floor, one sun and one line across all three arrows. It sits
     under the buttons and takes no pointer events, so the arrows are still tabs. */
  function synthScene(amps, sel, flat) {
    return `<div class="flow__scene" aria-hidden="true" data-sel="${sel}">
      <div class="sw__deck"><i></i></div><div class="sw__horizon"></div><div class="sw__sun"><i></i></div>
      <div class="sw__wave">${envLayer(WV, amps, flat)}</div></div>`;
  }
  /** One stacked arrow's own scene: the same wave at the amplitude its own share earns it, in its own
      panel and unmasked -- stacked, there is no neighbour to cross into. */
  const synthStep = (amp) => '<span class="step__wrap" aria-hidden="true">'
    + '<span class="sw__deck"><i></i></span><span class="sw__horizon"></span>'
    + `<span class="sw__wave">${waveLayer(WVN, 1, amp)}</span></span>`;
  /** A stacked arrow's wave rises to the height its count earns it, from wherever it already stood.
      Every stroke is the same path, and the harmonic is that amplitude thirded, so one number sets all
      four. The transition on d is what makes the change a swell; where a browser does not animate d,
      the wave arrives at its height instead. */
  const rise = (root, o, i, amp) => {
    const g = root.querySelector(`.wv.w${i}`);
    if (!g) return;
    const d = sinePath(o, amp, o.per, 0), dm = sinePath(o, amp / 3, o.per / 2, o.per / 4);
    for (const p of g.querySelectorAll('path:not(.hm)')) p.setAttribute('d', d);
    for (const p of g.querySelectorAll('path.hm')) p.setAttribute('d', dm);
  };

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const shownLv = new Map(); // the share each stage is showing now, so only a real change animates
  /**
   * The strip, step by step: one per automated check, then Approved.
   *
   * It used to be the model STATES -- to check, awaiting review, approved -- and when reviewing
   * left this page that was two steps, which is not a journey. What a model actually goes through
   * is the checks, in the order the gate runs them, and the useful question at each one is how
   * many models have it clear ON THE CODE AS IT IS NOW. That is the gate's own answer, not the
   * check's raw tally: a model that passed last week and has changed since is not counted here,
   * which is the whole point of the thing.
   *
   * The last step is Approved, and it is the only one that is a state rather than a check: it is
   * every check clear at once, which is never the sum of the steps before it.
   */
  function flowSteps(c) {
    const total = L.models.length;
    /*
     * Cleared BY THE CHECK, which is not the same as not held back by it.
     *
     * A motion flag holds nothing back any more -- the only thing that could ever clear one was a
     * person, and a person watching an animation is watching the real product. But the check did
     * not clear those 27 models: it looked at them and said it could not tell. Counting them here
     * as cleared would have this strip read 134 over a column of 27 amber flags, which is the
     * arrow flattering what the cells are saying plainly.
     *
     * So a step counts what its check actually passed on the code as it is. For eight of the nine
     * that is the same number as the gate; for motion it is the honest one.
     */
    const clear = (k) => L.models.filter((m) => {
      const c = m.checks?.[k];
      return c && c.status === 'pass' && !c.stale;
    }).length;
    const steps = COLS.map(([k, short]) => ({
      key: `check:${k}`, check: k, label: short, count: clear(k),
      means: `${CHECK_NAMES[k] ?? k}: cleared on the code as it is now`,
    }));
    const ap = L.models.filter((m) => m.status === 'approved').length;
    steps.push({ key: 'approved', label: STEP_SHORT.approved ?? 'Approved', count: ap, means: 'every check clear at once, on the code as it is now' });
    return steps;
  }

  /** A step's own colour, spread across however many steps there are: the ramp the three stages used. */
  const stepColour = (i, n) => (n <= 1 ? STAGE_C[0] : `color-mix(in oklab, var(--accent) ${Math.round(100 - (100 * i) / (n - 1))}%, var(--warm))`);

  function renderStats(buckets) {
    const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
    pickStage(buckets);
    const lvs = buckets.map((b) => b.count / total);
    const selIx = Math.max(0, buckets.findIndex((b) => b.key === stage));
    /* The scene is drawn where the wave already stands and eased to where it belongs on the next frame:
       selecting a tab redraws the whole strip, and a wave that started flat every time would collapse
       and rise again on every click. On the first draw there is no "already", so there it really does
       start flat and rise.
       The one line across the strip carries its envelope in its own path, so it cannot be drawn at a
       height it is about to leave: it is built at the height the counts earn it and, when a count has
       actually changed, laid down flat and scaled up to it on the next frame -- which, since one
       factor over every amplitude is exactly a change of height, is the same swell. Selecting a tab
       changes no count, so there it is drawn standing and nothing moves. */
    const seen = buckets.map((b) => shownLv.has(b.key));
    const from = buckets.map((b, i) => (seen[i] ? shownLv.get(b.key) : 0));
    const fromAmp = (o) => buckets.map((b, i) => waveAmp(from[i], seen[i] ? b.count : 0, o.amp));
    const grew = buckets.some((b, i) => !seen[i] || from[i] !== lvs[i]);
    const back = [from[0], from[Math.floor(from.length / 2)], from[from.length - 1]];
    const scene = OCEAN ? sceneHtml(back, selIx)
      : synthScene([lvs[0], lvs[Math.floor(lvs.length / 2)], lvs[lvs.length - 1]].map((lv, i) => waveAmp(lv, buckets[i]?.count ?? 0, WV.amp)), selIx, grew);
    const stepAmp = fromAmp(WVN);
    // the sun's light is the Approved share; the wave is what carries the number, the sun only warms to it
    $('stats').style.setProperty('--ch3', String(lvs[lvs.length - 1] ?? 0));
    $('stats').innerHTML = scene + `<ol class="flow" aria-label="How many models each check has cleared, and how many are approved">${buckets.map((b, i) => {
      const on = stage === b.key;
      const pct = Math.round((b.count / total) * 100);
      const name = STEP_SHORT[b.key] ?? b.label;
      const lv = b.count / total; // the wave's height is this stage's share of every model, nothing else
      const f = seen[i] ? from[i] : 0;
      /* The tooltip leads with the number the picture is drawn from, then with what puts a model in
         this stage. A wave has to be read off a curve; the count never does. */
      const means = b.means && b.means.length <= 140 ? b.means.charAt(0).toUpperCase() + b.means.slice(1) : '';
      const rule = `${b.count} of ${total} models, ${pct}% — that share is how tall the wave stands here.`
        + (means ? ` ${means}.` : '');
      const inner = OCEAN ? `<span class="step__liquid">${LIQUID}</span>${SEALIFE}${SKY}` : synthStep(stepAmp[i]);
      return `<li class="flow__li"><span id="step-rule-${i}" class="visually-hidden">${esc(rule)}</span><div id="stage-tab-${i}" class="step step--${Math.min(3, i + 1)}${b.key === 'approved' ? ' step--end' : ''}${b.count ? ' has-work' : ''}" data-lv="${lv}" style="--lv:${f};--ch:${f};--c:${stepColour(i, buckets.length)}" role="img"
          aria-label="${esc(`${name}: ${b.count} of ${total} models, ${pct}% of the strip`)}">
        <span class="step__body" aria-hidden="true">
          ${inner}
          <span class="step__text"><span class="step__label">${esc(name)}</span><span class="step__n">${b.count}</span><span class="step__sub">${esc(STEP_SUB[b.key] ?? '')}</span></span>
        </span></div></li>`;
    }).join('')}</ol>`;
    // the wave rises from where it stood; a redraw on select starts where it already is, so nothing moves
    const settle = () => {
      let moved = false;
      for (const el of $('stats').querySelectorAll('.step')) {
        const to = +el.dataset.lv, was = shownLv.get(el.id);
        el.style.setProperty('--lv', el.dataset.lv);
        el.style.setProperty('--ch', el.dataset.lv);
        shownLv.set(el.id, to);
        if (was !== to) moved = true;
      }
      const sc = $('stats').querySelector('.flow__scene');
      if (OCEAN) {
        if (!sc) return;
        const p = seaPath(lvs);
        lvs.forEach((lv, i) => sc.style.setProperty(`--lv${i + 1}`, lv));
        sc.querySelector('.sea__fill').setAttribute('d', p.fill);
        sc.querySelector('.sea__deep').setAttribute('d', p.fill);
        sc.querySelector('.sea__edge').setAttribute('d', p.edge);
        sc.querySelector('#sea-clip path').setAttribute('d', p.box);
        if (!REDUCED.matches && moved) { sc.classList.add('is-pour'); setTimeout(() => sc.classList.remove('is-pour'), 1000); }
        return;
      }
      // the one line is already at its height; laid flat for a rise, this is the frame it stands up on
      const g = sc?.querySelector('.wv__rise');
      if (g) g.style.transform = 'scaleY(1)';
      $('stats').querySelectorAll('.step').forEach((el, i) => {
        const w = el.querySelector('.step__wrap');
        if (w) rise(w, WVN, 1, waveAmp(lvs[i], buckets[i].count, WVN.amp));
      });
    };
    if (REDUCED.matches) settle();
    else requestAnimationFrame(() => requestAnimationFrame(settle));
  }
  function renderOverview() {
    const c = L.counts, n = c.models;
    const by = (k) => c.byStatus?.[k] ?? 0;
    const ap = by('approved'), cv = by('to check');
    // the answer first, in one true sentence
    const parts = [];
    if (cv) parts.push(`<b>${cv}</b> ${cv === 1 ? 'is' : 'are'} held by a check`);

    // the accounting: every model in exactly one state; the sum itself is one hover away
    const buckets = flowSteps(c);
    const sum = buckets.reduce((s, b) => s + b.count, 0);
    const bal = c.balance ?? { ok: sum === n, sum, models: n, problems: sum === n ? [] : [`the buckets sum to ${sum}, not ${n}`] };
    // every state is a filter its panel's button (and the chip) can set
    BLK = new Map(buckets.map((b) => [`status:${b.key}`, { ids: new Set(L.models.filter((m) => m.status === b.key).map((m) => m.id)), chip: STEP_SHORT[b.key] ?? b.label }]));
    renderStats(buckets);
    const sumText = `${buckets.map((b) => `${b.count} ${b.label.toLowerCase()}`).join(' + ')} = ${bal.sum}, and there are ${bal.models} models`;
    /*
     * "The numbers add up" is not drawn any more.
     *
     * It said, every time, that the stages below it summed to the number of models -- which is
     * what the stages themselves show, and the build already refuses to produce a ledger where
     * they do not. A line of reassurance about arithmetic that cannot be wrong is a line spent
     * on no news. If it ever IS wrong, that is news, and it goes in the notices where news goes.
     */
    if (!bal.ok) NOTES_EXTRA = `The books do not balance: ${bal.problems.map(esc).join('; ')} (${esc(sumText)}). Nothing on this page adds up until this is fixed.`;

    // what holds the rest back
    const rows = blockerRows();
    if (!rows) {
      $('blk-note').textContent = '';
      $('blockers').innerHTML = '<li class="muted">This ledger was built before it listed what holds each model back; the list appears on the next build.</li>';
    } else {
      $('blk-note').textContent = rows.length
        ? `These overlap: a model held by two checks is counted under both. ${cv} model${cv === 1 ? ' is' : 's are'} held by at least one check. Click one to show exactly those models in the table.`
        : '';
      $('blockers').innerHTML = rows.length ? rows.map((r) => {
        const t = blockerText(r);
        const on = blk === r.key;
        return `<li><button type="button" class="blk" data-blk="${esc(r.key)}" aria-pressed="${on}">
          <span class="blk__n">${r.count}</span><span class="sw" style="background:${t.sw}" aria-hidden="true"></span>
          <span class="blk__t"><b>${t.title}</b><span class="blk__why">${t.why}</span>${t.state ? `<span class="blk__state">${t.state}</span>` : ''}<span class="blk__go">${on ? 'Shown in the table now · click again to show every model' : `Show ${r.count === 1 ? 'it' : `these ${r.count}`} in the table`}</span></span>
          <span class="blk__alone">${r.alone} held by this alone</span></button></li>`;
      }).join('') : '<li class="muted">Nothing: every model is approved.</li>';
    }
    // the header button that opens them: models not approved, and why in its tooltip
    const btn = $('blk-btn');
    /* Hidden when it is zero: a control that says zero has nothing to say, and the header had two
       of them side by side. It comes back the moment a model is not approved. */
    btn.hidden = !rows || n - ap === 0;
    btn.innerHTML = `What’s holding models back <small>· ${n - ap}</small>`;
    btn.setAttribute('aria-label', `What’s holding models back: ${n - ap} models not approved`);
    btn.dataset.tip = '';
    btn.dataset.tiptext = `${n - ap} of ${n} models are not approved: ${cv} held by a check. Opens every reason, with counts.`;
    sortBars();
    drawNotices(Object.entries(L.running ?? {}).filter(([, p]) => p && p.alive === false));
  }

  /**
   * Every run that is still going, and where its bar belongs.
   *
   * A run is always a run OVER something: one model, one group, or everything. That thing is a row
   * of the table (or the table itself), so its progress is drawn there rather than in a panel of
   * its own somewhere above. The rule is only: whoever could have started it is who shows it.
   */
  /**
   * The runs that are actually going, which is not the same as the runs a file says are going.
   *
   * Two things know something here and they know different things. The LEDGER knows what has been
   * measured: it reads each check's result file, and that file says whether a run claimed to be
   * still going when the ledger last looked. The BOARD knows what is running: it holds the
   * processes. The ledger only re-reads when something on disk changes -- so a run whose process
   * dies without writing anything changes nothing, no rebuild happens, and its claim stands for
   * ever. That is the bar that sat under a model reading "0/1, no estimate yet", with no Stop on
   * it, that nothing could get rid of: the ledger believed it, the board had never heard of it,
   * and neither was going to change its mind.
   *
   * So when the board is answering, the board decides. A claim it does not recognise is stale and
   * is not drawn as progress. When there is no board -- the page opened from a file, or from the
   * app's own dev server -- the ledger's own judgement is all there is, and it is used.
   */
  /**
   * Is this check running? One answer, asked by everything that draws a running state.
   *
   * The rule was written once, for the bars, and not for the marks -- so a stale claim stopped
   * producing a bar you could not stop and started producing an amber ring around a tick with
   * nothing running behind it. Same fault, same file, two functions. There is one now.
   */
  function isLive(key) {
    const p = L?.running?.[key];
    if (!p || p.alive === false) return false;
    // With a board answering, the board is what knows: it holds the processes. A claim it does not
    // recognise is a file that was never corrected, because nothing on disk changed to correct it.
    return !RUN_OK || RUN_NOW.runs.some((r) => r.what === key);
  }
  const liveRuns = () => Object.entries(L?.running ?? {}).filter(([key, p]) => p && isLive(key));
  /** Where a run belongs, from the models it covers. Shared by a live run and one just asked for. */
  function homeOf(ids, key) {
    /* A job -- the gate, the export matrix, the live-site check -- is about the project, not about
       any model, so it belongs where APP and SEO are and not in a table of models. Without this it
       fell through to 'suite' and drew its bar across the top of the models table, which is a
       list of things a job is not about. */
    if (String(key).startsWith('job:')) return { kind: 'site' };   // a job is not about models
    if (CHECK_LIST.find((c) => c.key === key)?.scope === 'site') return { kind: 'site' };
    if (ids.length === 1) return { kind: 'model', id: ids[0] };
    if (ids.length > 1) {
      const gs = new Set(ids.map((id) => L.models.find((m) => m.id === id)?.group ?? ''));
      if (gs.size === 1) return { kind: 'group', key: [...gs][0] };
    }
    return { kind: 'suite' };
  }
  function barHome(p, key) {
    // A site check judges pages, not models, so it names none and would otherwise land on the
    // table's control -- beside a count of models it has nothing to do with. Everything else goes
    // by the models it covers: one of them, all of one group, or the table.
    return homeOf(idsOfRun(p), key);
  }
  /**
   * The bar for a run that has been asked for and has not started.
   *
   * A check takes seconds to spawn a process and open a browser, and the ledger only notices it
   * when it next rebuilds -- which can be another ten. Until then the only thing that had changed
   * on screen was a small spinner where the play button was, which reads as a click that did not
   * land. The bar appears on the press, in the place the run will report to, and says what it is
   * doing: waiting to start. Its track is striped and moving but carries no figure, because there
   * is nothing to count yet and a bar at 0 of 135 would be a number this page had made up.
   */
  function startingBar(key) {
    /* A run that has been spawned and has not reported yet is still a process, and the board can
       still kill it. Leaving the controls off until the first measurement arrived meant the one
       moment you most want to stop something -- you have just pressed the wrong button, or it is
       going to take forty minutes -- was the one moment there was nothing to press. */
    const c = CHECK_LIST.find((x) => x.key === key);
    // the whole run is not a check and has no registry entry, so it names itself
    const short = key === 'all' ? 'Every check' : (c?.short ?? key);
    const title = key === 'all' ? 'Every check, in gate order' : (CHECK_NAMES[key] ?? key);
    return `<span class="pg pg--starting">
      <span class="pg__name">${esc(short)}</span>
      <span class="pg__track" role="progressbar" aria-label="${esc(`${title}: starting`)}"><i></i></span>
      <span class="pg__meta">starting\u2026</span>
      ${runOf(key)?.mine ? `<span class="pg__acts">${holdAndStop('rowrun', key)}</span>` : ''}</span>`;
  }
  /** Sorted by where they go, once per render, so no row has to search the list for itself. */
  /*
   * WHICH BUILD OF THE PAGE THIS TAB IS RUNNING.
   *
   * Read from the script tag that loaded it, so it is what is actually executing rather than what
   * the page hoped. A rebuilt board used to sit on disk while every open tab went on running the
   * bundle it started with, and the way you found out was two parts of the screen disagreeing --
   * a bar saying "starting" beside a chip saying 5 of 5. A board that needs a person to notice it
   * is out of date is not a board that can be trusted.
   */
  const MY_BUILD = (() => {
    const src = (document.querySelector('script[type=module][src*="ledger-"]') as HTMLScriptElement | null)?.src ?? '';
    const css = (document.querySelector('link[rel=stylesheet][href*="ledger-"]') as HTMLLinkElement | null)?.href ?? '';
    const name = (u: string) => u.split('/').pop() ?? '';
    return [name(src), name(css)].filter(Boolean).sort().join(' ');
  })();
  let reloadAsked = false;
  /*
   * A NEWER BOARD ON DISK: TAKE IT ONCE, AND NEVER TWICE FOR THE SAME ONE.
   *
   * The first version compared the bundle this tab is running with the one ledger.json names, and
   * reloaded when they differed. If they go on differing -- because ledger.json was written before
   * the last page build, so it names a bundle that is no longer the one being served -- the reload
   * happens again, and again, for ever. It did exactly that on 2026-09-29 and made the board
   * unusable: a page refreshing every three seconds is worse than a page that is out of date.
   *
   * So the target is remembered for this tab. Reload once for a given target; if that tab comes
   * back still not matching, the mismatch is not something a reload can fix, and it says so
   * quietly instead of trying again.
   */
  function checkPageBuild(latest: string | null | undefined) {
    if (!latest || !MY_BUILD || reloadAsked) return;
    if (latest === MY_BUILD) return;
    const KEY = 'ledger:reloadedFor';
    let already: string | null = null;
    try { already = sessionStorage.getItem(KEY); } catch { /* private window: then do not reload at all */ return; }
    if (already === latest) {
      reloadAsked = true;   // tried that, it did not help: say it once and leave the page alone
      console.warn(`ledger: ledger.json names ${latest} and this tab is running ${MY_BUILD}. A reload did not change that, so it is not a stale tab -- ledger.json was probably written before the last page build. Run npm run ledger.`);
      return;
    }
    reloadAsked = true;
    try { sessionStorage.setItem(KEY, latest); } catch { return; }
    console.info(`ledger: a newer board is on disk (${latest}); this tab has ${MY_BUILD}. Reloading once.`);
    setTimeout(() => location.reload(), 250);
  }

  let BARS = { model: new Map(), group: new Map(), suite: [], site: [] };
  function sortBars() {
    BARS = { model: new Map(), group: new Map(), suite: [], site: [] };
    if (!L) return;
    const add = (map, k, v) => map.set(k, [...(map.get(k) ?? []), v]);
    /*
     * The gap between pressing and the first measurement.
     *
     * There are two waits, one after the other, and neither used to show anything. First the
     * press: the POST is in flight and nothing anywhere knows about the run. Then the longer one:
     * the BOARD has spawned the process, but the check has to open a browser and judge a model
     * before it writes anything, and the LEDGER only picks that up when it next rebuilds. On a
     * check like the gallery's performance that is most of a minute of a page that looks idle.
     *
     * So a bar is drawn for anything asked for but not yet reported, from whichever of the two
     * knows about it, and it says "starting" rather than a count -- because there is no count yet
     * and inventing a 0 of 135 would be this page making a number up.
     */
    const starting = [];
    // A check being stopped is still in the board's list until the process dies, and its result
    // file stops being live the moment it is killed -- which is exactly the shape of a run that
    // has not started yet. Saying "starting" over something you just pressed Stop on is the page
    // telling you the opposite of what is happening.
    const stopping = PENDING && PENDING.act === 'stop' ? String(PENDING.key).slice(5) : null;
    if (PENDING && PENDING.act === 'run') starting.push(String(PENDING.key).split(':'));
    for (const r of RUN_NOW.runs) {
      if (r.what === stopping) continue;
      const seen = L.running?.[r.what];
      if (!seen || seen.alive === false) starting.push([r.what, (r.models ?? []).join(',')]);
    }
    const already = new Set();
    for (const [what, idsRaw] of starting) {
      if (already.has(what)) continue;
      already.add(what);
      const h = homeOf((idsRaw ?? '').split(',').filter(Boolean), what);
      /*
       * A JOB GETS ITS START TIME AND ITS ESTIMATE, not a null.
       *
       * null here means "spawned, nothing reported yet", which startingBar draws as "starting...".
       * For a check that lasts a second or two that is honest. For a job it never stopped being
       * true, because no job writes per-model progress -- so the gate, the live check and the
       * export matrix all sat on "starting..." for their whole run.
       */
      const r0 = RUN_NOW.runs.find((r) => r.what === what);
      const bar = [what, String(what).startsWith('job:') && r0?.startedAt
        ? { job: true, startedAt: r0.startedAt, estMin: r0.estMin ?? null, done: 0, total: 0 }
        : null];
      if (h.kind === 'model') add(BARS.model, h.id, bar);
      else if (h.kind === 'group') add(BARS.group, h.key, bar);
      else if (h.kind === 'site') BARS.site.push(bar);
      else BARS.suite.push(bar);
    }
    for (const [key, p] of liveRuns()) {
      if (already.has(key)) continue;
      const h = barHome(p, key);
      // several at once land on one row when two checks are running over the same model or group
      if (h.kind === 'model') add(BARS.model, h.id, [key, p]);
      else if (h.kind === 'group') add(BARS.group, h.key, [key, p]);
      else if (h.kind === 'site') BARS.site.push([key, p]);
      else BARS.suite.push([key, p]);
    }
  }
  /**
   * One run's progress, wherever it is drawn: what is running, how far, how long is left, and the
   * two buttons that change that. The same markup in a row, in a group heading and beside the
   * table's own control, because it is the same fact in all three places.
   */
  function runBar(key, p, over) {
    if (!p) return startingBar(key);
    /*
     * A JOB HAS NO PERCENTAGE, so it is not given a fake one.
     *
     * Everything below this line divides done by total. A job reports neither, and drawing an
     * empty track under a "0/?" is how a working run comes to look like a stuck one. What IS known
     * is when it started and roughly what it usually costs, so that is what it says -- with the
     * estimate named as an estimate, because it is one, and it is often wrong when the machine is
     * busy.
     */
    if ((p as any).job) return jobBar(key, p as any);
    const c = CHECK_LIST.find((x) => x.key === key);
    // 'all' is not a check and has no entry in the registry, so it had no name of its own and the
    // bar introduced itself as "all".
    const isJob = String(key).startsWith('job:');
    const whole = key === 'all';
    const title = whole ? 'Every check, in gate order' : isJob ? `${String(key).slice(4).replace(/-/g, ' ')}, step by step` : (CHECK_NAMES[key] ?? key);
    const short = whole ? 'Every check' : isJob ? (p?.step ? `gate · ${p.step}` : 'gate') : (c?.short ?? key);
    const pct = p.total ? Math.min(100, (100 * p.done) / p.total) : 0;
    const e = etaOf(p);
    // Only a run this board started can be stopped from here: there is no pid for one
    // somebody began in a terminal, and a Stop that does nothing is worse than no Stop.
    /*
     * Pause is offered for every run; Stop only for one this board started.
     *
     * Both used to be hidden behind `mine`, so a run begun in a terminal -- which is how a long
     * one is begun -- had no controls at all: three hours of work on screen with no way to hold it
     * from the page. But pause is a FLAG FILE that every check watches, so it works on any run
     * whoever started it, and holdAndStop already knew the difference: `canStop` is false unless
     * the run is the board's. It just had to be told which check this bar is, and allowed to draw.
     */
    /*
     * "What it is covering", back where it was.
     *
     * ssPanel and ssToggle survived the rewrite of 2026-09-26 that moved every run into the table;
     * their two callers did not. So the panel, its click handler, the open/closed state kept per
     * visitor and the CSS for all of it sat in the file with nothing rendering them, and a bar
     * showed a percentage and no way to ask what the percentage was of. Noticed from the outside:
     * "on every progress bar it does give the what is happening dropdown".
     *
     * It is drawn for site checks too -- ssPanel already says "no finding" rather than "pass" for
     * them -- which is what App and SEO were missing.
     */
    const ssId = `run:${key}`;
    const nSteps = (c?.steps ?? []).length;
    const ssShown = Boolean(c) && nSteps > 0;
    const ssOpened = ssShown && ssIsOpen(ssId);
    const bar = `<span class="pg${RUN_NOW.paused ? ' is-paused' : ''}">
      <span class="pg__name" data-tip data-tiptext="${esc(`${title}, over ${over}.`)}">${esc(short)}</span>
      <span class="pg__track" role="progressbar" aria-label="${esc(`${title}: ${p.done} of ${p.total ?? '?'}`)}" aria-valuemin="0" aria-valuemax="${esc(p.total ?? 0)}" aria-valuenow="${esc(p.done)}"><i style="width:${pct}%"></i></span>
      <span class="pg__n">${esc(p.done)}/${esc(p.total ?? '?')}</span>
      <span class="pg__meta">${(() => {
        // Nothing is said when there is nothing to say. An estimate needs two measurements to exist,
        // so for the first minute of every run the words were "no estimate yet" -- a sentence whose
        // only content is that it has no content, on every bar on the page at once.
        const bits = [];
        // Before the check itself can start, some checks rebuild what they judge. That is minutes
        // of real work with nothing reported yet, and a bar sitting at 0 with no word beside it
        // reads as stuck -- which is exactly how it was read, three times.
        if (p.preparing) bits.push(`first: ${esc(String(p.preparing).replace(/^scripts\//, ''))}`);
        else if (RUN_NOW.paused) bits.push('paused');
        else if (e) bits.push(`about ${fmtDur(e.left)} left`);
        if (!p.preparing && p.last) bits.push(esc(p.last));
        return bits.join(' · ');
      })()}</span>
      ${RUN_OK ? `<span class="pg__acts">${holdAndStop('rowrun', whole ? null : key)}</span>` : ''}
      ${ssShown ? ssToggle(ssId, ssOpened ? `Hide what ${title} is covering` : `What ${title} is covering (${nSteps} parts)`, ssOpened, true) : ''}</span>`;
    if (!ssShown) return bar;
    return `<span class="pgbox">${bar}${ssOpened ? ssPanel(c, ssId, p) : ''}</span>`;
  }

  /**
   * A running job: elapsed, against what it usually costs.
   *
   * No track fills, because nothing measured says how far along it is. The pulse says it is alive
   * -- which is the one thing the old "starting..." bar failed to say after its first second.
   */
  function jobBar(key, p) {
    const name = String(key).slice(4).replace(/-/g, ' ');
    const secs = Math.max(0, (Date.now() - new Date(p.startedAt).getTime()) / 1000);
    const est = p.estMin ? `of about ${p.estMin} min` : 'no estimate recorded for this job';
    const over = p.estMin && secs > p.estMin * 60 * 1.5;
    return `<span class="pg pg--job${over ? ' pg--over' : ''}">
      <span class="pg__name" data-tip data-tiptext="${esc(`${name}: a job, not a per-model check, so there is no count to show. Started ${clock(p.startedAt)}.`)}">${esc(name)}</span>
      <span class="pg__track pg__track--idle" role="progressbar" aria-label="${esc(name)} is running" aria-valuetext="running ${esc(fmtDur(secs))}"><i></i></span>
      <span class="pg__n">${esc(fmtDur(secs))}</span>
      <span class="pg__meta">${esc(est)}${over ? ' · longer than usual' : ''}</span>
      ${RUN_OK ? `<span class="pg__acts">${holdAndStop('rowrun', null)}</span>` : ''}</span>`;
  }

  /**
   * Notices: things that happened and are worth one line, not a panel.
   *
   * Dismissing one remembers it by its run id, so the same stopped run does not come back on
   * the next rebuild -- the page redraws itself every few seconds, and a notice you cannot get
   * rid of is a notice you stop reading.
   */
  const DISMISSED = 'ledger.notices.dismissed';
  const seenNotices = () => { try { return new Set(JSON.parse(localStorage.getItem(DISMISSED) ?? '[]')); } catch { return new Set(); } };
  const dismissNotice = (id) => { try { const d = seenNotices(); d.add(id); localStorage.setItem(DISMISSED, JSON.stringify([...d].slice(-40))); } catch { /* private window: it just comes back */ } };
  function drawNotices(stopped) {
    const box = $('notices'); if (!box) return;
    const seen = seenNotices();
    const items = stopped
      .map(([key, p]) => ({ key, p, id: p.runId ?? `${key}:${p.startedAt ?? ""}` }))
      .filter((n) => !seen.has(n.id));
    box.hidden = !items.length;
    box.innerHTML = items.map(({ key, p, id }) => {
      const c = CHECK_LIST.find((x) => x.key === key);
      const name = c ? c.short : key;
      const far = p.total ? `${p.done ?? 0} of ${p.total}` : `${p.done ?? 0}`;
      return `<div class="notice notice--stopped" data-notice="${esc(id)}"><span class="notice__what"><b>${esc(name)}</b> stopped after ${esc(far)}</span><span class="notice__why">its process (pid ${esc(p.pid ?? "?")}) is gone, so the rest never reported. Run it again when you are ready.</span><button type="button" class="notice__x" data-dismiss="${esc(id)}" aria-label="Dismiss this notice" title="Dismiss this notice">${XICON}</button></div>`;
    }).join('');
  }
  $('notices')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dismiss]');
    if (!b) return;
    dismissNotice(b.dataset.dismiss);
    b.closest('.notice')?.remove();
    const box = $('notices'); if (box && !box.querySelector('.notice')) box.hidden = true;
  });
  /* ---------- the one detail area under the strip: all models, or the picked stage ---------- */
  const GATE_TALLY = { 'stale-pass': 'stale', flagged: 'flag', failed: 'fail', broke: 'broke', never: 'never' };
  /**
   * One notice above the bars when a check has nothing captured here and the committed snapshot has
   * its verdicts: it names the file and the commit, and says in so many words that those numbers are
   * the state at the last release and not a run on this machine. Nothing when every check has run.
   */
  function releaseNotice() {
    const R = L.release;
    if (!R) return '';
    const checks = CHECK_LIST.filter((c) => c.scope === 'model');
    const noRun = checks.filter((c) => !c.captured && R.checks?.[c.key]?.reported);
    if (!noRun.length) return '';
    const one = noRun.length === 1;
    const which = one ? `The <b>${esc(noRun[0].short)}</b> check has` : noRun.length === checks.length ? 'None of these checks has' : `${noRun.length} of these ${checks.length} checks have`;
    return `<div class="notice" style="margin:0 0 12px"><b class="big">The state at the last release.</b>
      ${which} been captured on this machine, so ${one ? 'its bar reads' : 'their bars read'} <b>not run yet</b> and the models under ${one ? 'it' : 'them'} stay to check.
      Beside ${one ? 'it' : 'them'}, in a dashed pill, is what <code>${esc(R.file)}</code> recorded at commit <code>${esc(R.head)}</code>${R.takenAt ? `, taken ${esc(new Date(R.takenAt).toLocaleString())}` : ''}: ${esc(noRun.map((c) => `${c.short.toLowerCase()} ${R.checks[c.key].pass}/${R.checks[c.key].of}`).join(' · '))}.
      That is a committed record of someone else's run, never a result of yours. ${R.describesHead ? `It still describes this code: ${esc(R.why)}.` : `<b>It no longer describes this code:</b> ${esc(R.why ?? 'the commit it was taken at is not this one')}.`}
      Run <code>npm run capture -- &lt;check&gt;</code> for numbers of your own.</div>`;
  }
  /** The blockers that hold a stage's models, counted over those models only, largest first. */
  function holdsIn(models) {
    const ids = new Set(models.map((m) => m.id));
    return (blockerRows() ?? []).map((r) => ({ r, n: r.ids.filter((id) => ids.has(id)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  }
  const modelChips = (models) => `<div class="qids">${models.map((m) => `<span class="mid" title="${esc(m.title)}">${esc(m.id)}</span>`).join('')}</div>`;
  /* Whether a stage's panel is open, remembered per stage: picking another arrow shows that stage in
     whatever state its viewer last left it, not in a state the page decided for them. Browser storage
     can be blocked or cleared, so every touch of it is guarded and the default is open. */
  const STAGE_KEY = 'ledger.stage.open';
  let stageOpen = (() => { try { return JSON.parse(localStorage.getItem(STAGE_KEY) ?? '{}') ?? {}; } catch { return {}; } })();
  const stageSave = () => { try { localStorage.setItem(STAGE_KEY, JSON.stringify(stageOpen)); } catch {} };
  const stageIsOpen = (key) => (typeof stageOpen?.[key] === 'boolean' ? stageOpen[key] : true);
  /* ---------- "What's holding models back": the blockers, in a dialog opened from the header ---------- */
  let blkFrom = null, blkKeepFocus = false;
  function openBlockers(from) {
    const d = $('blk-dialog');
    blkFrom = from ?? $('blk-btn');
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    $('blk-close').focus();
  }
  $('blk-btn').addEventListener('click', (e) => openBlockers(e.currentTarget));
  $('blk-close').addEventListener('click', () => $('blk-dialog').close());
  $('mach-close')?.addEventListener('click', () => $('mach-dialog').close());
  $('run-btn')?.addEventListener('click', () => { void openRuns(); });

  /*
   * START HERE: WHAT THIS MACHINE CAN DO, THEN WHAT THIS PAGE IS.
   *
   * Everything on this board was reachable only by somebody who already knew it was there. The
   * doctor's answers lived in a terminal; the tour did not exist; the gate's step checkboxes were
   * behind a button reading "Run...". A tool that needs a person who has read it is a different
   * thing from a tool that works, and on 2026-09-29 the person who asked for all three reported
   * that none of them were anywhere.
   *
   * Two parts. The first reads what npm run doctor wrote and repeats it in the three parts the
   * doctor uses -- WHAT failed, WHERE, and WHY in the words of whatever refused -- with the command
   * that fixes it beside each one, and a button to ask again without leaving the page. The second
   * walks the board itself, one stop at a time, forwards and back.
   *
   * NOBODY HAVING ASKED IS NOT THE SAME AS NOTHING BEING WRONG. With no doctor run this says so
   * and offers the run, rather than showing a clean panel it has no grounds for.
   */
  const SETUP_SEEN = 'c3d.setup.seen';
  const seenSetup = () => { try { return localStorage.getItem(SETUP_SEEN) === '1'; } catch { return false; } };
  const markSetupSeen = () => { try { localStorage.setItem(SETUP_SEEN, '1'); } catch { /* private window: it opens again, which is the safe way to be wrong */ } };
  let DOCTOR: any = null;

  const LEVEL: any = { bad: { k: 'stop', w: 'Stops the checks' }, warn: { k: 'note', w: 'Worth knowing' }, ok: { k: 'fine', w: 'Fine' } };

  function setupHtml() {
    if (!DOCTOR) return '<p class="muted">Asking the board what the doctor found...</p>';
    if (!DOCTOR.known) {
      return '<div class="setup__none"><p><b class="big">Nobody has asked whether this machine can run anything.</b> '
        + 'That is not the same as nothing being wrong, so the board will not pretend it is. '
        + 'The check reads this computer and changes nothing: Node and its version, whether a browser can be started at all, '
        + 'the files the checks read, the two ports they want, and the optional networked parts.</p>'
        + (DOCTOR.offline ? '<p class="muted">The board could not be asked: ' + esc(DOCTOR.offline) + '. It answers this only when started with <code>npm run board</code>.</p>' : '')
        + '<button type="button" class="btn runjob__go" data-job="doctor">Check this machine</button>'
        + '<p class="muted">Or <code>npm run doctor</code>. About a minute.</p></div>'
        + tourInvite();
    }
    const rows = (DOCTOR.rows ?? []) as any[];
    const stops = rows.filter((r) => r.level === 'bad');
    const notes = rows.filter((r) => r.level === 'warn');
    const fine = rows.filter((r) => r.level === 'ok');
    const one = (r: any) => '<li class="setup__row setup__row--' + LEVEL[r.level].k + '">'
      + '<div class="setup__what"><b>' + esc(r.what) + '</b><span class="setup__lv">' + esc(LEVEL[r.level].w) + '</span></div>'
      + '<div class="setup__where">' + esc(r.detail ?? '') + '</div>'
      + (r.why ? '<p class="setup__why">' + esc(r.why) + '</p>' : '')
      + (r.fix ? '<p class="setup__fix">Run <code>' + esc(r.fix) + '</code></p>' : '')
      + '</li>';
    const head = stops.length
      ? '<p class="notice bad"><b class="big">' + stops.length + ' thing' + (stops.length === 1 ? '' : 's') + ' stop the checks from running.</b> '
        + 'The board still opens and shows whatever was last recorded - it reads <code>docs/checks</code>, it does not need to run anything.</p>'
      : notes.length
        ? '<p class="notice info"><b class="big">Everything needed is here.</b> ' + notes.length + ' thing' + (notes.length === 1 ? '' : 's') + ' worth knowing about, below.</p>'
        : '<p class="notice info"><b class="big">Everything needed is here.</b></p>';
    return head
      + '<p class="muted setup__age">Asked ' + esc(ago(DOCTOR.at)) + '. '
      + '<button type="button" class="btn" data-job="doctor">Ask again</button></p>'
      + '<ul class="setup__rows">' + [...stops, ...notes, ...fine].map(one).join('') + '</ul>'
      + tourInvite();
  }

  const tourInvite = () => '<div class="setup__tour"><h3>What am I looking at</h3>'
    + '<p class="muted">Six stops around the board: what it is claiming, where each number comes from, and how to run anything yourself. It moves the page as it goes; leave whenever you like.</p>'
    + '<button type="button" class="btn runjob__go" id="tour-go">Take the tour</button></div>';

  async function openSetup() {
    const d: any = $('setup-dialog');
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    $('setup-body').innerHTML = setupHtml();
    try {
      const { body } = await api('/api/machine');
      DOCTOR = body;
    } catch (e) {
      /* The board answers /api/machine only when it is the board server. Opened as a plain file, or
         served by anything else, there is no answer -- and "could not ask" is its own state. */
      DOCTOR = { known: false, offline: String((e as any)?.message ?? e) };
    }
    $('setup-body').innerHTML = setupHtml();
    markSetupSeen();
    syncSetupBtn();
  }

  /* The button hides once it has nothing left to say: the doctor found nothing and the tour has
     been taken. Same rule as the blockers button beside it -- see the note in ledger.html. */
  function syncSetupBtn() {
    const b: any = $('setup-btn');
    if (!b) return;
    const worth = !seenSetup() || !DOCTOR || DOCTOR.known === false || (DOCTOR.stops ?? 0) > 0 || (DOCTOR.notes ?? 0) > 0;
    b.hidden = !worth;
    if (DOCTOR?.known && (DOCTOR.stops ?? 0) > 0) {
      const t = b.querySelector('.nav__t') ?? b;
      t.textContent = 'Start here - ' + DOCTOR.stops + ' blocking';
    }
    paintNavIcons();
  }

  $('setup-btn')?.addEventListener('click', () => { void openSetup(); });
  $('setup-close')?.addEventListener('click', () => ($('setup-dialog') as any).close());
  $('setup-dialog')?.addEventListener('click', (e: any) => { if (e.target === $('setup-dialog')) (e.target as any).close(); });
  $('setup-body')?.addEventListener('click', (ev: any) => {
    if (ev.target.id === 'tour-go') { ($('setup-dialog') as any).close(); startTour(); return; }
    const b = (ev.target as HTMLElement).closest('[data-job]') as HTMLButtonElement | null;
    if (!b || b.disabled) return;
    b.disabled = true;
    b.textContent = 'Running...';
    void api('/api/run?check=job:' + encodeURIComponent(b.dataset.job ?? ''), 'POST')
      .then(async ({ body }: any) => {
        if (body?.ok === false) { b.textContent = 'Refused'; b.title = body.why ?? ''; return; }
        /* The doctor takes about a minute and writes machine.json at the end. Re-reading on a timer
           is how the panel stops being a thing you have to close and reopen to see the answer to the
           question it just asked. */
        b.textContent = 'Asking...';
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const { body: m } = await api('/api/machine');
            if (m?.known && m.at !== DOCTOR?.at) { DOCTOR = m; $('setup-body').innerHTML = setupHtml(); syncSetupBtn(); return; }
          } catch { /* keep waiting: a board that is rebuilding answers again in a moment */ }
        }
        b.textContent = 'Still running';
      })
      .catch((e: any) => { b.textContent = 'Failed'; b.title = String(e?.message ?? e); });
  });

  /*
   * THE TOUR.
   *
   * Six stops, each one an element that is already on the page. It scrolls the element into view,
   * rings it, and says in plain words what it is claiming and where that claim comes from. Back and
   * Next, because a tour you can only go forwards through is a tour you cannot check.
   *
   * A stop whose element is not on the page is SKIPPED rather than shown pointing at nothing: the
   * blockers button is not there when nothing is blocked, and the gate bar is only there during a
   * run. Six stops is the most it can be, not a promise.
   */
  const TOUR: { sel: string; title: string; body: string }[] = [
    { sel: '#cl-btn', title: 'What the board is claiming',
      body: 'The release checklist, and how much of it is done. A tick is a claim; a proof run on this board is the only thing that makes it proven, and the dialog behind this button says which of the two each line is.' },
    { sel: '.panel--strip', title: 'The columns, and what each counts',
      body: 'One number per check, over all 135 models. These are counts of recorded results, not of models: a model with no result yet is not a pass and is not a failure, and the key below the table names every state.' },
    { sel: '#run-btn', title: 'Everything is runnable from here',
      body: 'The gate step by step with its cost added up, every check, and every job. Anything this machine cannot do is greyed out and says why, rather than throwing when you press it. Nothing here needs a terminal.' },
    { sel: '.tbl, table', title: 'One row per model, one tick per check',
      body: 'Every tick is a recorded result with a commit and a time behind it. A result dies when the files it judged change - not when any commit happens - so a tick going grey names what moved.' },
    { sel: '.statusline', title: 'Whether any of this is current',
      body: 'The commit this was built from, when it was built, and whether the watcher that rebuilds it is alive. If this line is stale, everything above it is a photograph of an older repository.' },
    { sel: '#rules-btn', title: 'How every count is worked out',
      body: 'What a tick means, what each column counts, and what it leaves out. Read it once and the numbers above stop being something you have to take on trust.' },
  ];
  let tourAt = -1;

  function startTour() { tourAt = -1; nextStop(1); }
  function endTour() {
    tourAt = -1;
    document.querySelector('.tour')?.remove();
    document.querySelectorAll('.tour-ring').forEach((e) => e.classList.remove('tour-ring'));
    markSetupSeen();
    syncSetupBtn();
  }
  function nextStop(dir: number) {
    document.querySelectorAll('.tour-ring').forEach((e) => e.classList.remove('tour-ring'));
    let i = tourAt;
    let el: Element | null = null;
    /* Walk until an element that is actually on the page turns up, in the direction asked. */
    for (;;) {
      i += dir;
      if (i < 0 || i >= TOUR.length) { endTour(); return; }
      el = document.querySelector(TOUR[i].sel);
      if (el && (el as HTMLElement).offsetParent !== null) break;
    }
    tourAt = i;
    const stop = TOUR[i];
    el!.classList.add('tour-ring');
    el!.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let box = document.querySelector('.tour') as HTMLElement | null;
    if (!box) {
      box = document.createElement('div');
      box.className = 'tour';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
      box.addEventListener('click', (ev: any) => {
        const a = ev.target.closest('[data-tour]')?.dataset.tour;
        if (a === 'next') nextStop(1);
        else if (a === 'back') nextStop(-1);
        else if (a === 'end') endTour();
      });
    }
    box.innerHTML = '<div class="tour__n">Stop ' + (i + 1) + ' of ' + TOUR.length + '</div>'
      + '<h3>' + esc(stop.title) + '</h3><p>' + esc(stop.body) + '</p>'
      + '<div class="tour__acts">'
      + '<button type="button" class="btn" data-tour="back"' + (i === 0 ? ' disabled' : '') + '>Back</button>'
      + '<button type="button" class="btn" data-tour="end">Close</button>'
      + '<button type="button" class="btn runjob__go" data-tour="next">' + (i === TOUR.length - 1 ? 'Done' : 'Next') + '</button>'
      + '</div>';
    (box.querySelector('[data-tour="next"]') as HTMLElement)?.focus();
  }
  document.addEventListener('keydown', (e: any) => { if (e.key === 'Escape' && tourAt >= 0) { e.preventDefault(); endTour(); } });

  /*
   * Opened for the first time on this browser, the board says what it is before it says 135 of
   * anything. After that the button carries it, and only while it has something to say.
   *
   * BOTH BRANCHES ARE DEFERRED, and the second one is why. It used to call api() here, which is a
   * const declared some seventeen hundred lines further down -- so it ran in the temporal dead zone
   * and threw ReferenceError before the board finished starting. This is the second time today that
   * a module-init call reached past its own declaration; the first was sayStarted() in verify.mjs,
   * and it failed silently into a catch. Nothing caught this one.
   *
   * It was found by tsc, one minute after tsconfig.ledger.json was repaired -- a config that had
   * been excluding the very folder it was written to check, and had therefore never reported
   * anything about this file at all.
   */
  setTimeout(() => {
    if (!seenSetup()) { void openSetup(); return; }
    void api('/api/machine').then(({ body }: any) => { DOCTOR = body; syncSetupBtn(); }).catch(() => { syncSetupBtn(); });
  }, 400);

  $('run-close')?.addEventListener('click', () => $('run-dialog').close());
  const gateCost = () => {
    const on = [...document.querySelectorAll('#run-body [data-step]:checked')] as HTMLInputElement[];
    const steps = (JOBS_STEPS ?? []).filter((x: any) => on.some((i) => i.dataset.step === x.key));
    const mins = steps.reduce((a: number, x: any) => a + x.minutes, 0);
    const out = document.getElementById('gpick-cost');
    if (out) out.textContent = steps.length === 0 ? 'Nothing chosen' : `${steps.length} step${steps.length === 1 ? `` : `s`}, ${howLong(mins)}`;
    const go = document.getElementById('gpick-go') as HTMLButtonElement | null;
    if (go) go.disabled = steps.length === 0;
  };
  $('run-body')?.addEventListener('change', () => gateCost());
  $('run-body')?.addEventListener('click', (ev) => {
    const pick = (ev.target as HTMLElement).closest('[data-pick]') as HTMLElement | null;
    if (pick) {
      const how = pick.dataset.pick;
      for (const i of [...document.querySelectorAll('#run-body [data-step]')] as HTMLInputElement[]) {
        i.checked = how === 'all' ? true
          : how === 'none' ? false
          : how === 'unproved' ? UNPROVED_STEPS.has(i.dataset.step ?? '')
          : STALE_STEPS.has(i.dataset.step ?? '');
      }
      gateCost();
      return;
    }
    if ((ev.target as HTMLElement).id === 'gpick-go') {
      const on = [...document.querySelectorAll('#run-body [data-step]:checked')] as HTMLInputElement[];
      const go = ev.target as HTMLButtonElement;
      go.disabled = true;
      go.textContent = 'Starting…';
      void api(`/api/gate?steps=${encodeURIComponent(on.map((i) => i.dataset.step).join(','))}`, 'POST')
        .then(({ body }: any) => { go.textContent = body?.ok === false ? 'Refused' : 'Running'; if (body?.why) go.title = body.why; })
        .catch((e: any) => { go.textContent = 'Failed'; go.title = String(e?.message ?? e); });
      return;
    }
    const b = (ev.target as HTMLElement).closest('[data-job]') as HTMLButtonElement | null;
    if (!b || b.disabled) return;
    b.disabled = true;
    b.textContent = 'Starting…';
    void api(`/api/run?check=job:${encodeURIComponent(b.dataset.job ?? '')}`, 'POST')
      .then(({ body }: any) => { b.textContent = body?.ok === false ? 'Refused' : 'Running'; if (body?.why) b.title = body.why; })
      .catch((e: any) => { b.textContent = 'Failed'; b.title = String(e?.message ?? e); });
  });
  // The chip is rewritten on every poll, so the click is caught on the document rather than bound
  // to an element that is about to be replaced.
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-machine]')) openMachine(); });
  $('blk-dialog').addEventListener('click', (e) => { if (e.target === $('blk-dialog')) $('blk-dialog').close(); });
  $('blk-dialog').addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('blk-dialog').open) { e.preventDefault(); $('blk-dialog').close(); } });
  // focus goes back to whatever opened it, unless a blocker was picked: then it goes to the table's filter chip
  $('blk-dialog').addEventListener('close', () => { if (!blkKeepFocus) (blkFrom?.isConnected ? blkFrom : $('blk-btn')).focus({ preventScroll: true }); blkKeepFocus = false; });

  /** Pressed states of everything that sets the table's filter, without redrawing it. */
  function syncPressed() {
    document.querySelectorAll('[data-blk]').forEach((b) => b.setAttribute('aria-pressed', String(blk === b.dataset.blk)));
      }
  /**
   * Show only one filter's models (a blocker, a check-bar segment or a stage of the strip) in the
   * table: every other filter and the search are dropped so the rows are exactly those, all of them
   * drawn, and the table scrolls into view with the filter chip. The same click again shows every model.
   */
  function showOnly(key, from, { toggle = true } = {}) {
    const on = !toggle || blk !== key;
    blk = on ? key : null;
    filter = 'all'; group = 'all'; tags.clear(); query = '';
    limit = Math.max(PAGE, L.models.length);
    saveView(); renderFilterChips(); renderRows(); renderOverview();
    if (on) {
      $('tbl-h').closest('section').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('fchip').querySelector('button')?.focus({ preventScroll: true });
    } else $(from)?.querySelector(`[data-blk="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  }
  // the strip is redrawn on select, so the focus is put back on the selected tab
  /*
   * The strip is something you watch, not something you press.
   *
   * Each step was a tab: picking one filtered the table to that stage. That made sense when the
   * steps WERE the stages -- three of them, and picking one was the only way to see its models.
   * They are the checks now, every one of which has its own column in the table with its own
   * filter, and ten buttons that look like buttons but do what a column heading already does are
   * ten chances to press the wrong thing. It reads as a picture because that is what it is.
   */
  $('blockers').addEventListener('click', (e) => {
    const b = e.target.closest('[data-blk]');
    if (!b || !L) return;
    // close the dialog, then filter; focus goes to the filter chip, not back to the opener
    if ($('blk-dialog').open) { blkKeepFocus = true; $('blk-dialog').close(); }
    showOnly(b.dataset.blk, 'blockers');
  });

  /* ---------- notes: collapsed to a badge; each closable; back when its content changes ---------- */
  /** Said only when the arithmetic really is wrong, which the build is supposed to prevent. */
  let NOTES_EXTRA = null;
  let NOTES = []; // [{ key, html, col? }]
  let notesOpen = false;
  let dismissed = {}; // key → the content signature that was dismissed
  try { dismissed = JSON.parse(localStorage.getItem('ledger-dismissed') || '{}') || {}; } catch {}
  const sig = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
  const saveDismissed = () => {
    const live = new Set(NOTES.map((n) => n.key));
    for (const k of Object.keys(dismissed)) if (!live.has(k)) delete dismissed[k]; // a note that is gone forgets its dismissal
    try { localStorage.setItem('ledger-dismissed', JSON.stringify(dismissed)); } catch {}
  };
  const isShown = (n) => dismissed[n.key] !== sig(n.html);
  function renderNotes() {
    const shown = NOTES.filter(isShown);
    const hid = NOTES.length - shown.length;
    const btn = $('notes-btn');
    btn.hidden = !NOTES.length || !shown.length;   // nothing to read is not worth a button
    btn.innerHTML = `<b>${shown.length}</b> note${shown.length === 1 ? '' : 's'}${hid ? ` <small>· ${hid} dismissed</small>` : ''}`;
    btn.setAttribute('aria-expanded', String(notesOpen));
    btn.classList.toggle('is-quiet', !shown.length);
    paintNavIcons();
    const pop = $('notes-pop');
    pop.hidden = !notesOpen || !NOTES.length;
    pop.innerHTML = (shown.length
      ? shown.map((n) => `<div class="note"><div class="note__body">${n.html}</div><button type="button" class="note__x" data-dismiss="${esc(n.key)}" aria-label="Dismiss this note" title="Dismiss this note">${XICON}</button></div>`).join('')
      : '<p class="muted" style="margin:4px 2px">Every note is dismissed.</p>')
      + (hid ? `<p style="margin:8px 2px 2px"><button type="button" class="linkish" data-undismiss>Show the ${hid} dismissed note${hid === 1 ? '' : 's'}</button> <span class="muted" style="font-size:12px">A dismissed note comes back by itself if what it says changes.</span></p>` : '');
  }
  /*
   * The header's controls carry an icon, for the width where they are a bar along the bottom.
   *
   * On a phone these six wrapped into four rows and pushed the thing the page is about below the
   * fold. They sit at the bottom of the screen there, as icons, the way a phone puts the things
   * you reach for within reach of a thumb -- and the header keeps only what it is telling you:
   * the commit, whether the watcher is live, and how the site's own two checks stand.
   *
   * They are the same six controls with the same ids and the same handlers. The icon is added
   * here rather than written into the markup so the label stays the element's text: that is what
   * a screen reader announces, and what is shown on a wide screen.
   */
  /*
   * Run again after anything that rewrites one of these.
   *
   * Three of the six write their own label as the page builds -- the blockers button counts what
   * is holding models back, the checklist button counts what is done, the notes button counts
   * notes -- and each does it by replacing its innerHTML. Adding the icon once at startup put it
   * inside markup that the first render threw away, so three of the six were icons for about a
   * second and blanks after that.
   *
   * It is idempotent: a control that already has its icon is left alone, so calling this after
   * every render costs a query and nothing else.
   */
  function paintNavIcons() {
    for (const el of document.querySelectorAll('[data-nav]')) {
      if (el.querySelector(':scope > .nav__i')) continue;
      const name = el.getAttribute('data-nav');
      el.innerHTML = `<span class="nav__i" aria-hidden="true">${icon(name)}</span><span class="nav__t">${el.innerHTML}</span>`;
    }
  }
  paintNavIcons();
  /*
   * ONCE MORE, NOW THAT THE ICON EXISTS.
   *
   * applyTheme() picks the theme button's glyph -- sun for light, moon for dark, half-circle for
   * auto -- but it runs as the module starts, about fifteen hundred lines before paintNavIcons()
   * creates the .nav__i it writes into. So its swap found nothing and the button kept whatever
   * data-nav said, which is `sun`: a header that claimed "light" while the theme was following the
   * system. Harmless-looking, and exactly the kind of label that is wrong without ever saying so.
   * Now that the icon is on the page, ask the theme to describe itself again.
   */
  applyTheme();
  $('notes-btn').addEventListener('click', (e) => { e.stopPropagation(); notesOpen = !notesOpen; renderNotes(); paintNavIcons(); });
  $('notes-pop').addEventListener('click', (e) => {
    e.stopPropagation();
    const x = e.target.closest('[data-dismiss]');
    if (x) { const n = NOTES.find((k) => k.key === x.dataset.dismiss); if (n) dismissed[n.key] = sig(n.html); saveDismissed(); renderNotes(); return; }
    if (e.target.closest('[data-undismiss]')) { for (const n of NOTES) delete dismissed[n.key]; saveDismissed(); renderNotes(); }
  });
  document.addEventListener('click', () => { if (notesOpen) { notesOpen = false; renderNotes(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && notesOpen) { notesOpen = false; renderNotes(); $('notes-btn').focus(); } });

  /* ---------- help tooltips ---------- */
  /** A focusable "?" whose text is also a visually hidden span it is described by. */
  const helpIcon = (id, label, html) => `<button type="button" class="help" aria-label="${esc(label)}" aria-describedby="help-${esc(id)}" aria-expanded="false" data-help="${esc(id)}">?</button><span id="help-${esc(id)}" class="visually-hidden">${html}</span>`;
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true'); // screen readers get the text via aria-describedby
  document.body.appendChild(tip);
  let tipFor = null, tipPinned = false;
  function showTip(btn, pin = false) {
    // a mark carries its words in data-tiptext (and in its aria-label); a help icon in a hidden span it is described by
    const plainText = btn.dataset.tiptext;
    const text = plainText != null ? { innerHTML: esc(plainText) } : document.getElementById(btn.getAttribute('aria-describedby'));
    if (!text) return;
    if (tipFor && tipFor !== btn) tipFor.setAttribute('aria-expanded', 'false');
    tipFor = btn; tipPinned = pin;
    btn.setAttribute('aria-expanded', 'true');
    /*
     * The tip moves INTO an open modal, rather than living in <body> for ever.
     *
     * A dialog opened with showModal() is painted in the top layer, which is above everything in
     * the document however high its z-index. So a tip anchored to something inside one was built,
     * positioned and shown correctly, and drawn underneath the dialog: the "why?" beside
     * "temperature no reading" did nothing at all, twice, with no error to find.
     */
    const host = btn.closest('dialog[open]') ?? document.body;
    if (tip.parentElement !== host) host.appendChild(tip);
    tip.innerHTML = text.innerHTML;
    tip.hidden = false;
    placeTip();
  }
  function placeTip() {
    if (!tipFor || !tipFor.isConnected) { hideTip(); return; }
    const a = tipFor.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 10;
    const below = a.bottom + gap + h <= innerHeight - 8 || a.top - gap - h < 8;
    const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), innerWidth - w - 8);
    const top = below ? a.bottom + gap : a.top - gap - h;
    /*
     * These are viewport coordinates, and a `fixed` element only uses them while nothing above it
     * has made itself a containing block. .cldlg has `backdrop-filter`, which does exactly that --
     * so once the tip moved inside a dialog to get above the top layer, the same numbers were read
     * against the dialog's own box and the tip landed 4,600px down the page.
     */
    const host = tip.parentElement;
    const o = host && host !== document.body ? host.getBoundingClientRect() : { left: 0, top: 0 };
    tip.style.left = `${left - o.left}px`;
    tip.style.top = `${top - o.top}px`;
    tip.dataset.side = below ? 'below' : 'above';
    tip.style.setProperty('--arrow-x', `${Math.min(Math.max(12, a.left + a.width / 2 - left), w - 12)}px`);
  }
  function hideTip() {
    tipFor?.setAttribute('aria-expanded', 'false');
    tipFor = null; tipPinned = false; tip.hidden = true;
  }
  /*
   * A tip survives the page redrawing under a still cursor.
   *
   * The run bars are rewritten on every poll, so the element the pointer was over is removed and
   * the tip goes with it. The pointer has not moved, so no pointerover fires on the replacement
   * and the tip never comes back: hovering a disabled Stop showed its reason for a moment and then
   * nothing, which reads as a control that does not explain itself. The last pointer position is
   * remembered and the tip re-anchored to whatever is under it afterwards.
   */
  let ptr = null;
  document.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') ptr = { x: e.clientX, y: e.clientY }; }, { passive: true });
  function reTip() {
    if (!ptr || tipPinned) return;
    const under = document.elementFromPoint(ptr.x, ptr.y)?.closest?.('.help, [data-tip]');
    if (under) showTip(under);
    else if (tipFor && !tipFor.isConnected) hideTip();
  }
  document.addEventListener('pointerover', (e) => { const b = e.target.closest?.('.help, [data-tip]'); if (b && e.pointerType === 'mouse' && !tipPinned) showTip(b); });
  document.addEventListener('pointerout', (e) => { const b = e.target.closest?.('.help, [data-tip]'); if (b && b === tipFor && e.pointerType === 'mouse' && !tipPinned && !b.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest?.('.help, [data-tip]'); if (b) showTip(b); });
  document.addEventListener('focusout', (e) => { if (e.target === tipFor && !tipPinned) hideTip(); });
  // a tap (or click) pins it open; a tap anywhere else closes it
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('.help');
    if (b) { e.stopPropagation(); if (tipFor === b && tipPinned) hideTip(); else showTip(b, true); return; }
    if (tipFor) hideTip();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tipFor) { const b = tipFor; hideTip(); if (document.activeElement !== b) b.focus({ preventScroll: true }); } });
  addEventListener('scroll', () => tipFor && placeTip(), { passive: true, capture: true });
  addEventListener('resize', () => tipFor && placeTip());

  /** Whether a model passes a set of filters. Every count on a chip is this, over all models. */
  const passes = (m, f) => {
    if (f.filter !== 'all' && m.status !== f.filter) return false;
    if (f.blk && !BLK.get(f.blk)?.ids.has(m.id)) return false;
    if (f.group !== 'all' && m.group !== f.group) return false;
    for (const t of f.tags) if (!(m.tags ?? []).includes(t)) return false;
    const needle = f.query.trim().toLowerCase();
    if (needle && ![m.id, m.title, m.groupLabel, ...(m.tags ?? [])].join(' ').toLowerCase().includes(needle)) return false;
    return true;
  };
  const view = () => ({ filter, group, tags, query, blk });
  const countWith = (over) => { const f = { ...view(), ...over }; return L.models.filter((m) => passes(m, f)).length; };

  function render() {
    if (!L) return;
    syncChecks(L.checkList);
    const c = L.counts, n = c.models;
    /*
     * The tab says where the board is.
     *
     * This page is left open for hours while a run goes, and a run is the reason it is open.
     * "Ledger" in the tab strip told you nothing you did not already know, so you had to bring
     * the window forward to find out whether anything had moved. A run in progress wins the
     * title because it is the thing that is changing; otherwise the score.
     */
    {
      /*
       * The name in the tab is the one on the column, not the first word of the sentence.
       *
       * It used to be the check's title with `.replace(/ (.*)$/, '')` -- a regex that had lost its
       * backslashes and so cut at the first SPACE instead of at a trailing "(check-stages)". The
       * tab read "Same 22/135" for stages, "Pause" for access, "What" for app: the first word of a
       * description, which names nothing. `short` is what the column heading says, so the tab and
       * the table call the same run the same thing.
       *
       * The count comes from the check that is actually named, not from whichever running record
       * happened to be first: with two runs going those were different checks, so the tab put one
       * check's name beside another's progress.
       */
      const nameOf = (key) => CHECK_LIST.find((x) => x.key === key)?.short
        ?? (CHECK_NAMES[key] ?? key).replace(/\s*\([^)]*\)\s*$/, '');
      const first = (RUN_NOW.runs ?? [])[0] ?? null;
      const rec = first && L.running ? L.running[first.what] : null;
      const far = rec && rec.total ? ` ${rec.done ?? 0}/${rec.total}` : '';
      const more = (RUN_NOW.runs ?? []).length > 1 ? ` +${RUN_NOW.runs.length - 1}` : '';
      document.title = first
        ? `${nameOf(first.what)}${far}${more} · Ledger`
        : `${c.approved}/${n} · Ledger`;
    }
    const by = L.build?.by ? ` by <code>${esc(L.build.by)}</code>${L.build.reason ? ` (${esc(L.build.reason)})` : ''}` : '';
    const built = L.generatedAt ? new Date(L.generatedAt).toLocaleString() : 'an unknown time';
    const full = `Built ${built}${L.build?.by ? ` by ${L.build.by}${L.build.reason ? ` (${L.build.reason})` : ''}` : ''} at HEAD ${L.head}. Every status below is read from git, the model files and the captured checks.`;
    // short while it is fresh; the age is the fact, so it is never rounded away
    $('meta').innerHTML = `<span tabindex="0" data-tip data-tiptext="${esc(full)}">HEAD <code>${esc(L.head)}</code></span><span class="sep">·</span><span>built ${agoSpan(L.generatedAt)}</span>`;

    const notes = [];
    for (const [name, src] of Object.entries(L.sources.checks)) if (/never been captured/.test(src)) notes.push({ key: `never:${name}`, col: name, html: `<b>${esc(CHECK_NAMES[name] ?? name)}</b> has no result file: its column says “not run yet” for every model because no run was captured, not because models failed. Capture one with <code>npm run capture -- ${esc(name)}</code>.` });
    for (const note of L.notes ?? []) notes.push({ key: `ledger:${sig(note)}`, html: esc(note) });
    NOTES = NOTES_EXTRA ? [...notes, { key: 'balance', html: NOTES_EXTRA }] : notes;
    $('notices').innerHTML = releaseNotice();
    renderNotes();

    /*
     * Each column carries its own count.
     *
     * The bars used to hold these: one bar per check, "Contract 135/135", over the models of
     * whichever stage was open. The bars are gone -- they said a column at a time what the table
     * says all at once -- but the counts were the part worth keeping, so they moved into the heading
     * of the column they were counting. The tooltip has the whole split, which is the only place the
     * difference between "failed" and "passed on older code" is spelled out in words.
     */
    const SPLIT = [['pass', 'pass'], ['stale', 'passed on older code'], ['flag', 'flagged, needs a person'],
      ['fail', 'failed'], ['broke', "didn't run"], ['never', 'not run yet']];
    const tallyOf = (k) => {
      const c = CHECK_LIST.find((x) => x.key === k);
      if (!c?.tally) return null;
      const of = L.models.length;
      const split = SPLIT.filter(([x]) => c.tally[x]).map(([x, label]) => `${c.tally[x]} ${label}`).join(', ');
      return { pass: c.tally.pass ?? 0, of, said: `${c.title}, over all ${of} models: ${split || 'nothing counted'}.` };
    };
    // short headers: each names its check in the tooltip and opens its definition
    const theadHtml = `<th class="model" scope="col"><span class="colh__wrap colh__wrap--model"><span class="suite" id="suite" data-suite></span><span class="colh colh--plain">Model</span></span></th><th class="st" scope="col">Status</th>${COLS.map(([k, label]) => {
      const note = NOTES.find((n) => n.col === k); // why the column reads as it does, even after the note is dismissed
      const title = CHECK_NAMES[k] ?? k;
      const going = RUN_NOW.runs.some((r) => r.what === k);
      return `<th class="c${going ? ' is-running-col' : ''}" scope="col"><span class="colh__wrap"><button type="button" class="colh" data-def="${esc(k)}" data-tip data-tiptext="${esc(`${title}. Click for its definition.`)}" aria-label="${esc(`${title}: open its definition`)}">${esc(label)}</button>${note ? helpIcon(`col-${k}`, `About the ${label} column`, note.html) : ''}${RUN_OK ? `<span class="colh__run">${runBtn(k, [], `Run ${title} on every model`, 'cellrun')}</span>` : ''}</span></th>`;
    }).join('')}<th class="last" scope="col">Last commit</th><th class="num ncom" scope="col">Commits</th>`;
    // rewritten only when it changes, so an open tooltip is not pulled out from under the reader
    if ($('thead').dataset.html !== theadHtml) { $('thead').dataset.html = theadHtml; $('thead').innerHTML = theadHtml; stickyOffsets(); }
    // The head is rewritten only when its own html changes, and the suite control is not part of
    // that html -- it is filled in afterwards, from the board's state, on its own clock.
    renderSuite();
    paintHeadRuns();

    // an old ledger has no blockers: a filter set by one would hide every row without saying why
    if (!Array.isArray(c.blockers) && !String(blk).startsWith('status:')) blk = null;
    renderOverview();
    renderRules();
    renderSiteChecks();
    renderColRuns();
    renderMarkLegend();

    // a group or tag chosen earlier that no longer exists would hide everything without saying why
    if (group !== 'all' && !(L.groups ?? []).some((g) => g.key === group)) group = 'all';
    for (const t of [...tags]) if (!(L.tags ?? []).includes(t)) tags.delete(t);
    renderFilterChips();
    renderRows();
    renderReadiness();
    paintNavIcons();
  }

  /**
   * The gallery's filter bar, filled in: status tabs, the Tags button, group and tag chips. Each
   * count is what the list would hold with that choice, given every other filter and the search.
   */
  const HASH = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>';
  const XICON = icon('x');
  const COPYICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  /** Copy a full hash. The clipboard can be refused (no permission, an insecure origin), so the button
      says which of the two happened rather than pretending it worked. */
  async function copyHash(btn) {
    const text = btn.dataset.copy ?? '';
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    btn.classList.toggle('is-done', ok);
    btn.classList.toggle('is-nope', !ok);
    btn.setAttribute('data-tiptext', ok ? `Copied ${text}` : `Could not copy: ${text}`);
    setTimeout(() => { btn.classList.remove('is-done', 'is-nope'); btn.setAttribute('data-tiptext', text); }, 1600);
  }
  function renderFilterChips() {
    const n = L.models.length;
    // short labels that never break; the bucket's full name and definition are in the tooltip
    const meansOf = (k) => (L.counts.buckets ?? []).find((b) => b.key === k)?.means;
    $('f-status').innerHTML = [['all', 'All', 'every model, whatever its status'], ...STATUS.map((s) => [s.key, s.short, `${s.long}: ${meansOf(s.key) ?? ''}`])]
      .map(([k, label, def]) => { const n = countWith({ filter: k }); return `<button type="button" class="tab" data-f="${esc(k)}" aria-pressed="${filter === k}" aria-label="${esc(`${label}, ${n}`)}" data-tip data-tiptext="${esc(def)}">${esc(label)} <b aria-hidden="true">${n}</b></button>`; }).join('');
    tabsFade();
    const hidden = n - countWith({});
    const groups = [{ key: 'all', label: 'All groups' }, ...(L.groups ?? [])];
    $('f-group').innerHTML = (hidden ? `<button type="button" class="group group--clear" data-clear title="Clear every filter and the search">${XICON} Clear <b>${hidden} hidden</b></button>` : '')
      + groups.map((g) => {
        const c = countWith({ group: g.key });
        const on = group === g.key;
        return `<button type="button" class="group" data-g="${esc(g.key)}" aria-pressed="${on}"${c === 0 && !on ? ' disabled' : ''}>${esc(g.label)} <b>${c}</b></button>`;
      }).join('');
    // as in the gallery: tags combine (a model needs every picked tag); a tag that would leave
    // nothing is left out, the picked ones always stay
    $('f-tags').innerHTML = (L.tags ?? []).map((t) => {
      const on = tags.has(t);
      const c = on ? countWith({}) : countWith({ tags: new Set([...tags, t]) });
      if (c === 0 && !on) return '';
      return `<button type="button" class="tchip" data-t="${esc(t)}" aria-pressed="${on}">#${esc(t)} <b>${c}</b></button>`;
    }).join('');
    const btn = $('tags-toggle');
    btn.innerHTML = `${HASH} <span class="btn__label">Tags</span>${tags.size ? ` <b>${tags.size}</b>` : ''}`;
    btn.setAttribute('aria-label', tags.size ? `Tags, ${tags.size} selected` : 'Tags');
    btn.setAttribute('aria-expanded', String(tagsOpen));
    $('tags-row').hidden = !tagsOpen;
    $('q-clear').hidden = !query;
    if ($('q').value !== query) $('q').value = query;
    // the chip for a filter a blocker set, with its count: the rows under it are exactly these
    const fc = $('fchip');
    fc.hidden = !blk;
    if (blk) {
      const x = BLK.get(blk);
      fc.innerHTML = `<span class="fchip__c"><span>Showing: ${esc(x?.chip ?? chipLabel(blk))} (${x?.ids.size ?? 0})</span><button type="button" class="fchip__x" data-unblk aria-label="Stop showing only these; show every model">${XICON}</button></span>${x ? '' : '<span class="fchip__note">No model is held by this any more.</span>'}`;
    } else fc.innerHTML = '';
    syncPressed();
    queueMicrotask(() => { groupsScroll.reveal($('f-group').querySelector('.group[aria-pressed="true"]')); tagsScroll.update(); });
  }
  function onFilterClick(e) {
    const b = e.target.closest('button');
    if (!b || !L) return;
    if (b.dataset.f) filter = b.dataset.f;
    else if (b.dataset.g) group = b.dataset.g;
    else if (b.dataset.t) tags.has(b.dataset.t) ? tags.delete(b.dataset.t) : tags.add(b.dataset.t);
    else if ('clear' in b.dataset) { filter = 'all'; group = 'all'; tags.clear(); query = ''; blk = null; }
    else if ('unblk' in b.dataset) { blk = null; }
    else if (b.id === 'tags-toggle') { tagsOpen = !tagsOpen; saveView(); renderFilterChips(); return; }
    else if (b.id === 'q-clear') { query = ''; $('q').focus(); }
    else return;
    limit = PAGE;
    saveView();
    const keep = b.dataset.f ? `[data-f="${CSS.escape(b.dataset.f)}"]` : b.dataset.g ? `[data-g="${CSS.escape(b.dataset.g)}"]` : b.dataset.t ? `[data-t="${CSS.escape(b.dataset.t)}"]` : null;
    renderFilterChips();
    renderRows();
    if (keep) $('filters').querySelector(keep)?.focus({ preventScroll: true });
  }

  /* the groups and tags rows: fade and show an arrow only where there is more to scroll (main.ts scrollRow) */
  function scrollRow(row) {
    const track = row.querySelector('.scrollrow__track');
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      row.classList.toggle('can-prev', scrollLeft > 2);
      row.classList.toggle('can-next', scrollLeft + clientWidth < scrollWidth - 2);
    };
    track.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    for (const [sel, dir] of [['.scrollrow__arrow--prev', -1], ['.scrollrow__arrow--next', 1]]) {
      row.querySelector(sel).addEventListener('click', (e) => { e.stopPropagation(); track.scrollBy({ left: dir * track.clientWidth * 0.7, behavior: 'smooth' }); });
    }
    const reveal = (el) => {
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
  const groupsScroll = scrollRow($('groups-row'));
  /** The status tabs scroll sideways inside themselves when the bar is tight; a fade marks the side with more. */
  function tabsFade() {
    const t = $('f-status');
    t.classList.toggle('can-prev', t.scrollLeft > 2);
    t.classList.toggle('can-next', t.scrollLeft + t.clientWidth < t.scrollWidth - 2);
  }
  $('f-status').addEventListener('scroll', tabsFade, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(tabsFade).observe($('f-status'));
  /* The sticky stack, measured rather than assumed: the filter bar rests --stick-top below the viewport
     edge (the same height as the lead's record beside it), the table's header pins directly under the
     bar's bottom edge, and each group row pins under the header. Nothing here is a written-in number:
     the bar's height changes as its chips rewrap, which happens while it is stuck and without any
     resize event, so the measurement runs on scroll as well -- once a frame, never per event. */
  let stickTop = 0, headH = 0, wasStuck = null, wasEdge = null, tucked = false;
  function stickyOffsets() {
    const bar = $('filters');
    stickTop = parseFloat(getComputedStyle(bar).top) || 0;
    /* --fbar-h is the searching and filtering on its own, without the gap it floats in. The two are
       separate because only one of them goes away: the gap is there at every scroll position, and
       the bar's height is what the stack below either makes room for or closes up over. */
    document.documentElement.style.setProperty('--fbar-h', `${Math.round(bar.offsetHeight)}px`);
    document.documentElement.style.setProperty('--stick-head', `${Math.round(stickTop + bar.offsetHeight)}px`);
    // the thead is hidden on a phone, where each model is a card: measuring it gives 0 there by itself
    headH = Math.round($('thead').offsetHeight);
    document.documentElement.style.setProperty('--head-h', `${headH}px`);
    /* The bar for a run over every model is the one thing on this page that is still changing while
       you read it, and it was the first thing to go: it stuck at the same offset as the group rows,
       which come after it in the table, so the first group covered it as soon as you scrolled. It
       is a step of its own in the stack now -- its own height, measured like the rest, and zero the
       moment no run is on, so nothing is held open for a bar that is not there. */
    const suite = $('rows').querySelector('tr.suiterun > td');
    document.documentElement.style.setProperty('--suite-h', `${suite ? Math.round(suite.offsetHeight) : 0}px`);
    const grow = $('rows').querySelector('tr.grow > th');
    document.documentElement.style.setProperty('--grow-h', `${grow ? Math.round(grow.offsetHeight) : 0}px`);
    onScroll();
  }
  /* ---------- searching and the run bar get out of the way on the way down ----------
     Four bands were pinned at the top while you read the rows: the search and its filters, the
     column headings, the bar for a run over every model, and the group heading. Together that is
     most of a phone's screen and a third of a laptop's, held for two things you are not doing --
     searching, and watching a count -- while you read the one you are: which models are where.

     So a run of downward travel takes the search and the run bar away, and any upward travel brings
     them back. What stays is what you are reading with: the column headings, which carry the button
     that runs each check, and the group heading, which is the only thing on screen that says where
     in 135 models you are. That is also why the header itself does not go: hiding it hides nine
     controls, and a control you have to scroll up to find is one you cannot find.

     Travel has to build up before either move, so a jittery wheel or a thumb resting on the glass
     does nothing, and the bars come straight back near the top of the page, while a dialog is open,
     and the moment anything in them takes focus -- a keyboard must never be typing into a box that
     has been scrolled off the screen. */
  let lastY = -1, run = 0;
  const TUCK_AFTER = 110, BACK_AFTER = 45;
  const dialogOpen = () => Boolean($('rules-dialog').open || $('blk-dialog').open || $('cl-dialog').open);
  function setTuck(on) {
    if (on === tucked) return;
    tucked = on;
    /* --show is the whole mechanism: 1 while the two bands are out, 0 while they are away. Every
       offset under them is written as `their height * var(--show)`, so the stack closes up and
       opens out from one number, and the heights themselves stay honest measurements of what
       those bands are -- not of whether they happen to be on screen. */
    document.documentElement.classList.toggle('tucked', on);
    document.documentElement.style.setProperty('--show', on ? '0' : '1');
  }
  const revealHead = () => { run = 0; setTuck(false); };
  $('filters').addEventListener('focusin', revealHead);
  $('tbl').addEventListener('focusin', revealHead);
  /* What scrolling alone can change: whether the bar is resting, whether the header should be away, and
     where the record's handle stands. All of it off one rectangle, not a re-measure of the stack -- the
     bar's height changes when its chips rewrap, and a ResizeObserver already catches that, so reading
     the whole stack per frame would be layout forced for nothing. Nothing is written unless it moved. */
  function onScroll() {
    const bar = $('filters');
    const stuck = bar.getBoundingClientRect().top <= stickTop + 0.5;
    if (stuck !== wasStuck) { wasStuck = stuck; bar.classList.toggle('is-stuck', stuck); }
    const y = Math.max(0, scrollY);
    const dy = lastY < 0 ? 0 : y - lastY;
    lastY = y;
    // A turn resets the tally, so it is a run of travel one way that counts and not the sum of a
    // fidget: sixty down then sixty up leaves nothing, where adding them would have tucked.
    if ((dy > 0 && run < 0) || (dy < 0 && run > 0)) run = 0;
    run += dy;
    /*
     * Nothing tucks until the band is doing something.
     *
     * The test used to be how far down the page you were, and a hundred pixels of travel is easy
     * to reach before the table's own top has even gone by. Two things were wrong with tucking
     * there. The band was not covering anything yet, so taking it away bought no rows -- it just
     * took the search box off the screen of somebody who had barely started scrolling. And the run
     * bar still had its row in the flow at the top of the table, so hiding it left a band of empty
     * table where it had been: a hole is not less in the way than a bar.
     *
     * So the table's top edge has to be past the top of the window. Then the header is pinned, the
     * run bar's own row is above the window with only its pinned copy on screen, and taking the
     * band away really does hand those rows back.
     */
    const deep = $('tbl').getBoundingClientRect().top <= 0;
    if (dialogOpen() || !deep) revealHead();
    else if (run > TUCK_AFTER) setTuck(true);
    else if (run < -BACK_AFTER) revealHead();
  }
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(stickyOffsets); ro.observe($('filters')); ro.observe($('thead')); }
  addEventListener('resize', stickyOffsets);
  { let frame = 0; addEventListener('scroll', () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; onScroll(); }); }, { passive: true }); }
  /* Nothing animates off-screen. The stage strip is the page's most expensive thing to draw by a wide
     margin (measured: it is most of the frame budget while the table scrolls), and once it has scrolled
     away it is still being drawn thirty times a second. This pauses it -- play-state only, so not one
     line of how the strip looks or moves is changed -- and does the same for the pills' specular. */
  if ('IntersectionObserver' in window) {
    const watch = (el, cls) => { if (!el) return; new IntersectionObserver(([e]) => document.documentElement.classList.toggle(cls, !e.isIntersecting), { rootMargin: '120px' }).observe(el); };
    watch($('stats'), 'strip-away');
    watch($('tablewrap'), 'table-away');
  }
  const tagsScroll = scrollRow($('tags-row'));
  const legendScroll = scrollRow($('legend-row'));
  $('filters').addEventListener('click', onFilterClick);
  $('q').addEventListener('input', () => { if (!L) return; query = $('q').value; limit = PAGE; saveView(); renderFilterChips(); renderRows(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); $('q').focus(); }
  });

  let moreObserver = null;

  const badKey = (k) => `bad:${k}`;
  /** The ad-hoc "this check failed or flagged" filter is built from the models, not from ledger.json's
      blockers, so it has to be rebuilt on every render -- including after a reload that remembered it. */
  function ensureBad() {
    if (!blk?.startsWith('bad:')) return;
    const k = blk.slice(4);
    if (!COLS.some(([c]) => c === k)) { blk = null; return; }
    BLK.set(blk, { ids: new Set(L.models.filter((m) => problemsOf(m).includes(k)).map((m) => m.id)), chip: `${CHECK_NAMES[k] ?? k}: failed or flagged` });
  }
  /** Show exactly the models a check failed or flagged, whatever the filter was: the chip's promise. */
  function showBad(k) {
    filter = 'all'; group = 'all'; tags.clear(); query = ''; $('q').value = '';
    blk = badKey(k); ensureBad();
    limit = Math.max(PAGE, L.models.length);
    saveView(); renderFilterChips(); renderRows(); renderOverview();
    $('tbl-h').closest('section').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* ---------- group sections: folded or open, remembered per viewer ---------- */
  const FLAT_BELOW = 12; // a filter that leaves this many models or fewer shows them as one flat list
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  let groupState = {};
  try { groupState = JSON.parse(localStorage.getItem('ledger-groups') || '{}') || {}; } catch {}
  let foldView = { key: '', fold: {} }; // folds made while a filter is on: forgotten when the filter changes
  const filteringNow = () => blk !== null || filter !== 'all' || group !== 'all' || tags.size > 0 || query.trim() !== '';
  const saveGroups = () => { try { localStorage.setItem('ledger-groups', JSON.stringify(groupState)); } catch {} };
  /** Whether any check of a model fails, flags or is running on it now: what a folded group must still show. */
  const problemsOf = (m) => COLS.map(([k]) => k).filter((k) => ['fail', 'flag'].includes(markKind(m.checks[k])[0]));
  /** The checks whose test crashed on a model: shown apart from its problems, since the model was never judged. */
  const brokeOf = (m) => COLS.map(([k]) => k).filter((k) => markKind(m.checks[k])[0] === 'broke');
  const runningOn = (m) => COLS.map(([k]) => k).filter((k) => isLive(k) && L.running?.[k]?.last === m.id);
  function groupSections(list) {
    const order = (L.groups ?? []).map((g) => g.key);
    const by = new Map();
    for (const m of list) { const k = m.group ?? '(none)'; if (!by.has(k)) by.set(k, []); by.get(k).push(m); }
    const keys = [...by.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
    return keys.map((k) => ({ key: k, label: (L.groups ?? []).find((g) => g.key === k)?.label ?? k, models: by.get(k), all: L.models.filter((m) => (m.group ?? '(none)') === k) }));
  }
  /** Open unless the viewer folded it; by default a group with a problem or a run on it opens, a fully approved one folds. */
  function groupOpen(g) {
    if (g.key in groupState) return groupState[g.key];
    const trouble = g.all.some((m) => problemsOf(m).length || runningOn(m).length);
    if (trouble) return true;
    return !g.all.every((m) => m.approved);
  }
  /**
   * The models that are ticked.
   *
   * A group's run used to mean "every model in this group", which is right until one model in the
   * group is the one that changed. Ticking is how you say which: tick none and a group's buttons
   * still mean all of it, so the common case needs no ticking at all.
   *
   * It is not remembered between visits on purpose. A tick is about what you are doing in the next
   * minute, and a tick restored from last week would quietly narrow a run you thought was whole.
   */
  const PICKED = new Set();
  /**
   * A column heading runs over what is ticked, wherever those models are.
   *
   * A group's buttons have always meant "the ticked ones in this group, or all of it if none are"
   * (targetOf). The column heading did not look at ticks at all: it meant every model, always. So
   * thirteen models spread over four groups -- which is what one evening's editing looks like --
   * could only be run a cell at a time, or four group presses, for each of five checks.
   *
   * The ticks are already global; only the heading was ignoring them. It says which it means, so
   * a run of thirteen can never be mistaken for a run of everything.
   *
   * Written here rather than into the head's own html because that html is rebuilt only when it
   * changes, and a tick must not pull an open tooltip out from under the reader.
   */
  function paintHeadRuns() {
    if (!RUN_OK) return;
    const ids = [...PICKED];
    for (const th of $('thead').querySelectorAll('th.c')) {
      const k = th.querySelector('.colh')?.dataset.def;
      const slot = th.querySelector('.colh__run');
      if (!k || !slot) continue;
      const title = CHECK_NAMES[k] ?? k;
      slot.innerHTML = runBtn(k, ids, ids.length
        ? `Run ${title} on the ${ids.length} ticked model${ids.length === 1 ? '' : 's'}`
        : `Run ${title} on every model`, 'cellrun');
    }
  }
  /** What a group's buttons will actually run over: the ticked ones, or all of them if none are. */
  function targetOf(g) {
    const all = g.models.map((m) => m.id);
    const picked = all.filter((id) => PICKED.has(id));
    return { ids: picked.length ? picked : all, picked: picked.length, all: all.length };
  }
  const tickBox = (attr, val, on, mixed, label) =>
    `<input type="checkbox" class="pick" ${attr}="${esc(val)}"${on ? ' checked' : ''}${mixed ? ' data-mixed="1"' : ''} aria-label="${esc(label)}">`;

  /**
   * A group, in one row.
   *
   * It used to be two: a heading across the whole table, and under it a second row of cells
   * carrying a run button per check -- because a heading that spans every column has nowhere to
   * put a control that belongs to one of them. Giving the heading real cells solves that without
   * the second row: the name, the tick and the bar take the Model and Status columns, and each
   * check column holds the button that runs that check over this group.
   *
   * The chips that used to sit at the end of the heading -- "Share 15", "Motion 4", one per check
   * with a problem -- are gone with it. Every one of those numbers is a column of marks directly
   * underneath, in the rows the chip was counting: the chip said "15 failed Share" over fifteen
   * rows each showing a failed Share. Saying it twice is not saying it better, and the chips were
   * counting the whole group while the rows under them were whatever the filter had left, which
   * took a paragraph of explanation to keep honest.
   */
  function groupRow(g, opened) {
    const n = g.all.length;
    const count = (st) => g.all.filter((m) => m.status === st).length;
    const ap = count('approved'), cv = count('to check');
    const seg = (x, c, w) => x ? `<i style="flex-grow:${x};background:${c}" title="${esc(`${x} ${w}`)}"></i>` : '';
    const shownNote = g.models.length !== n ? `, ${g.models.length} match` : '';
    const t0 = targetOf(g);
    const allOn = t0.picked === t0.all && t0.all > 0;
    /* A run started from this group's row belongs to this group's row: while it goes, the heading
       shows how far it has got instead of how its models stand, because the second is about to
       change and the first is the thing you are waiting on. */
    const onHere = BARS.group.get(g.key) ?? [];
    /* A run over this group gets a row of its own under the heading, across every column, exactly
       as a model's does. It used to share the heading's cell with the name and the status bar --
       two columns wide -- so a track measuring twenty-eight models stopped halfway along the row
       it was measuring, and the per-check buttons had to disappear to make room for it. It spans
       now and the buttons stay, so a second check can be started while the first works through. */
    // what the buttons in this row will act on: the ticked ones, or all of them if none are ticked
    const over = t0.picked ? `the ${t0.picked} ticked in ${g.label}` : g.label;
    const cells = RUN_OK && g.key
      // the column a run is working through is marked, so you can see which of the nine is going
      ? COLS.map(([k, label]) => `<td class="c${onHere.some(([rk]) => rk === k) ? ' is-running-col' : ''}">${runBtn(k, t0.ids, `Run ${label} on ${over}`, 'cellrun')}</td>`).join('')
      : COLS.map(() => '<td class="c"></td>').join('');
    return `<tr class="grow" style="--gc:${gcFor(g.key)}">
      <th class="model" colspan="2" scope="rowgroup"><div class="grow__in">
      ${RUN_OK ? tickBox('data-pick-grp', g.key, allOn, t0.picked > 0 && !allOn, `Tick every model shown in ${g.label}`) : ''}
      <button type="button" class="grow__btn" data-grp="${esc(g.key)}" aria-expanded="${opened}">${CHEVRON}${esc(g.label)} <span class="n">· ${n}${shownNote}</span></button>
      <span class="mt__run">${runBtn('all', t0.ids, t0.picked ? `Run every check on the ${t0.picked} ticked in ${g.label}` : `Run every check on ${g.label}`)}</span>
      ${`<span class="grow__bar" role="img" aria-label="${esc(`${ap} of ${n} approved, ${cv} to check`)}">${seg(ap, 'var(--st-ok)', 'approved')}${seg(cv, 'var(--st-conv)', 'to check')}</span>
      <span class="grow__meta">${ap} approved · ${cv} to check${t0.picked ? ` · <b>${t0.picked} ticked</b>` : ''}</span>`}
      </div></th>
      ${cells}<td class="last"></td><td class="num ncom"></td></tr>
    ${onHere.length
      ? `<tr class="detail detail--run" style="--gc:${gcFor(g.key)}"><td colspan="${colCount()}">${onHere.map(([k, pr]) => runBar(k, pr, g.label)).join('')}</td></tr>`
      : ''}`;
  }
  /**
   * A run button for part of the table.
   *
   * Everything used to run over all 135 models or nothing, which is the wrong size for most of what
   * you actually want: one model has changed, or one group, or one check is red and the rest are
   * fine. `what` is a check key or 'all'; `ids` are the models it covers.
   */
  /**
   * @param text  words to put INSIDE the button. Without it the button is the icon alone, which
   *   is right in a table cell where the column says what it runs. In a list with no column to
   *   read, the name has to be part of the control: an icon beside a word is two things to aim
   *   at, of which only one works.
   */
  function runBtn(what, ids, label, cls = 'rowrun', text = '') {
    if (!RUN_OK) return '';
    const key = runKey(what, ids);
    /*
     * Pressed, and the board has not answered yet.
     *
     * Everywhere but a cell that is a spinner in the button's own place, which is right: the
     * button is the thing you pressed. In a cell the button sits ON the mark, so the spinner
     * covered the verdict with a hollow ring -- the same hiding that running used to do, for a
     * state where nothing is running at all and the old verdict is still simply true.
     *
     * A cell says it on the mark instead (is-starting in checkMark): the same ring, in the
     * colour of a press rather than of a re-decision, with the verdict readable underneath.
     */
    if (PENDING && PENDING.key === key && cls !== 'cellrun') return `<span class="${cls} ckrun--wait" role="status" aria-label="Starting"><i></i></span>`;
    const r = runOf(what);
    /*
     * A run the board did not start is still a run.
     *
     * This asked for r.mine, which is true only of a run this board spawned and has a pid for.
     * So a check started from a terminal -- `npm run capture -- motion` -- left its column
     * heading showing a play button while its own progress bar sat two rows below saying
     * 30/135. The page knew. It drew the wrong thing anyway.
     *
     * Ownership decides who can PAUSE or STOP it, and nothing else: there is no pid for a run
     * somebody began in a terminal, and a Stop that does nothing is worse than no Stop. Saying
     * a check is running is not a control. It is the truth about the machine either way.
     */
    /*
     * A cell never takes this branch.
     *
     * It used to, when the run named exactly this model -- so running Share on ONE model put a
     * spinner where its mark had been, while running the whole Share column left the mark in
     * place and drew a ring round it. The same fact, two pictures, decided by nothing but
     * whether the run happened to name the model or cover everything.
     *
     * The ring is the right one. The mark under it is the old verdict, and being able to read it
     * while it is re-decided is the whole reason for marking it rather than hiding it. So a cell
     * falls through to the disabled button below, which says which run is in the way, and the
     * mark wears the ring from runStateOf either way.
     */
    if (r && sameIds(r.models ?? [], ids) && cls !== 'cellrun') {
      /*
       * Who carries pause and stop.
       *
       * The bar does. A cell is one check on one model, and the run it is part of may be over
       * twenty-eight models or every check there is -- so a Stop in that cell would not stop the
       * cell, it would stop the whole run, from a control the size of a tick mark that says
       * nothing about what it would take down. Worse, the two of them stacked in one cell, which
       * is what it looked like.
       *
       * So a cell says only that it is being worked on, and the bar for the run -- which names it,
       * counts it and sits across the row -- is where you stop or hold it.
       */
      // Two states share the spinner and they are not the same news: ckrun--wait is a press the
      // board has not answered yet, ckrun--busy is a check actually running over this model. The
      // second is amber, because the mark underneath it is a verdict about to be replaced. It says
      // so in the class and not in where it sits, so a heading, a group and a row all read alike.
      // pause and stop need a pid; without one the honest thing is to say it is running and
      // leave it at that, rather than offer a control that would do nothing
      return r.mine
        ? holdAndStop(cls, what)
        : `<span class="${cls} ckrun--wait ckrun--busy" role="status" aria-label="Being checked now, started outside this board" title="Being checked now. It was started outside this board, so it cannot be paused or stopped from here."><i></i></span>`;
    }
    /*
     * Why this button cannot be pressed, if it cannot.
     *
     * Checks run beside each other now, so "something is running" is not a reason -- checking one
     * model while another model's check runs is the normal thing to want. Only three things stop a
     * press, and each one says which: this check is already going (two runs of one check would have
     * the later one overwrite the earlier one's whole result file), the whole run is going (it
     * covers every check), or the machine is already driving as many browsers as it will.
     */
    const why = blockedBy(what, ids);
    return `<button type="button" class="${cls}${text ? ' ckrun--said' : ''}" data-run-what="${esc(what)}" data-run-ids="${esc(ids.join(','))}" title="${esc(why ?? label)}" aria-label="${esc(label)}"${why ? ' disabled' : ''}>${PLAY}${text ? `<span>${esc(text)}</span>` : ''}</button>`;
  }
  const sameIds = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  /**
   * Why this run cannot start, in the words the button will show, or null if it can.
   *
   * One rule: a run is blocked by a live run of the SAME CHECK, whatever models either names. So
   * a check running anywhere switches off its whole column, cells and group rows and all; and it
   * leaves every OTHER check alone, on every model, which is the whole point of running several at
   * once. Motion over all 135 does not stop you running Stages beside it.
   *
   * "Run everything" is its own case. It walks every check and rewrites every result file, so it
   * cannot share the machine with anything, and nothing can start while it is going. That is not
   * a preference: two runs writing one file do not merge, the later one wins it whole, and the
   * board would show verdicts for models nothing had judged.
   */
  function blockedBy(what, ids) {
    /*
     * A check that measures speed cannot share the machine.
     *
     * Every other check runs on a clock it controls, so what it measures is the same however
     * busy the laptop is. check-perf deliberately does not -- frame times are the thing it is
     * measuring -- so a second browser drawing beside it reads as a slow model. The registry
     * says which checks are like that (`alone`), the board refuses them for the same reason,
     * and this is the page saying so on the button rather than after the press.
     */
    const alone = new Set(CHECK_LIST.filter((c) => c.alone).map((c) => c.key));
    for (const r of RUN_NOW.runs) {
      if (alone.has(r.what)) return `${CHECK_NAMES[r.what] ?? r.what} is running and has the machine to itself: it measures how fast a model draws, so anything running beside it lands in its numbers`;
      if (alone.has(what)) return `${CHECK_NAMES[what] ?? what} measures how fast a model draws, so it waits for an idle machine — ${CHECK_NAMES[r.what] ?? r.what} is running`;
      if (r.what === 'all') return 'the whole run is going, and it covers every check on every model';
      if (what === 'all') {
        return ids.length
          ? `${CHECK_NAMES[r.what] ?? r.label ?? r.what} is running, and every check means that one too`
          : `${CHECK_NAMES[r.what] ?? r.label ?? r.what} is running: the whole run covers every check, so it waits for that to finish`;
      }
      /*
       * The same check twice is refused whatever models it names, and the models used to decide it.
       *
       * One check writes one result file. capture-check reads that file once at its start and
       * writes it back with its own models merged in, so two runs of one check do not divide the
       * work between them: the later write wins the file whole, from a snapshot taken before the
       * earlier run had finished, and the earlier run's models are simply gone from the board.
       *
       * scripts/ledger-server.mjs has always refused this (`runs.has(what)`). The page did not, so
       * running Motion on one model left Motion live on every OTHER model -- buttons that looked
       * pressable and were answered with a refusal. The board decides either way; this is the page
       * agreeing with it beforehand, which is the only version a person can see.
       */
      if (r.what !== what) continue;
      const over = (r.models ?? []).length;
      return `${CHECK_NAMES[what] ?? what} is already running over ${over ? `${over} model${over === 1 ? '' : 's'}` : 'every model'}, and one check writes one result file`;
    }
    // each check drives a real browser over real models, and this is somebody's laptop
    if (RUN_NOW.runs.length >= (RUN_NOW.max ?? 2)) return `${RUN_NOW.runs.length} checks are already running, which is as many as this machine will drive at once`;
    return null;
  }
  /** Every model id in a group, in the order the table shows them. */
  const idsOfGroup = (key) => (L?.models ?? []).filter((m) => (m.group ?? '') === key).map((m) => m.id);

  function modelRow(m, flat) {
    const last = m.commits.find((x) => x.matchedBy.includes('diff')) ?? m.commits[0];
    const glabel = m.groupLabel ?? m.group ?? '';
    const short = glabel.split(/\s*[&,]\s*|\s+/)[0];
    let sd = 0; for (const ch of m.id) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0; // the row's own place in the sweep
    return `<tr class="row${flash.has(m.id) ? ' flash' : ''}" style="--gc:${gcFor(m.group ?? '')};--sweep-d:-${sd % 9}s" tabindex="0" data-id="${esc(m.id)}" aria-expanded="${open.has(m.id)}">
        <td class="model"><div class="mt">${RUN_OK ? tickBox('data-pick', m.id, PICKED.has(m.id), false, `Tick ${m.title} for a group run`) : ''}<b data-tip data-tiptext="${esc(`${m.title} (${m.id}), group: ${glabel || 'none'}`)}">${esc(m.title)}</b><code>${esc(m.id)}</code>${flat && glabel ? `<span class="gchip" data-tip data-tiptext="${esc(`Group: ${glabel}`)}" aria-label="${esc(`group: ${glabel}`)}">${esc(short)}</span>` : ''}<span class="mt__run">${runBtn('all', [m.id], `Run every check on ${m.title}`)}</span></div></td>
        <td class="st">${chipFor(m.status, justApproved.has(m.id))}</td>
        ${COLS.map(([k, label]) => { const busy = runStateOf(k, m); return `<td class="c${busy ? ` ${busy}` : ''}" data-label="${esc(label)}">${checkMark(k, m)}${runBtn(k, [m.id], `Run ${label} on ${m.title}`, 'cellrun')}</td>`; }).join('')}
        <td class="num last">${last ? `<span data-tip data-tiptext="${esc(`${new Date(last.date).toLocaleString()} · ${last.hash}: ${last.subject}`)}" data-ago-short="${esc(last.date)}">${esc(fmtAgeShort(age(last.date)))}</span>` : '<span class="muted">none found</span>'}</td>
        <td class="num ncom">${m.commits.length}</td></tr>`;
  }
  /* A tap is the only pointer a phone has, and it cannot hover first. The first tap on a check
     cell swaps its mark for the button; the second one presses it. On a machine with a pointer
     this never fires, because hover has already done the swap. */
  const noHover = () => window.matchMedia?.('(hover: none)').matches ?? false;
  $('rows').addEventListener('click', (e) => {
    if (noHover()) {
      const cell = e.target.closest('td.c');
      if (cell && !cell.classList.contains('is-armed') && !e.target.closest('button, input')) {
        e.stopPropagation();
        $('rows').querySelectorAll('td.c.is-armed').forEach((x) => x.classList.remove('is-armed'));
        if (cell.querySelector('.cellrun')) { cell.classList.add('is-armed'); return; }
      }
    }
    const tick = e.target.closest('[data-pick]');
    if (tick) {
      e.stopPropagation();
      tick.checked ? PICKED.add(tick.dataset.pick) : PICKED.delete(tick.dataset.pick);
      renderRows();
      paintHeadRuns(); // the column headings say how many are ticked
      return;
    }
    const gtick = e.target.closest('[data-pick-grp]');
    if (gtick) {
      e.stopPropagation();
      // over the models this group is SHOWING, not every model it has: a tick you cannot see is a
      // model you did not mean to include, and the filter is the reader saying what they care about
      const ids = (view0(gtick.dataset.pickGrp) ?? []).map((m) => m.id);
      for (const id of ids) gtick.checked ? PICKED.add(id) : PICKED.delete(id);
      renderRows();
      paintHeadRuns(); // the column headings say how many are ticked
      return;
    }
    const un = e.target.closest('[data-untick]');
    if (un) {
      e.stopPropagation();
      for (const m of view0(un.dataset.untick) ?? []) PICKED.delete(m.id);
      renderRows();
      paintHeadRuns(); // the column headings say how many are ticked
      return;
    }
    const bad = e.target.closest('[data-show-bad]');
    if (bad) { e.stopPropagation(); showBad(bad.dataset.showBad); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { e.stopPropagation(); copyHash(cp); return; }
    // one check's detail, opened in place: no re-render, so nothing below it jumps
    const ck = e.target.closest('[data-ck]');
    if (ck) {
      e.stopPropagation();
      const now = ck.getAttribute('aria-expanded') !== 'true';
      ckOpen.set(ckKey(ck.dataset.ckModel, ck.dataset.ck), now);
      ck.setAttribute('aria-expanded', String(now));
      ck.closest('.ck')?.classList.toggle('is-open', now);
      const body = document.getElementById(ck.getAttribute('aria-controls'));
      if (body) body.hidden = !now;
      return;
    }
    const b = e.target.closest('[data-grp]');
    if (!b) return;
    e.stopPropagation();
    const k = b.dataset.grp;
    const opening = b.getAttribute('aria-expanded') !== 'true';
    if (filteringNow()) foldView.fold[k] = !opening; else { groupState[k] = opening; saveGroups(); }
    renderRows();
    $('rows').querySelector(`[data-grp="${CSS.escape(k)}"]`)?.focus({ preventScroll: true });
  });
  const setAll = (v) => {
    for (const g of L?.groups ?? []) { if (filteringNow()) foldView.fold[g.key] = !v; else groupState[g.key] = v; }
    if (!filteringNow()) saveGroups();
    renderRows();
  };
  /* One button, named for the thing it will do rather than for a pair of states. A mix of open and
     folded groups counts as folded, so it offers to open them: that is the move a reader wants from a
     half-folded list, and the one that cannot lose anything from sight. The label is the whole state:
     aria-pressed would have read as a filter that is switched on. */
  $('fold-all').addEventListener('click', (e) => setAll(e.currentTarget.dataset.act === 'open'));

  /** The models of one group that the current filters leave on screen. */
  let SECTIONS = [];
  const view0 = (key) => SECTIONS.find((g) => g.key === key)?.models;

  function renderRows() {
    ensureBad();
    const f = view();
    const matching = L.models.filter((m) => passes(m, f));
    const total = L.models.length;
    const hidden = total - matching.length;
    const onScreen = Math.min(limit, matching.length);
    const glabel = (L.groups ?? []).find((g) => g.key === group)?.label ?? group;
    const why = [blk ? `“${BLK.get(blk)?.chip ?? chipLabel(blk)}”` : '', filter !== 'all' ? `status “${filter}”` : '', group !== 'all' ? `group “${glabel}”` : '', ...[...tags].map((t) => `#${t}`), query.trim() ? `search “${query.trim()}”` : ''].filter(Boolean).join(', ');
    /* The bracketed aside after the heading -- "135 match, 40 drawn, 95 more as you scroll" -- is
       gone. The filters above the table already say what is filtered, the chip says what is being
       shown, and the rest of it was the table describing its own scrolling. */

    // Sections per group, in the ledger's group order. A filter that leaves only a few models drops
    // them for a flat list with a group mark on each row. A folded group renders no rows, and the
    // lazy loading counts only rows that are drawn.
    const filtering = blk !== null || filter !== 'all' || group !== 'all' || tags.size > 0 || query.trim() !== '';
    const flat = filtering && matching.length <= FLAT_BELOW;
    const sections = flat ? [{ key: null, models: matching }] : groupSections(matching);
    SECTIONS = sections;
    // with a filter or a search, every group with matches opens (the viewer may still fold one, for this view only)
    const viewKey = JSON.stringify([blk, filter, group, [...tags], query.trim()]);
    if (viewKey !== foldView.key) foldView = { key: viewKey, fold: {} };
    const isOpen = (g) => !g.key ? true : filtering ? !foldView.fold[g.key] : groupOpen(g);
    let budget = limit, html = '', drawn = 0, cut = 0, folded = 0, foldedGroups = 0;
    for (const g of sections) {
      const opened = isOpen(g);
      if (!opened) { folded += g.models.length; foldedGroups++; }
      if (g.key && budget <= 0) { cut += g.models.length; continue; }
      if (g.key) html += groupRow(g, opened);
      if (!opened) continue;
      for (const m of g.models) {
        if (budget <= 0) { cut++; continue; }
        budget--; drawn++;
        /* A run over this one model is drawn where its detail would be. The detail is the model's
           history -- commits, past verdicts, reviews -- and none of it is true for another few
           minutes: what you want in that gap is how far the run has got. The row keeps whatever it
           was showing the moment the run ends. */
        const onRow = BARS.model.get(m.id) ?? [];
        html += modelRow(m, flat)
          + (onRow.length
            ? `<tr class="detail detail--run" style="--gc:${gcFor(m.group ?? '')}"><td colspan="${colCount()}">${onRow.map(([k, pr]) => runBar(k, pr, m.title)).join('')}</td></tr>`
            : open.has(m.id) ? `<tr class="detail" style="--gc:${gcFor(m.group ?? '')}"><td colspan="${colCount()}">${detail(m)}</td></tr>` : '');
      }
    }
    // A checkbox has three states and HTML can write two of them: "some of this group" has to be
    // set on the element itself, after it exists.
    const paintMixed = () => $('rows').querySelectorAll('[data-mixed]').forEach((x) => { x.indeterminate = true; });
    /* A run over every model belongs to no single row, so it gets a row of its own at the top of
       the table, across all of it. It used to be squeezed into the Model heading beside the Run
       button, where the track had 60 pixels to say how far through 135 models it was. */
    const wide = (BARS.suite ?? []).map(([k, pr]) => runBar(k, pr, 'every model')).join('');
    if (wide) html = `<tr class="suiterun"><td colspan="${colCount()}">${wide}</td></tr>` + html;
    $('rows').innerHTML = html || `<tr class="empty"><td colspan="${colCount()}" class="muted">No model matches.${hidden ? ' Every model is hidden by the filters above.' : ''}</td></tr>`;
    paintMixed();
    // say what the folding hides, with one click to see it
    // the hint is the first thing to go when the screen is narrow
    $('clear')?.addEventListener('click', () => { blk = null; filter = 'all'; group = 'all'; tags.clear(); query = ''; limit = PAGE; saveView(); render(); });
    $('grp-acts').hidden = flat;
    // folded, or a mix of the two, offers to open; only a list with every group open offers to close
    {
      const fb = $('fold-all'), opening = foldedGroups > 0 || sections.every((g) => !g.key);
      fb.dataset.act = opening ? 'open' : 'close';
      fb.textContent = opening ? 'Expand all' : 'Collapse all';
      fb.title = opening ? 'Open every group' : 'Fold every group';
    }
    const rest = cut;
    if (rest > 0) $('rows').insertAdjacentHTML('beforeend', `<tr class="more"><td colspan="${colCount()}"><button type="button" class="btn" id="more">Show ${Math.min(PAGE, rest)} more <small>${rest} not on screen yet</small></button></td></tr>`);
    $('rows').querySelectorAll('tr.row').forEach((tr) => {
      const toggle = () => { const id = tr.dataset.id; open.has(id) ? open.delete(id) : open.add(id); saveView(); renderRows(); document.querySelector(`tr.row[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }); };
      // A button inside the row acts on what it says, and nothing else. Without this, running one
      // check from a cell also opened that model's detail underneath it -- the click reached the
      // row after the button, and the row's only job is to open.
      tr.addEventListener('click', (e) => { if (e.target.closest('button, input, a, label')) return; toggle(); });
      tr.addEventListener('keydown', (e) => { if (e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
    });
    // more rows as the end of the list comes near; the button does the same for keyboards
    moreObserver?.disconnect();
    const more = $('more');
    if (more) {
      const grow = () => { limit += PAGE; saveView(); renderRows(); };
      more.addEventListener('click', grow);
      if ('IntersectionObserver' in window) {
        moreObserver = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { moreObserver.disconnect(); grow(); } }, { rootMargin: '600px 0px' });
        moreObserver.observe(more);
      }
    }
    flash = new Set(); // a row flashes once, on the refresh that changed it
    justApproved = new Set();
    // past a page of rows the resting sweeps go: a hundred and thirty gradients in motion is not craft
    $('rows').classList.toggle('many', drawn > 40);
    stickyOffsets(); // the group row only exists once there are rows, and its height is one of the offsets
  }

  /* Which of a model's checks are open. A check that is failing, flagged, crashed or stale opens itself,
     because that is the one a reader came for; everything else waits to be asked. The viewer's own
     choices win over both, and are kept for the session so a refresh does not close what they opened. */
  const ckOpen = new Map();
  const ckKey = (id, name) => `${id}\u0000${name}`;
  const ckDefault = (r) => ['fail', 'flag', 'broke'].includes(markKind(r)[0]) || Boolean(r?.stale);
  const ckIsOpen = (id, name, r) => ckOpen.get(ckKey(id, name)) ?? ckDefault(r);
  /** A hash short enough to read, with the whole thing one click away. Nothing is lost, only folded. */
  const hashBit = (label, full, note) => full
    ? `<span class="hsh">${esc(label)} <code>${esc(String(full).slice(0, 7))}</code><button type="button" class="copyb" data-copy="${esc(full)}" aria-label="${esc(`Copy the full ${label} ${full}`)}" data-tip data-tiptext="${esc(`${full}${note ? `. ${note}` : ''}`)}">${COPYICON}</button></span>`
    : `<span class="hsh">${esc(label)} <b class="muted">none found</b></span>`;
  /** What a run was told to do, in one line: the check, its flags, and how many models it covered.
      The ids themselves are the long part, so they fold away behind a disclosure rather than going. */
  function howItRan(name, r, id) {
    const args = r.args ?? [];
    if (!args.length) return '<p class="check__how muted">How it ran: not recorded.</p>';
    const flags = args.filter((a) => String(a).startsWith('-'));
    const rest = args.filter((a) => !String(a).startsWith('-') && !String(a).startsWith('.') && !String(a).includes('/'));
    const paths = args.filter((a) => !String(a).startsWith('-') && (String(a).startsWith('.') || String(a).includes('/')));
    const over = rest.length ? `over ${rest.length} model${rest.length === 1 ? '' : 's'}` : '';
    return `<p class="check__how muted">How it ran: <code>${esc(GATE_NAME[name] ?? name)}</code>`
      + (flags.length ? ` <code>${esc(flags.join(' '))}</code>` : '')
      + (over ? ` · ${esc(over)}` : '') + '</p>'
      + (rest.length || paths.length
        ? `<details class="argfold"><summary>the full argument list (${args.length})</summary><div class="qids">${
            args.map((a) => `<code class="mid${String(a).startsWith('-') || String(a).includes('/') ? ' not-id' : ''}">${esc(a)}</code>`).join('')}</div></details>`
        : '');
  }
  function detail(m) {
    const parts = [];
    /* No title here. The row above is the panel's header -- it carries the name, the id, the group and
       the verdict already, and it sticks, so it stays over the panel while the panel scrolls. This
       starts with what the row cannot say: the two hashes, cut to seven with the whole one a click
       away, and where the snippet was found. */
    parts.push(`<div class="mdet">
      <div class="mdet__ids">${hashBit('fingerprint', m.fingerprint, 'the source this model’s results are judged against')}${
        hashBit('converting commit', m.convertingCommit, 'the commit that first set --u in vmin')}<span class="hsh">snippet ${
        m.snippet ? `<code>${esc(m.snippet.file)}:${esc(m.snippet.line)}</code>${m.snippet.foundBy !== 'grep' ? ` <span class="muted">(${esc(m.snippet.foundBy)})</span>` : ''}` : '<b class="muted">not found</b>'}</span></div>
      ${m.approved ? '' : `<p class="mdet__miss"><b>Missing:</b> ${m.missing.map((x) => esc(x)).join(' · ')}</p>`}
    </div>`);
    for (const n of m.notes) parts.push(`<div class="notice">${esc(n)}</div>`);

    /* One line per check, and the detail under the one you ask for. A grid of cards gave every check the
       same large box whatever it had to say, cut sentences at a fixed height and put a scrollbar inside
       a page that already scrolls. A list gives each check exactly the room it needs. */
    parts.push('<h3>Checks: last known result</h3><ul class="cks">' + Object.entries(m.checks).map(([name, r]) => {
      const [kind, word] = markKind(r);
      const id = `ck-${m.id}-${name}`;
      const op = ckIsOpen(m.id, name, r);
      const never = r.status === 'never';
      const body = never
        ? '<p class="muted">No captured run has reported this model.</p>'
        : `${r.stale ? `<p class="ck__stale"><b>Stale.</b> ${esc(r.staleWhy.join('; '))}.</p>` : ''}
          ${r.flags?.length ? `<ul class="ck__list">${r.flags.map((f) => `<li>${esc(f.flag)} ${f.resolved ? `<span class="chip s-chk">false alarm</span> <span class="muted">${esc(f.by)}: ${esc(f.reason)}</span>` : '<span class="chip s-warn">open</span>'}</li>`).join('')}</ul>` : ''}
          ${r.detail?.length ? `<ul class="ck__list">${r.detail.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
          ${name === 'exports' ? '<p class="muted ck__note">This verdict is for the default settings only. Other settings, if this run made any, are in the export matrix under Docs and release readiness.</p>' : ''}
          <p class="ck__when">Ran ${agoSpan(r.ranAt)}${r.ranAt ? ` <span data-tip data-tiptext="${esc(new Date(r.ranAt).toLocaleString())}">(${esc(String(r.ranAt).slice(0, 16).replace('T', ' '))})</span>` : ''} at ${r.commit ? `<code>${esc(r.commit)}</code>` : 'a HEAD it did not record'}</p>
          ${howItRan(name, r)}`;
      return `<li class="ck${op ? ' is-open' : ''}${['fail', 'flag', 'broke'].includes(kind) ? ' is-bad' : ''}">
        <button type="button" class="ck__row" data-ck="${esc(name)}" data-ck-model="${esc(m.id)}" aria-expanded="${op}" aria-controls="${esc(id)}">
          <span class="mk mk--${kind}" aria-hidden="true">${MARKS[kind][0]}</span>
          <b class="ck__name">${esc(CHECK_NAMES[name] ?? name)}</b>
          <span class="ck__verdict">${esc(word)}</span>
          <span class="ck__sum">${esc(never ? 'never reported' : r.summary)}</span>
          <span class="ck__chev" aria-hidden="true">${ssChevron}</span>
        </button>
        <div class="ck__body" id="${esc(id)}"${op ? '' : ' hidden'}>${body}</div></li>`;
    }).join('') + '</ul>');

    const byDiff = m.commits.filter((c) => c.matchedBy.includes('diff')).length;
    parts.push(`<h3>Commits (${m.commits.length}: ${byDiff} by diff, ${m.commits.length - byDiff} by subject only)</h3>
      <p class="muted" style="font-size:13px">“diff” means the commit changed this model's own entries. A subject-only match names the id or title and may be about another model with a similar name.</p>`);
    parts.push(m.commits.length ? `<ul class="commits">${m.commits.map((c) => `<li><code>${esc(c.hash)}</code> <span class="muted num">${esc(c.date.slice(0, 16).replace('T', ' '))}</span> ${esc(c.subject)}
      ${c.matchedBy.map((x) => `<span class="tag ${x === 'diff' ? 'strong' : ''}">${esc(x)}</span>`).join('')}
      ${c.hash === m.convertingCommit ? '<span class="tag strong">converting</span>' : ''}
      ${c.review ? '<span class="tag strong">review</span>' : ''}${c.textReview ? '<span class="tag strong">text review</span>' : ''}
      ${c.modelsTouched > 5 ? `<span class="tag">broad: touches ${c.modelsTouched} models</span>` : ''}</li>`).join('')}</ul>` : '<p class="muted">No commit found.</p>');
    return parts.join('');
  }

  /* ---------- the release checklist dialog ---------- */
  const CL_STATE = {
    'true': ['holds now', 's-chk', '✓'],
    'true-ticked': ['holds now · ticked', 's-chk', '✓'],
    'false': ['fails now', 's-bad', '✗'],
    conflict: ['ticked, but its proof fails now', 's-bad', '!'],
    'ticked-unproven': ['done · not re-proved here', 's-chk', '✓'],
    stale: ['needs running again on this commit', 's-warn', '↻'],
    'not-evaluated': ['not evaluated here', 's-none', ''],
  };
  /**
   * DONE MEANS DONE. One predicate, used by the phase strip, the group headings, the summary and
   * the filters, so they cannot disagree with each other — which they did, three separate times,
   * each time by counting something slightly different.
   *
   * A tick in the file is not enough: an item whose proof fails, or whose proof was run on a
   * commit where the code it tests has changed since, is not done. That is the same rule the model
   * checks have always had, and the reason `approved` fell from 135 to 0 when preview.ts changed.
   */
  const clDone = (x) => x.done && x.state !== 'conflict' && x.state !== 'stale' && x.result !== 'false';
  /**
   * THE THREE PHASES, which is the only question a person releasing actually has.
   *
   * The labels above answer the LEDGER's question -- did I re-prove this just now. That is the
   * right question for the ledger and the wrong one for whoever is about to push: they read
   * "not evaluated here" on an item that was run last night and think it is waiting for them.
   * So each item is also placed in one of three phases, and the dialog leads with those.
   *
   * A phase comes from the item's own `## ` section, so the markdown stays the source of truth.
   */
  const CL_PHASE = (item) => (item.group === 'Yours' ? 'yours' : item.group === 'After the push' ? 'after' : 'before');
  const CL_PHASES = [
    ['before', 'Before the push', 'Run by a script, or by an agent running one. Each carries what it printed, in its own line. None of it waits for you.'],
    ['yours', 'Yours', 'The two a machine has no business answering: is the writing good, and do we publish.'],
    ['after', 'After the push', 'Cannot be true until the site is live. Nothing here blocks the push — they are what is checked once it has happened.'],
  ];
  /** What an item is waiting for, in the words of someone about to release. */
  function clWaitingOn(item) {
    const phase = CL_PHASE(item);
    if (item.state === 'conflict' || item.result === 'false') return ['needs a look', 's-bad'];
    if (item.state === 'stale') return ['run it again', 's-warn'];
    if (clDone(item)) return ['done', 's-chk'];
    if (phase === 'yours') return ['waiting for you', 's-warn'];
    if (phase === 'after') return ['waits for the push', 's-none'];
    return ['still to do', 's-warn'];
  }
  // Which slice of the checklist the dialog is showing. 'all' unless something asked for a slice --
  // the conflict count on the button opens straight to 'attention'.
  let clFilter = 'all';
  function renderChecklist() {
    const cl = L.readiness?.checklist;
    const btn = $('cl-btn');
    btn.hidden = false;
    if (!cl || !cl.exists) {
      btn.innerHTML = 'Release checklist <small>· not written yet</small>';
      $('cl-sum').textContent = '';
      $('cl-body').innerHTML = `<div class="notice"><b class="big">No checklist yet.</b> <code>${esc(cl?.file ?? 'docs/RELEASE-CHECKLIST.md')}</code> does not exist, so there is nothing to show. Lines in it look like <code>- [ ] item — how to prove it</code>.</div>`;
      return;
    }
    const evald = cl.proven != null;
    btn.classList.toggle('has-false', Boolean(cl.provenFalse || cl.conflicts));
    /* the battery: proven here, then ticked on top of it, then what its proof contradicts. Shares of
       the whole list, so the bar and the counts can never say different things. */
    const pc = (x) => `${((x / (cl.total || 1)) * 100).toFixed(1)}%`;
    const provenPart = cl.proven ?? 0;
    const tickedPart = Math.max(provenPart, Math.min(cl.total ?? 0, (cl.done ?? 0)));
    for (const el of [btn, $('cl-bar')]) {
      if (!el) continue;
      el.classList.add('clfill');
      el.style.setProperty('--cl-proven', pc(provenPart));
      el.style.setProperty('--cl-ticked', pc(tickedPart));
      el.style.setProperty('--cl-false', pc(cl.provenFalse ?? 0));
    }
    const key = $('cl-key');
    if (key) {
      key.innerHTML = `<span><i class="k-proven"></i><b>${provenPart}</b> proven here</span>`
        + `<span><i class="k-ticked"></i><b>${Math.max(0, tickedPart - provenPart)}</b> ticked, not proven here</span>`
        + (cl.provenFalse ? `<span><i class="k-false"></i><b>${cl.provenFalse}</b> contradicted by its proof</span>` : '')
        + `<span><i class="k-open"></i><b>${Math.max(0, (cl.total ?? 0) - tickedPart - (cl.provenFalse ?? 0))}</b> still open</span>`;
    }
    btn.innerHTML = evald
      // The same words as the dialog, because two numbers for one list is worse than either. This
      // said "proven 31 of 59, 26 not evaluated" while the dialog said 43 done — and "not
      // evaluated" is nonsense about an item that is ticked with its output written beside it.
      ? (() => {
          const stuck = cl.items.filter((x) => !clDone(x));
          const staleN = stuck.filter((x) => x.state === 'stale').length;
          const badN = stuck.filter((x) => x.state === 'conflict' || x.result === 'false').length;
          const bits = [staleN ? `${staleN} to run again` : '', badN ? `<b data-cl-jump="attention" title="Show just these">${badN} need${badN === 1 ? 's' : ''} a look</b>` : ''].filter(Boolean);
          /* SHORT ENOUGH TO SIT IN A ROW WITH FOUR OTHER BUTTONS.
       * This read "Release checklist - 45 of 56 done, 10 need a look": a sentence, in a row of
       * buttons, which is why the header wrapped. The word Release adds nothing on a page whose
       * only subject is this release, "of" and "done" are what a slash means, and the dialog this
       * opens says all of it in full. The two numbers are the message; both survive. */
      return `Checklist <small>${cl.total - stuck.length}/${cl.total}${bits.length ? `<span class="sep">·</span>` + bits.join(', ') : ''}</small>`;
        })()
      : `Release checklist <small>· ${cl.done} of ${cl.total} ticked (not evaluated: this ledger predates it)</small>`;
    $('cl-sum').innerHTML = evald
      // What is LEFT first, because that is the question. The ledger's own accounting follows it,
      // smaller: leading with "31 proven" over a list where 55 items are finished told a person
      // about to release that most of their list was outstanding when almost none of it was.
      ? (() => {
          const stuck = cl.items.filter((x) => !clDone(x));
          // Stale and contradicted are both "not done" and are not the same thing to a reader:
          // one needs running again on this commit, the other says the tick is wrong.
          const staleN = stuck.filter((x) => x.state === 'stale').length;
          const badN = stuck.filter((x) => x.state === 'conflict' || x.result === 'false').length;
          const why = [staleN ? `${staleN} to run again since the code they test changed` : '', badN ? `${badN} ticked but contradicted by their own proof` : ''].filter(Boolean).join(', ');
          const lead = stuck.length
            ? `<b>${cl.total - stuck.length} of ${cl.total} done.</b> ${stuck.length} to go${why ? ` — ${why}` : ''}.`
            : `<b>All ${cl.total} done.</b>`;
          return `${lead} <span class="muted">Of those done, ${cl.proven} were re-proved by this ledger just now; the rest are slow, networked or need a person, and carry what they printed in their own line. A tick is a claim; only a proof run here counts as proven. From <code>${esc(cl.file)}</code>, as of the ledger built ${agoSpan(L.generatedAt)}.</span>`;
        })()
      : `${cl.done} of ${cl.total} ticked in the file. This ledger was built before items were evaluated.`;
    // Which items to show. "Needs a look" is the one worth opening straight to: an item ticked in
    // the file whose proof disagrees, or one the proof says outright is false. On 2026-09-25 the
    // button read "2 conflicts" and the only way to find out WHICH two was to read all 55 items --
    // one of them was a release snapshot describing code that no longer existed.
    const CL_FILTERS = [
      ['attention', 'needs a look', (x) => x.state === 'conflict' || x.state === 'stale' || x.result === 'false'],
      ['open', 'still to do', (x) => !clDone(x)],
      ['all', 'everything', () => true],
    ];
    // a phase filter is "phase:<key>", set by the stepper above rather than by this row
    const pick = clFilter.startsWith('phase:')
      ? [clFilter, CL_PHASES.find((p) => p[0] === clFilter.slice(6))?.[1] ?? clFilter, (x) => CL_PHASE(x) === clFilter.slice(6)]
      : CL_FILTERS.find((f) => f[0] === clFilter) ?? CL_FILTERS[CL_FILTERS.length - 1];
    // The three phases as a stepper: where the release has got to, and which step is waiting.
    // "You are here" is the first phase that is not finished, so the eye lands on the next thing
    // to do rather than on a wall of ticks.
    const phaseOf = CL_PHASES.map(([key, name, why]) => {
      const items = cl.items.filter((x) => CL_PHASE(x) === key);
      const done = items.filter(clDone).length;
      return { key, name, why, items, done, left: items.length - done };
    });
    const here = phaseOf.find((p) => p.left > 0)?.key ?? null;
    // A PHASE IS SHUT UNTIL EVERY PHASE BEFORE IT IS GREEN. Not "mostly green", not "green except
    // the slow ones": every item done, with no proof contradicting its tick. The whole point of
    // the order is that the push is the claim everything before it checked out, so a stage you can
    // enter while the one before it still has something amber in it is a stage that means nothing.
    const firstOpen = phaseOf.findIndex((p) => p.left > 0);
    const shutFrom = firstOpen === -1 ? phaseOf.length : firstOpen + 1;
    $('cl-steps').innerHTML = phaseOf.map((p, i) => {
      const shut = i >= shutFrom;
      const state = p.left === 0 ? 'is-done' : p.key === here ? 'is-here' : shut ? 'is-shut' : 'is-later';
      const mark = p.left === 0 ? '✓' : shut ? '🔒' : String(i + 1);
      // why the phase exists goes in the tooltip: on the strip it was three paragraphs of wall
      const blockers = firstOpen === -1 ? [] : phaseOf[firstOpen].items.filter((x) => !clDone(x));
      const tip = shut
        ? `${p.name} — shut until "${phaseOf[firstOpen].name}" is green. ${blockers.length} left there: ${blockers.map((b) => b.item.split(' — ')[0]).slice(0, 4).join('; ')}`
        : `${p.name} — ${p.why}${p.key === here ? ' This is where the release has got to.' : ''}`;
      return `<li class="clstep__i ${state}"><button type="button" data-cl-phase="${p.key}" aria-pressed="${clFilter === 'phase:' + p.key}" title="${esc(tip)}">
        <span class="clstep__n" aria-hidden="true">${mark}</span>
        <span class="clstep__t">${esc(p.name)}${p.key === here ? ' ·' : ''}</span>
        <span class="clstep__c">${p.done}/${p.items.length}</span></button></li>`;
    }).join('');

    $('cl-filter').innerHTML = CL_FILTERS.map(([key, words, test]) => {
      const n = cl.items.filter(test).length;
      if (!n && key !== 'all') return '';
      return `<button type="button" class="clfilter__b${clFilter === key ? ' is-on' : ''}${key === 'attention' && n ? ' is-bad' : ''}" data-cl-filter="${key}" aria-pressed="${clFilter === key}">${words} <b>${n}</b></button>`;
    }).join('');
    const shown = cl.items.filter(pick[2]);
    const groups = [];
    for (const x of shown) { let g = groups.find((y) => y.name === x.group); if (!g) groups.push((g = { name: x.group, items: [] })); g.items.push(x); }
    if (!shown.length) $('cl-body').innerHTML = `<p class="muted">Nothing under “${esc(pick[1])}”.</p>`;
    else $('cl-body').innerHTML = groups.map((g) => {
      // COUNT DONE, NOT PROVEN. "The build · 4 of 10 proven" made ten finished items read as four
      // finished and six outstanding: "proven" is the ledger's word for "I re-ran this myself just
      // now", and it does not re-run a twenty-second build or a ninety-minute gate on every
      // rebuild. A group is finished when every item is done and no proof contradicts one, so that
      // is what the heading says, and anything not finished is named beside it instead of implied.
      const stuck = g.items.filter((x) => !clDone(x));
      const head = clFilter === 'all'
        ? (stuck.length ? `· ${g.items.length - stuck.length} of ${g.items.length} done · ${stuck.length} to go` : `· all ${g.items.length} done`)
        : `· ${g.items.length} shown of ${cl.items.filter((x) => x.group === g.name).length}`;
      return `<h3>${esc(g.name ?? 'Items')} <span class="muted" style="text-transform:none;letter-spacing:0">${head}</span></h3>
      <ul class="cl">${g.items.map((x) => {
        // Only the box's glyph comes from the state now. There used to be a second chip carrying
        // the ledger's own wording beside the first -- "DONE" next to "HOLDS NOW · TICKED" -- which
        // is two chips saying one thing. How the ledger knows is in the "Found:" line right below,
        // where it belongs and where it has room to say it properly.
        const [, , mark] = CL_STATE[x.state] ?? CL_STATE['not-evaluated'];
        // The RELEASE's answer first -- done, waiting for you, waits for the push, needs a look --
        // and the LEDGER's answer second, smaller. Both are true; they answer different questions,
        // and leading with the ledger's made a person think an item run last night was theirs to do.
        const [waits, waitsCls] = clWaitingOn(x);
        // The date the item was RUN, which is not simply the first date in its text: several
        // proofs name an older run in passing ("or the headless one of 2026-09-23") before giving
        // the real one, and taking the first match showed work from this morning as two days old.
        // So: prefer a date introduced by run/re-run/re-checked/redeployed, and fall back to the
        // LAST date in the line, which is the one most recently written there.
        const proof = x.proof ?? '';
        const named = [...proof.matchAll(/(?:re-?run|re-?checked|redeployed|drafted|taken)\b[^.]{0,40}?(20\d\d-\d\d-\d\d)/gi)].pop();
        const all = [...proof.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)].pop();
        const ran = named ?? all;
        /*
         * A COMPUTED PROOF WEARS THE TIME IT WAS COMPUTED, NOT A DATE OUT OF THE PROSE.
         *
         * This date is scraped from the item's own note in the markdown -- "re-run 2026-09-25", a
         * sentence somebody typed. For an item whose proof actually RAN, that is the wrong date by
         * weeks: the answer on screen was worked out when the ledger was built, seconds ago, and
         * it was being labelled with the oldest date in the line. The freshest thing on the page
         * looked like the stalest, and the panel read as dead while the table beside it moved.
         *
         * Proven or disproven: say when it was checked, and let it tick (data-ago).
         * Not evaluated: the note's date is the only evidence there is, so it stays -- and says
         * "noted" rather than "run", because nothing ran.
         */
        const live = x.result === 'true' || x.result === 'false';
        const when = live
          ? ` <span class="clwhen">checked ${agoSpan(L.generatedAt)}</span>`
          : ran ? ` <span class="clwhen">noted ${ran[1]}</span>` : '';
        const said = x.result === 'not-evaluated' ? `<span class="muted found">Not evaluated here: ${esc(x.why)}.</span>` : `<span class="found${x.result === 'false' ? ' bad' : ''}">Found: ${esc(x.found)}</span>`;
        return `<li class="st-${esc(x.state ?? 'not-evaluated')}"><span class="box" aria-hidden="true">${mark}</span>
          <div><b>${esc(x.item)}</b> <span class="chip ${waitsCls}">${esc(waits)}</span>${when}<br>${said}
            ${x.proof
              ? `<details class="proofbox"><summary>Proof (${Math.round(x.proof.length / 5)} words)</summary><span class="proofline">${esc(x.proof)}</span></details>`
              : '<span class="proofline proofline--none">No way to prove it is written down.</span>'}</div>
          <code class="muted">:${x.line}</code></li>`;
      }).join('')}</ul>`;
    }).join('');
  }
  /* ---------- a bar per check, from the registry: every model (or page), none left out ---------- */
  // [tally key, words, swatch, the blocker kind a click filters the table to]. "Didn't run" is the
  // test crashing before it judged the model; "not run yet" is no run having reached it
  /**
   * The two checks that judge the site rather than a model.
   *
   * They have no row in a table of models, so they keep one line of their own: what each found, and
   * a button to run it. Everything else runs from the table.
   */
  function renderSiteChecks() {
    const el = $('sitechecks'); if (!el) return;
    const site = CHECK_LIST.filter((c) => c.scope === 'site');
    if (!site.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const bars = Object.fromEntries(BARS.site ?? []);
    /* These two judge the site, not any model, and they gate nothing. So they say the least they
       can: a name, the count, and the button. Everything else about them -- what the check is,
       when it last ran, at which commit -- is in the tooltip and in its definition. */
    el.innerHTML = site.map((c) => {
      const t = c.tally ?? {};
      const total = c.total ?? 0;
      const bad = (t.fail ?? 0) + (t.broke ?? 0);
      const p = bars[c.key];
      // Running: the chip says so and keeps its size. The bar itself is full width under the
      // header (#siteruns), because a bar, a label, a count and two buttons do not fit in a line
      // of small things beside the counts -- putting them there pushed the header apart.
      if (p) return `<span class="sitechk__one is-running"><b>${esc(c.short)}</b><span class="sitechk__said">running</span></span>`;
      const said = !c.captured ? 'not run here' : total ? `${t.pass ?? 0}/${total}` : '—';
      const when = c.lastRun?.finishedAt ? ` Last run ${ago(c.lastRun.finishedAt)}${c.lastRun.commit ? ` at ${c.lastRun.commit}` : ''}.` : '';
      const tip = `${c.title}: ${said} ${c.unit ?? 'pages'} clear.${when} It judges the site, not any model, and gates nothing.`;
      return `<span class="sitechk__one${bad ? ' is-bad' : ''}" data-tip data-tiptext="${esc(tip)}">
        <b>${esc(c.short)}</b><span class="sitechk__said">${esc(said)}</span>
        ${runBtn(c.key, [], `Run ${c.title}`, 'cellrun')}</span>`;
    }).join('');
    renderSiteRuns(site, bars);
  }

  /** The full-width bar under the header for whichever site check is running, or nothing. */
  function renderSiteRuns(site, bars) {
    const el = $('siteruns'); if (!el) return;
    const live = site.filter((c) => bars[c.key]);
    // whatever is running that is not a check at all: a job (the gate, the matrix, the live
    // check) is about the project rather than any model, so it shows where APP and SEO do and
    // not inside a table of models.
    const jobs = Object.keys(bars).filter((k) => String(k).startsWith('job:'));
    /*
     * A job has no per-model progress, because it is not a check: nothing writes L.running['job:…'].
     * So its bar said "starting…" while the header chip, reading the gate's own record, said
     * 4 of 5 -- two places on one screen disagreeing about the same run, which is the fault this
     * board keeps finding in itself.
     */
    const g = (L as any)?.gate;
    const jobProgress = (k: string) => (g?.running && g.total)
      ? { done: g.done?.length ?? 0, total: g.total, started: g.startedAt, step: g.step?.short ?? g.step?.key ?? null }
      : bars[k];
    if (!live.length && !jobs.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = jobs.map((k) => runBar(k, jobProgress(k), 'steps')).join('')
      + live.map((c) => runBar(c.key, bars[c.key], c.unit ?? 'pages')).join('');
  }
  /**
   * The per-check run buttons, for the width where there are no column headings to hold them.
   *
   * A heading carries the button that runs its check over every model. Below 760px the table is
   * a list of cards, the headings are not drawn, and those nine controls went with them -- so on
   * a phone you could run one check on one model, or everything on everything, and nothing in
   * between. This is the same nine buttons and the same runBtn, in a row of their own, with each
   * check named because there is no column above to say which is which.
   */
  function renderColRuns() {
    const el = $('colruns'); if (!el) return;
    if (!RUN_OK || !COLS.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    // Every check over every model, and the whole lot: one box, because they are one question --
    // what do I want to run -- and splitting the answer across a toolbar and a panel meant the
    // biggest of them sat on its own somewhere else.
    el.innerHTML = '<span class="colruns__h">Run over every model</span>'
      + runBtn('all', [], 'Run every check over every model', 'colrun colrun--all', 'Every check')
      + COLS.map(([k, label]) => runBtn(k, [], `Run ${label} on every model`, 'colrun', label)).join('');
  }

  /*
   * EVERY PROCESS THIS PROJECT HAS, PRESSABLE.
   *
   * The board could run a check and nothing else, so the gate, the live-site check, the renderer
   * comparison and the export matrix existed only as something to type -- which means they needed
   * somebody who already knew the command. The list comes from scripts/jobs.mjs through /api/jobs,
   * so this holds no second copy of what can be run or what it costs.
   */
  let JOBS: any[] | null = null;
  let JOBS_STEPS: any[] | null = null;
  /* Which steps the board already knows are stale, so "only what is stale" is the one press that
     answers the usual question: something changed, what has to run again? */
  /* One word each, in the reader's terms rather than the record's. "current" is the only one that
     means nothing has to be done, so it is the only quiet one. */
  const STATE_WORD: Record<string, string> = {
    current: 'current', stale: 'stale', failed: 'failed', unknown: 'not known',
  };
  const STALE_STEPS = new Set<string>();
  /*
   * TWO SETS, BECAUSE THEY ARE TWO QUESTIONS AND TWO VERY DIFFERENT BILLS.
   *
   * "Stale" means the board can show the step needs running: its files moved, or it failed. That
   * is usually a handful of steps and a few minutes. "Not proved current" also takes in every step
   * whose result predates fingerprints -- thirteen of the eighteen today -- which cannot be shown
   * to be about this code and cannot be shown to be out of date either. That is about four hours.
   *
   * Folding the second into the first would have let one button labelled "only what is stale"
   * quietly start a four-hour run. They are separate presses, each with its own cost printed.
   */
  const UNPROVED_STEPS = new Set<string>();
  async function openRuns() {
    const d = $('run-dialog'); if (!d) return;
    $('run-body').innerHTML = `<p class="muted">Reading what this machine can run…</p>`;
    if (!d.open) { if (typeof (d as any).showModal === 'function') (d as any).showModal(); else d.setAttribute('open', ''); }
    $('run-close')?.focus();
    try {
      const { body } = await api('/api/jobs');
      JOBS = body.jobs;
      JOBS_STEPS = body.steps ?? [];
      /* The server works this out from the recorded fingerprints; see stepState() there for why
         "failed" and "stale" are different questions and why "unknown" is a third answer. */
      STALE_STEPS.clear();
      UNPROVED_STEPS.clear();
      for (const st of JOBS_STEPS ?? []) {
        /* Known to need running: its files moved, or it failed. */
        if (st.state === 'stale' || st.state === 'failed') STALE_STEPS.add(st.key);
        /* Everything that is not demonstrably about today's code, which includes the above. */
        if (st.state !== 'current') UNPROVED_STEPS.add(st.key);
      }
      $('run-body').innerHTML = runsList(body);
      gateCost();
    } catch (e) {
      $('run-body').innerHTML = `<p class="notice bad">The board could not say what it can run: ${esc(String((e as any)?.message ?? e))}. It answers /api/jobs only when started with <code>npm run board</code>.</p>`;
    }
  }

  /** A time a person can plan around, rather than a number of minutes to convert. */
  const howLong = (m: number) => (m < 2 ? 'under a minute' : m < 60 ? `about ${m} min` : m < 90 ? 'about an hour' : `about ${Math.round(m / 60)} hours`);

  /* The gate is not one job with three shapes: it is eighteen steps, and the question is usually
     narrower than any preset. So the presets go and a picker takes their place, which adds up what
     the choice costs -- because "about 5 hours" is the single most useful thing to know before
     pressing it. */
  function gatePicker(steps: any[]): string {
    const boxes = steps.map((x: any) => `<label class="gstep gstep--${esc(x.state ?? 'unknown')}"><input type="checkbox" data-step="${esc(x.key)}" checked> <b>${esc(x.short ?? x.key)}</b><span class="gstep__n">${esc(x.name)}</span><span class="gstep__s" data-tip data-tiptext="${esc(x.why ?? '')}">${esc(STATE_WORD[x.state] ?? 'not known')}</span><span class="gstep__m">${esc(x.minutes)}m</span></label>`).join('');
    return `<div class="gpick"><div class="gpick__head"><b>The gate, step by step</b>
      <span class="gpick__acts"><button type="button" class="btn" data-pick="all">All</button><button type="button" class="btn" data-pick="none">None</button><button type="button" class="btn" data-pick="stale" data-tip data-tiptext="The steps the board can show need running: their files changed since they ran, or they failed.">Only what is stale</button><button type="button" class="btn" data-pick="unproved" data-tip data-tiptext="Those, plus every step whose result predates fingerprints -- it cannot be shown to be about the code as it is now, which is not the same as being fine.">Anything not proved current</button></span></div>
      <div class="gpick__list">` + boxes + `</div>
      <div class="gpick__foot"><span id="gpick-cost" class="muted"></span><button type="button" class="btn runjob__go" id="gpick-go">Run the chosen steps</button></div></div>`;
  }

  function runsList(body: any): string {
    const gate = body.steps?.length ? gatePicker(body.steps) : ``;
    const rows = (body.jobs ?? []).filter((j: any) => !String(j.key).startsWith('gate')).map((j: any) => {
      const off = Boolean(j.blockedWhy);
      const why = off ? j.blockedWhy : j.answers?.length ? `Closes: ${j.answers.slice(0, 3).join(`; `)}${j.answers.length > 3 ? `, and ${j.answers.length - 3} more` : ``}` : ``;
      return `<li class="runjob${off ? ` runjob--off` : ``}">`
        + `<div class="runjob__t"><b>${esc(j.name)}</b><span class="runjob__cost">${esc(howLong(j.minutes))}</span></div>`
        + `<p class="runjob__b">${esc(j.blurb)}</p>`
        + (why ? `<p class="runjob__w">${esc(why)}</p>` : ``)
        + `<button type="button" class="btn runjob__go" data-job="${esc(j.key)}"${off ? ` disabled data-tip data-tiptext="${esc(j.blockedWhy)}"` : ``}>${off ? `Cannot run here` : `Run`}</button>`
        + `</li>`;
    }).join('');
    const head = body.machineKnown ? `` : `<p class="notice">Nobody has asked whether this machine can run these. <code>npm run doctor</code> answers that, and this panel will then grey out what it cannot do.</p>`;
    return head + gate + `<ul class="runjobs">` + rows + `</ul>`;
  }

  /** Opens the machine panel, filled from the last poll so the numbers are the ones on the chip. */
  function openMachine() {
    const d = $('mach-dialog'); if (!d) return;
    $('mach-body').innerHTML = machineModal();
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    $('mach-close')?.focus();
  }

  /** Opens the definitions at one check's entry. */
  function openDef(key) {
    const d = $('rules-dialog');
    if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
    const dt = document.getElementById(`def-${key}`);
    document.querySelectorAll('.defs dt.is-lit').forEach((x) => x.classList.remove('is-lit'));
    if (dt) { dt.classList.add('is-lit'); dt.scrollIntoView({ block: 'start' }); dt.setAttribute('tabindex', '-1'); dt.focus({ preventScroll: true }); }
    defFrom = document.querySelector(`[data-def="${CSS.escape(key)}"]`);
  }
  let defFrom = null;
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-def]'); if (b && L) { e.stopPropagation(); defFrom = b; openDef(b.dataset.def); defFrom = b; } });

  /* ---------- "How these are counted": every fact the summary's numbers are defined by ---------- */
  function renderRules() {
    const c = L.counts, s = L.sources;
    const buckets = c.buckets ?? [];
    const B = (key) => buckets.find((b) => b.key === key);
    const sum = buckets.reduce((a, b) => a + b.count, 0);
    const gates = s.gateRules ?? [];
    const dd = (html) => `<dd>${html}</dd>`;
    const n = (x) => `<span class="n">${esc(x)}</span>`;
    // the first-reason split the build balances: each held model under the first thing that holds it
    const firsts = (b) => !b?.parts ? '' : `${b.parts.filter((p) => p.count).map((p) => `${esc(p.label)} ${n(p.count)}`).join(', ') || 'none'}; these sum to ${n(b.partsSum)}${b.partsBalance ? ' ✓' : `, not ${n(b.count)} ✗`}`;
    $('rules-body').innerHTML = `
      <h3>The two states</h3>
      <p class="muted" style="font-size:14px">Every model is in exactly one of these. The strip at the top is not these two: it is one step per check, ending here — it shows how many models each check has cleared on the code as it is now, and how many have cleared all of them. Nothing in the strip is a control; picking a model is what the table below is for.</p>
      <dl class="defs">
        ${['approved', 'to check'].map((k) => B(k)).filter(Boolean).map((b) => `<dt>${esc(b.label)} ${n(b.count)}</dt>${dd(`${esc(b.means ?? '')}.`)}`).join('')}
        <dt id="def-sum">The numbers add up ${n(c.balance?.ok ? '✓' : '✗')}</dt>
        ${dd(`${buckets.map((b) => `${n(b.count)} ${esc(b.label.toLowerCase())}`).join(' + ')} = ${n(sum)}, and there are ${n(c.models)} models. <code>scripts/ledger.mjs</code> fails the build if these differ, if a first-reason split below does not add up, or if what holds a model back does not match its state.${c.balance?.problems?.length ? ` Now: <b>${c.balance.problems.map(esc).join('; ')}</b>.` : ''}`)}
      </dl>
      <h3>What’s holding models back</h3>
      <p class="muted" style="font-size:14px">The list behind the <b>What’s holding models back</b> button at the top. Each row counts the models one reason holds back, and clicking it shows exactly those models in the table. The rows <b>overlap</b>: a model held by two checks is counted under both, so they do not add up to the model count. “Held by this alone” counts the models with no other reason, the ones that move on once it is fixed. “Passed on older code” is one row for all checks, with the count per check in it; the check bars below split it per check. Rows are largest first.</p>
      <dl class="defs">
        ${(s.holdKinds ?? []).map((k) => `<dt>${esc(cap(k.label))}</dt>${dd(`${esc(k.means)}.${k.key === 'broke' ? ' A crash says nothing about the model, so it is never counted as failed: not in the bars, not in the marks, not in the counts.' : ''}`)}`).join('')}
        ${B('to check')?.parts ? `<dt>First reason, in gate order</dt>${dd(`The ledger also files each model under the first thing that holds it, in the gate order below. Unlike the rows above, these do add up. ${esc(B('to check').label)}: ${firsts(B('to check'))}.`)}` : ''}
      </dl>
      <h3>The checks, in gate order</h3>
      <p class="muted" style="font-size:14px">${esc(s.gates ?? '')}.</p>
      <dl class="defs">${gates.map((g, i) => `<dt id="def-${esc(g.key)}">${i + 1}. ${esc(g.label)} <span class="muted" style="font-weight:500">(column “${esc(CHECK_LIST.find((c) => c.key === g.key)?.short ?? g.key)}”)</span></dt>${dd(`${esc(g.rule)}. From ${esc(g.source)}.`)}`).join('')}</dl>
      ${CHECK_LIST.some((c) => c.scope === 'site') ? `<h3>Site checks</h3><p class="muted" style="font-size:14px">Counted in pages, shown in the Site block; they do not gate any model.</p><dl class="defs">${CHECK_LIST.filter((c) => c.scope === 'site').map((c) => `<dt id="def-${esc(c.key)}">${esc(c.title)}</dt>${dd(`${esc(c.rule)}. ${c.captured ? `${c.total} pages` : `Not run yet; ${c.total ?? 'an unknown number of'} pages to judge`}.`)}`).join('')}</dl>` : ''}
      <h3>When a result stops counting</h3>
      <dl class="defs">
        ${s.staleness ? `<dt id="def-stale">When a result goes stale</dt>${dd(esc(s.staleness))}` : ''}
      </dl>
      <p class="muted" style="font-size:14px">Every model is in exactly one state, so the two above are the whole count. There is no running total to keep: there is nothing to have reached.</p>`;
  }
  /** A dialog opened by a button: closed by its × button, Escape or a backdrop click; focus goes back to the button. */
  function wireDialog(d, open, close) {
    open.addEventListener('click', () => { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); close.focus(); });
    close.addEventListener('click', () => d.close());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => open.focus({ preventScroll: true }));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && d.open) { e.preventDefault(); d.close(); } });
  }
  wireDialog($('rules-dialog'), $('rules-btn'), $('rules-close'));
  const dlg = $('cl-dialog');
  $('cl-btn').addEventListener('click', (e) => {
    // the conflict count is its own target inside the button: it opens the dialog already narrowed
    // to the items that disagree with their proof, instead of leaving you to read all 55
    clFilter = e.target.closest('[data-cl-jump]')?.dataset.clJump ?? 'all';
    renderChecklist();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    $('cl-close').focus();
  });
  $('cl-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl-filter]');
    if (!b) return;
    clFilter = b.dataset.clFilter;
    renderChecklist();
  });
  // the stepper: a phase narrows the list to that phase, clicking it again goes back to everything
  $('cl-steps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl-phase]');
    if (!b) return;
    const key = `phase:${b.dataset.clPhase}`;
    clFilter = clFilter === key ? 'all' : key;
    renderChecklist();
  });
  $('cl-close').addEventListener('click', () => dlg.close());
  // a click on the backdrop lands on the dialog element itself, outside its box
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => $('cl-btn').focus({ preventScroll: true }));
  // the browser's own Escape (the dialog's cancel) is not always delivered; close on the key itself too
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg.open) { e.preventDefault(); dlg.close(); } });

  function renderReadiness() {
    const R = L.readiness;
    if (!R) { $('readiness').innerHTML = '<p class="muted">This ledger was built before it recorded readiness. It fills in on the next build.</p>'; return; }
    const cl = R.checklist;
    const pct = cl.total ? (100 * cl.done) / cl.total : 0;
    const list = !cl.exists
      ? `<div class="notice"><b class="big">No checklist yet.</b> <code>${esc(cl.file)}</code> does not exist, so there is nothing to count. It will show here once it is written, with lines like <code>- [ ] item — how to prove it</code>.</div>`
      : !cl.total
        ? `<div class="notice"><code>${esc(cl.file)}</code> exists but has no checklist lines (<code>- [ ] item — how to prove it</code>), so nothing is counted.</div>`
        : `<div class="progress" style="margin-top:0"><b><span class="num">${cl.done}</span> of <span class="num">${cl.total}</span> done</b> <span class="muted">· from <code>${esc(cl.file)}</code></span>
            <div class="track" aria-hidden="true"><span style="width:${pct}%"></span></div></div>
          <ul class="cl">${cl.items.map((x) => `<li class="${x.done ? 'is-done' : ''}"><span class="box" aria-hidden="true">${x.done ? '✓' : ''}</span><span class="visually-hidden">${x.done ? 'done:' : 'not done:'}</span><div><b>${esc(x.item)}</b>${x.proof ? `<br><span class="muted">Proof: ${esc(x.proof)}</span>` : '<br><span class="muted">No way to prove it is written down.</span>'}</div><code class="muted">:${x.line}</code></li>`).join('')}</ul>`;
    const days = (iso) => iso ? (Date.now() - Date.parse(iso)) / 864e5 : null;
    const docs = `<div class="table-wrap"><table class="mini"><thead><tr><th>Document</th><th>Last commit</th><th>Subject</th></tr></thead><tbody>${R.docs.map((d) => {
      const c = d.lastCommit;
      const old = c && days(c.date) > 7;
      return `<tr><td><code>${esc(d.path)}</code></td><td class="num">${c ? `${esc(c.date.slice(0, 10))} <span class="muted">(${agoSpan(c.date)})</span>${old ? ' <span class="chip s-warn">over a week</span>' : ''}` : '<span class="chip s-warn">never committed</span>'}</td><td>${c ? `<code class="muted">${esc(c.hash)}</code> ${esc(c.subject)}` : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
    const risk = R.atRisk.length
      ? `<div class="table-wrap"><table class="mini"><thead><tr><th>File</th><th>State</th><th>Last changed</th></tr></thead><tbody>${R.atRisk.map((f) => `<tr><td><code>${esc(f.path)}</code></td><td><span class="chip ${f.code === '??' ? 's-bad' : 's-warn'}">${esc(f.kind)}</span></td><td class="num">${f.modifiedAt ? agoSpan(f.modifiedAt) : '<span class="muted">gone from disk</span>'}</td></tr>`).join('')}</tbody></table></div>`
      : '<p>Nothing: every file in the working tree matches a commit.</p>';
    const X = L.exportsMatrix;
    // A run's arguments as a short label: its flags, and "N models" for the ids (the whole list
    // folds away): a --defaults run over all 135 printed every id on every row.
    const runLabel = (m) => {
      const a = m.args ?? [];
      const flags = a.filter((x) => x.startsWith('-'));
      const ids = a.filter((x) => !x.startsWith('-'));
      const head = `${flags.join(' ') || 'no flags'}${ids.length ? ` · ${ids.length} model${ids.length === 1 ? '' : 's'}` : ' · its sample'}${m.sizes ? ` · SIZES=${m.sizes}` : ''}`;
      return ids.length > 3 ? `<details class="runargs"><summary><code class="muted">${esc(head)}</code></summary><code class="muted">${esc(ids.join(' '))}</code></details>` : `<code class="muted">${esc(head)}${ids.length ? `: ${esc(ids.join(' '))}` : ''}</code>`;
    };
    const rows = X?.models ?? [];
    // a --defaults run makes no setting outside the defaults, so it has nothing to say in this table
    const full = rows.filter((m) => !(m.args ?? []).includes('--defaults'));
    const defaultsOnly = rows.length - full.length;
    const matrix = !X ? '' : `<h3>Exports: default settings per model, the full matrix on a sample</h3>
      <div class="notice info" style="color:var(--text)">${esc(X.note)}</div>
      ${defaultsOnly ? `<p class="muted">For ${defaultsOnly} model${defaultsOnly === 1 ? '' : 's'} the latest export result comes from a <code>--defaults</code> run, which makes only the default settings, so there is nothing for this table to add; their verdicts (pass, fail or didn't run) are in the Export bar and the model table.</p>` : ''}
      ${full.length ? `<div class="table-wrap"><table class="mini"><thead><tr><th>Model</th><th>Run</th><th>Mismatches outside the defaults</th></tr></thead><tbody>${full.map((m) => `<tr><td><code>${esc(m.id)}</code></td><td class="num">${m.ranAt ? agoSpan(m.ranAt) : '—'}<br>${runLabel(m)}</td><td>${m.mismatches.length ? `<ul class="missing">${m.mismatches.map((x) => `<li>${esc(x.check)} ${esc(x.what)}: ${esc(x.detail)}</li>`).join('')}</ul>` : '<span class="muted">none among the settings this run made</span>'}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="muted">${rows.length ? 'No model has a full-matrix run on record yet (every setting, on the sample: <code>node scripts/check-exports.mjs</code>).' : 'No model has been through check-exports yet.'}</p>`}`;
    renderChecklist();
    $('readiness').innerHTML = `${matrix}<h3>Release checklist</h3><p class="muted">It opens from the <b>Release checklist</b> button at the top of the page, with each item's proof run here where that is cheap.</p>
      <h3>Documents: when each last reached a commit</h3>${docs}
      <h3>At risk: work that has not reached a commit (${R.atRisk.length})</h3>
      <p class="muted" style="font-size:13px">From <code>git status</code> at the last build, ${agoSpan(R.at)}; oldest first. Untracked files are in no commit at all. Other agents' work in progress shows here too.</p>${risk}`;
  }

  let doneAll = false;
  /* ---------- running the checks from the page ----------
     The page is also a file somebody can open on its own, and a static copy has nothing behind it
     that could run anything. So it asks once: if /api/state answers, the buttons appear; if it does
     not, they never do, and the page is exactly what it was before. */
  let RUN_OK = false;
  /**
   * What the board knows is running, for the renderers that draw controls.
   *
   * The controls only existed in the bar at the top, so a check could be running while its own row
   * still offered a play button -- the one control that cannot be right, because pressing it asks
   * to start a thing that has already started.
   */
  let RUN_NOW = { runs: [], paused: false, max: 2 };
  let MACHINE = null;
  /** The run of this check, if there is one: { what, label, models, mine, pid }. */
  const runOf = (what) => RUN_NOW.runs.find((r) => r.what === what) ?? null;
  /** What a click asked to start, until the board says it is running. Cleared either way. */
  /**
   * The action a click asked for, until the board's answer proves it happened.
   *
   * Every one takes a moment: starting spawns a process, stopping kills a tree of them, and
   * pausing waits for the model in flight to finish -- which is the point of pausing between
   * models rather than mid-measurement. A control that looks unchanged for two seconds reads as
   * a click that did not land, so all four wait the same way.
   */
  let PENDING = null; // { key, act: 'run' | 'pause' | 'resume' | 'stop' }
  const pendingOn = (key) => (PENDING && PENDING.key === key ? PENDING.act : null);
  /**
   * What a run is called, everywhere.
   *
   * A click writes this, a button compares against it, and the poll clears it. When the suite wrote
   * 'all' and its button wrote 'all:' the spinner never cleared, because two places were spelling
   * the same run differently -- the shape of half the bugs in this page's history.
   */
  const runKey = (what, ids = []) => `${what}:${ids.join(',')}`;
  /**
   * Ask the board. A 404 is not an answer.
   *
   * This used to return whatever came back and let the caller set RUN_OK regardless, so opening the
   * page from the Vite dev server -- which serves the page but has no /api -- showed every run
   * button, and pressing one produced "POST /api/run 404" in the console and nothing else. The
   * controls have to be there only when something is behind them, and a 404 means nothing is.
   *
   * Exactly the mistake the ledger exists to catch: a check on a response that did not check
   * whether the response was an answer.
   */
  const api = async (path, method = 'GET') => {
    const r = await fetch(path, { method, cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status} from ${path}`);
    const ct = r.headers.get('content-type') ?? '';
    if (!ct.includes('json')) throw new Error(`${path} answered ${ct || 'nothing'}, not json`);
    return { status: r.status, body: await r.json() };
  };
  /**
   * The controls for a running thing: pause (or resume) and stop, wherever the thing is shown.
   *
   * One set of markup, used by the suite control, by the row or cell that started a part-run, and
   * by the panel that shows progress -- so the same three buttons mean the same three things
   * everywhere, and there is no second place keeping its own idea of what is running.
   */
  function holdAndStop(cls = 'rowrun', what = null) {
    // A press that has been sent and not yet answered gets a spinner in the pressed button's place.
    // Without it the button stays pressable and inviting, and pause looks like it did nothing --
    // pause takes effect after the model the run is on, which can be a minute away.
    const wait = (label) => `<span class="${cls} ckrun--wait" role="status" aria-label="${label}" title="${label}"><i></i></span>`;
    // Pause is one flag file that every check watches, so it pauses all of them and its wait is
    // one wait. Stop kills a named process, so its wait belongs to that check alone.
    const act = PENDING && (PENDING.act === 'pause' || PENDING.act === 'resume') ? PENDING.act
      : PENDING && PENDING.act === 'stop' && PENDING.key === `stop:${what}` ? 'stop' : null;
    const several = RUN_NOW.runs.length > 1;
    const pr = act === 'pause' ? wait('Pausing after the model it is on')
      : act === 'resume' ? wait('Resuming')
      : RUN_NOW.paused
        ? `<button type="button" class="${cls} ckrun--go" data-act="resume" title="Resume${several ? ' everything' : ''}" aria-label="Resume">${PLAY}</button>`
        : `<button type="button" class="${cls} ckrun--hold" data-act="pause" title="Pause${several ? ' everything' : ''} after the model it is on" aria-label="Pause">${PAUSE}</button>`;
    // Stop kills the process the board started. A run somebody began in a terminal is not the
    // board's to kill, so it is not offered -- but pause is, because pause is a file both watch.
    const canStop = !what || (runOf(what)?.mine ?? false);
    /*
     * A Stop that cannot stop is shown DISABLED, saying why, rather than left out.
     *
     * Leaving it out was read as the page having no way to stop anything -- "so I can not stop the
     * process at all?". The board does know a pid for a run started in a terminal; what it does
     * not have is the right one. The pid in the file is the CHECK, whose parent is the runner, so
     * killing it would end this step and the runner would move straight on to the next one. A
     * button that does something other than what its name says is worse than one that is off and
     * explains itself.
     */
    // A run started elsewhere can still be stopped when it says what is running it: the runner's
    // pid ends the whole run, not the one step, which is the only thing Stop can honestly mean.
    const foreign = what ? runOf(what) : null;
    const runner = foreign && !foreign.mine ? foreign.runner : null;
    const whyNot = 'This run was started from a terminal and does not say what is running it, so there is no run to stop from here — only the one check, and the runner would move on to the next. Pause holds all of them.';
    const st = act === 'stop' ? wait('Stopping')
      : canStop ? `<button type="button" class="${cls} ckrun--stop" data-act="stop"${what ? ` data-act-check="${esc(what)}"` : ''} title="Stop${what ? ` ${esc(CHECK_NAMES[what] ?? what)}` : ''}" aria-label="Stop">${STOP}</button>`
      : runner ? `<button type="button" class="${cls} ckrun--stop" data-act="stop" data-act-check="${esc(what)}" title="${esc(`Stop the whole ${runner.name} run — every step of it, not just ${CHECK_NAMES[what] ?? what}. It would have to start again from the beginning.`)}" aria-label="${esc(`Stop the whole ${runner.name} run`)}">${STOP}</button>`
      : `<span class="${cls} ckrun--stop is-off" data-tip data-tiptext="${esc(whyNot)}" tabindex="0" role="img" aria-label="Stop is not available: ${esc(whyNot)}">${STOP}</span>`;
    return pr + st;
  }

  /**
   * The table's own control, beside "Collapse all".
   *
   * It runs everything, and it is where a run that belongs to no single row shows its progress: the
   * whole run, or one check started over models from more than one group.
   */
  /**
   * The Model heading's control: run every check over every model.
   *
   * Every other heading carries a round button above its word that runs that column over every
   * model. This is the same rule one column to the left -- every check rather than one -- so it is
   * the same button in the same place, and the row of them reads as one row. It used to be a wide
   * pill reading "Run every check", which was the one control in the header shaped unlike its
   * neighbours, and the tallest thing in the row.
   *
   * While the whole run goes, the bar for it is the table's own first row, across all of it. This
   * keeps only the two buttons that change it.
   */
  function renderSuite() {
    // Two slots, one answer: the Model column heading, and the table toolbar for the widths
      // where there is no heading row. Whichever is on screen shows the same control.
    const slots = document.querySelectorAll('[data-suite]');
    if (!slots.length) return;
    const all = runOf('all');
    const html = !RUN_OK ? ''
      : all ? (all.mine ? holdAndStop('cellrun', 'all') : '')
      : runBtn('all', [], 'Run every check over every model', 'cellrun');
    for (const el of slots) el.innerHTML = html;
  }
  /** Everything a press changes, drawn once. Four separate calls per click redrew the table four times. */
  function redrawControls() {
    sortBars();
    renderSuite();
    if (L) { renderRows(); renderSiteChecks(); renderColRuns(); }
  }
  const sigOf = () => `${RUN_NOW.runs.map((r) => `${r.what}@${(r.models ?? []).join('+')}`).sort().join('|')}|${RUN_NOW.paused}|${PENDING ? `${PENDING.key}:${PENDING.act}` : ''}`;

  async function runState() {
    try {
      const { body } = await api('/api/state');
      RUN_OK = true;
      const was = sigOf();
      // Each wait ends on the fact it was waiting for, not on a timer.
      if (PENDING) {
        // A start waits until the LEDGER has seen it, not just the server. The server says
        // running the instant it spawns, but the check takes seconds to open a browser and write
        // anything -- and a row that flips straight to pause/stop while nothing is happening is
        // precisely the delay the spinner is for.
        //
        // The entry has to be a LIVE one. Accepting any entry was satisfied instantly by the last
        // run's leftover record: trusting a file without asking whether it is current, which is the
        // fault this whole board exists to catch.
        // A whole-check run waits for the ledger to see it; a part-run waits for the board, whose
        // label already names the models and which is the only thing that knows about them.
        const asked = String(PENDING.key).split(':')[0];
        const has = (w) => (body.runs ?? []).some((r) => r.what === w);
        const done = PENDING.act === 'run' ? has(asked)
          : PENDING.act === 'stop' ? !has(String(PENDING.key).slice(5))
          : PENDING.act === 'pause' ? !!body.paused
          : !body.paused;
        if (done) PENDING = null;
      }
      RUN_NOW = { runs: body.runs ?? [], paused: !!body.paused, max: body.max ?? 2 };
      // What the machine has left, from the same poll. Kept apart from RUN_NOW's signature on
      // purpose: free memory moves every second and redrawing the whole board for it would fight
      // the page's own rebuild. paintMachine() touches one chip.
      MACHINE = body.machine ?? null;
      paintMachine();
      // Only when it actually changes: this polls every three seconds, and redrawing the bars on
      // every poll would fight the page's own rebuild and lose any disclosure somebody had opened.
      // renderStage draws the bars that are actually on screen. renderCheckBars fills #checkbars,
      // which is a different container further down -- calling that one redrew nothing anybody
      // could see, and the empty catch hid the fact that it had not worked.
      if (was !== sigOf()) redrawControls(); else renderSuite();
      reTip();
      // What is running, and the controls for it, are drawn by renderSuite() beside the table.
      // There is no separate bar any more: every run starts from the table, so a second place
      // showing its own idea of the state is a second thing to keep true.

      return body;
    } catch {
      /*
       * No board behind this page. That happens for a good reason -- the ledger is also served by
       * the app's dev server, and opened straight from a file -- and hiding the buttons is right,
       * because a control for something that is not there is worse than no control.
       *
       * But silence sent somebody looking for a bug that was not there: the page was open on the
       * dev server's port, the buttons were showing (a 404 used to count as the board answering),
       * and pressing one printed 404 in a console nobody had open. So it says where the buttons
       * are, once, instead of leaving a gap.
       */
      RUN_OK = false;
      renderSuite();
      return null;
    }
  }
  async function runDo(path, check, models = []) {
    // A 409 is the board answering -- "something is already running" -- so it is shown, not thrown.
    try {
      await api(path + (check ? `?check=${encodeURIComponent(check)}${models.length ? `&models=${encodeURIComponent(models.join(','))}` : ''}` : ''), 'POST');
    } catch (e) {
      PENDING = null;
      const m = /^409 /.test(String(e.message)) ? String(e.message).replace(/^409 /, '') : String(e.message);
      const el = $('suite');
      if (el) el.innerHTML = `<span class="suite__off">${esc(m)}</span>`;
    }
    await runState();
  }
  document.addEventListener('click', (e) => {
    const part = e.target.closest('[data-run-what]');
    if (part && !part.disabled) {
      const ids = (part.dataset.runIds ?? '').split(',').filter(Boolean);
      PENDING = { key: runKey(part.dataset.runWhat, ids), act: 'run' };
      redrawControls();
      runDo('/api/run', part.dataset.runWhat, ids);
      return;
    }
    const one = e.target.closest('[data-run]');
    if (one && !one.disabled) {
      PENDING = { key: one.dataset.run, act: 'run' };
        runDo('/api/run', one.dataset.run);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && !act.disabled) {
      // Pause and resume are one flag file for the machine, so they take no name and stop nothing.
      // Stop kills a process, so it names the check whose process it is -- pressing Stop on one
      // row must not take down the check running on another.
      const what = act.dataset.actCheck ?? null;
      PENDING = { key: act.dataset.act === 'stop' ? `stop:${what ?? ''}` : 'paused', act: act.dataset.act };
      redrawControls();
      runDo('/api/' + act.dataset.act, act.dataset.act === 'stop' ? what : null);
      return;
    }
  });
  runState().then((s) => { if (s) rerender(); });
  setInterval(runState, 3000);

  /*
   * WHAT THE MACHINE HAS LEFT, beside the watcher.
   *
   * Every check drives a fleet of real browsers over real models, on somebody's laptop. The board
   * already refuses some combinations, but a refusal only speaks at the moment you press a button.
   * This is the number behind it, in the same shape as "watcher live": a dot and a few words. The
   * dot goes amber under the floor browser-guard makes a model WAIT at, which is the number that
   * decides whether starting a second run helps or just makes both slower.
   */
  function paintMachine() {
    const el = $('machine'); if (!el) return;
    const m = MACHINE;
    if (!m) { el.innerHTML = ''; return; }
    const cpu = m.cpuPercent == null ? '' : ` · CPU ${m.cpuPercent}%`;
    const dot = m.low ? 'warn' : 'on';
    /*
     * UNDER THE FLOOR, NAME WHAT IS HOLDING IT.
     *
     * "0.4 GB free" is a number, not something a person can act on. Below the floor every model
     * WAITS before it starts (browser-guard), so a two-minute step can take fifty-three and look
     * broken rather than slow — and the obvious suspect is the checks, which on 2026-09-29 were
     * innocent: all eight node processes together held 0.35 GB while a game held 3.11.
     *
     * The chip stays one line. The name goes in the chip; the size and what it means to the run
     * are in the tooltip and the dialog behind it.
     */
    const hog = m.low && m.hog
      ? `<span class="hog"> — ${esc(m.hog.name)} has ${esc(m.hog.gb)} GB</span>`
      : '';
    const tip = m.low
      ? `Under the ${m.floorGB} GB floor, so every model waits before it starts and a run takes several times longer than its estimate.`
        + (m.hog ? ` The largest holder is ${m.hog.name}, at ${m.hog.gb} GB. Closing it is the fastest thing that helps.` : ` The board has not identified the largest holder yet.`)
      : 'What this machine has left — click for what it means';
    el.innerHTML = `<span class="sep">·</span>`
      + `<button type="button" class="machine linkish" data-machine`
      + ` title="${esc(tip)}">`
      + `<i class="dot ${dot}"></i>${m.memFreeGB} GB free${esc(cpu)}${hog}</button>`;
  }

  /** The modal behind that chip: the numbers, and why running two checks at once is not free. */
  function machineModal() {
    const m = MACHINE;
    if (!m) return '<p>The board is not answering, so there is nothing to report about the machine.</p>';
    const used = Math.round((m.memTotalGB - m.memFreeGB) * 10) / 10;
    const usedPc = Math.min(100, Math.max(0, (used / m.memTotalGB) * 100));
    const floorPc = Math.min(100, Math.max(0, ((m.memTotalGB - m.floorGB) / m.memTotalGB) * 100));
    const cpu = m.cpuPercent;
    return `
      <div class="mgauges">
        <section class="mgauge${m.low ? ' is-bad' : ''}">
          <header><h3>Memory</h3><b>${m.memFreeGB} GB<span>free</span></b></header>
          <div class="mbar" role="img" aria-label="${used} GB of ${m.memTotalGB} GB in use; the floor is at ${m.floorGB} GB free">
            <i style="width:${usedPc.toFixed(1)}%"></i>
            <u style="left:${floorPc.toFixed(1)}%" title="Under ${m.floorGB} GB free, a model waits"></u>
          </div>
          <footer>${used} GB in use of ${m.memTotalGB} · the floor is <b>${m.floorGB} GB</b> free</footer>
        </section>
        <section class="mgauge">
          <header><h3>CPU</h3><b>${cpu == null ? '—' : `${cpu}%`}<span>${cpu == null ? 'sampling' : 'busy'}</span></b></header>
          <div class="mbar" role="img" aria-label="${cpu == null ? 'not sampled yet' : `${cpu} per cent busy`}">
            <i style="width:${cpu == null ? 0 : cpu}%"></i>
          </div>
          <footer>averaged over the last second, across ${m.cores} cores</footer>
        </section>
      </div>
      <ul class="mfacts">
        <li><b>${m.maxRuns}</b> check${m.maxRuns === 1 ? '' : 's'} at once</li>
        <li><b>${m.maxBrowsers}</b> browser${m.maxBrowsers === 1 ? '' : 's'} per check</li>
        <li>temperature ${m.tempC != null ? `<b>${m.tempC} °C</b>`
          : `<b>no reading</b> <span class="mwhy" data-tip data-tiptext="${esc(m.tempWhy ?? '')}">why?</span>`}</li>
      </ul>
      <p>A check is not a script that reads a file. It drives real Chromium browsers over real
      models — opening pages, recording video, decoding frames — and this is a laptop, not a farm.
      <b>Two checks at once is not twice the work done:</b> it is the same cores and the same memory
      split two ways.</p>
      <p>Before every model the guard reads free memory. Under <b>${m.floorGB} GB</b> the model
      <b>waits</b>, for up to three minutes; if memory has not come back it runs anyway and its
      result says <i>ran under memory pressure</i>. A fresh browser is launched every 20 models, so
      memory cannot creep across a 135-model run.</p>
      <p><b>One check must have the machine to itself.</b> The performance check measures how many
      milliseconds a model takes to draw, and anything else running lands in that number. The board
      will not start it beside another check, or another check beside it.</p>`;
  }

  /* ---------- live: what the watcher and the fetches say ---------- */
  const POLL_MS = 10000;
  const BEAT_DEAD_S = 90; // the watcher beats every 30 s; three missed beats is not a pause
  const QUIET_S = 120;
  let lastFetchAt = null, lastChangeAt = null, fetchError = null;

  function watcherState() {
    if (wMissing) return { kind: 'none' };
    if (!W) return { kind: 'unknown' };
    if (W.stoppedAt) return { kind: 'stopped', at: W.stoppedAt };
    const beat = age(W.heartbeatAt);
    return beat != null && beat <= BEAT_DEAD_S ? { kind: 'alive', beat } : { kind: 'dead', beat };
  }

  function renderLive() {
    if (!L) return;
    const w = watcherState();
    const dataAge = age(L.generatedAt);
    const dot = { alive: 'on', dead: 'off' }[w.kind] ?? '';
    const wText = {
      alive: `Watcher live · heartbeat ${fmtAge(w.beat)}`,
      dead: `Watcher not responding · last heartbeat ${fmtAge(w.beat)}`,
      stopped: `Watcher stopped ${ago(w.at)}`,
      none: 'No watcher has run',
      unknown: 'Watcher state unknown',
    }[w.kind];
    const checked = `Page checked ${lastFetchAt ? fmtAge((Date.now() - lastFetchAt) / 1000) : 'never'}${document.hidden ? ' (paused while the tab is hidden)' : `, every ${POLL_MS / 1000} s`}. Ledger updated ${fmtAge(dataAge)}.`;
    // "watcher live" is the only state short enough to shorten: every other one says what is wrong
    const short = w.kind === 'alive' ? 'watcher live' : wText;
    /*
     * A GATE IN FLIGHT SAYS SO, ABOVE EVERYTHING ELSE.
     *
     * The line below this used to read "Quiet, not stale: nothing the ledger reads has changed
     * for 6 min" over a run with three hours left, because the seven gate steps that record
     * nothing per model change nothing for the ledger to read. Quiet and busy looked identical.
     * They are opposites, and this is the one place a person looks to tell them apart.
     */
    const G = (L as any).gate as null | { running: boolean; crashed: boolean; total: number; startedAt: string;
      step: null | { index: number; key: string; short?: string | null; name: string }; done: { key: string; ok: boolean; took: string }[] };
    let gateNote = '';
    let gateChip = '';
    if (G?.running) {
      /* How many are FINISHED, not the one it is on. The bar under the header counts the same way,
         and a chip saying 4/5 beside a bar saying 3/5 is one run described by two numbers -- which
         is the fault this board exists to catch, so it should not be committing it. The step's own
         name says where it has got to; the count says how much is behind it. */
      const at = G.done.length;
      const pct = G.total ? Math.min(100, Math.round((100 * G.done.length) / G.total)) : 0;
      const bad = G.done.filter((d) => !d.ok);
      /* A CHIP, NOT A BLOCK. The first version of this was a 134px notice that pushed the whole
         board down for three hours. The run belongs beside the other live facts -- the watcher,
         the memory, the CPU -- because that is what it is: a thing that is true right now. The
         step name is hidden under 560px, where the row has about 115px to spare. */
      const tip = (`gate: step ${at} of ${G.total}${G.step ? `, ` + G.step.name : ``}. ${G.done.length} finished${bad.length ? `, ${bad.length} failed: ` + bad.map((d) => d.key).join(`, `) : `, all held`}. Started ${clock(G.startedAt)}.`);
      gateChip = (`<span class="sep">·</span><span class="gate${bad.length ? ` gate--bad` : ``}" tabindex="0" data-tip data-tiptext="${esc(tip)}" data-cl-jump="gate"><i class="dot busy"></i>gate <b>${esc(at)}/${esc(G.total)}</b>${G.step ? `<span class="gate__what">${esc(G.step.short ?? G.step.key)}</span>` : ``}<span class="gate__track"><i style="width:${pct}%"></i></span></span>`);
    } else if (G?.crashed) {
      gateNote = (`<div class="notice bad"><b class="big">A gate run stopped without finishing.</b> It reached step ${esc(G.step?.index ?? G.done.length)} of ${esc(G.total)}${G.step ? ` (<code>${esc(G.step.key)}</code>)` : ``} and the process is gone, so nothing is running now: this board holds whatever it had recorded by then. Start it again with <code>npm run verify</code>.</div>`);
    }
    $('live').innerHTML = `<span class="sep">·</span><span tabindex="0" data-tip data-tiptext="${esc(checked)}"><i class="dot ${dot}"></i>${esc(short)}</span>`
      /* The line already opens with "built 7 min ago" from #meta. Saying "not rebuilt for
         7 min" four words later is the same clock read backwards, and a third copy sat under
         the header as a notice. One telling is enough; the age is in #meta where it belongs. */
      + `<span id="machine"></span>`
      + gateChip;
    paintMachine();

    // the plain-words notice: minute granularity, rewritten only when it changes (it is aria-live)
    const min = (s) => `${Math.max(1, Math.round(s / 60))} min`;
    let note = '';
    if (fetchError) note = `<div class="notice bad"><b class="big">Could not refresh.</b> ${esc(fetchError)}. What you see was fetched ${esc(lastChangeAt ? fmtAge((Date.now() - lastChangeAt) / 1000).replace(/\d+ s ago/, 'under a minute ago') : 'earlier')}.</div>`;
    else if (w.kind === 'dead' && dataAge > QUIET_S) note = `<div class="notice bad"><b class="big">Stale: this page has stopped updating.</b> The ledger has not changed for ${min(dataAge)}, and the watcher that should rebuild it last reported ${min(w.beat ?? 0)} ago without recording a stop, so it has probably crashed or the laptop slept. Commits and check results since ${esc(clock(W.heartbeatAt))} are missing. Restart it with <code>npm run ledger:watch</code>.</div>`;
    else if (w.kind === 'dead') note = `<div class="notice">The watcher last reported ${min(w.beat ?? 0)} ago without recording a stop. This data is recent because it was built ${L.build?.by ? `by <code>${esc(L.build.by)}</code>` : 'another way'}, but nothing is rebuilding it. Restart the watcher with <code>npm run ledger:watch</code>.</div>`;
    /* NOT A NOTICE. This put a full-width banner under the header to announce that nothing was
       wrong -- the third place on screen saying the same age, after "built 7 min ago" and "not
       rebuilt for 7 min". A notice is for something a person has to act on. "watcher live" in
       the status line already says the watcher is alive, and it costs no row. */
    else if ((w.kind === 'stopped' || w.kind === 'none') && dataAge > QUIET_S) note = `<div class="notice"><b class="big">Not live.</b> No watcher is running, so this is the build from ${min(dataAge)} ago and it will not change until someone runs <code>npm run ledger</code> or starts <code>npm run ledger:watch</code>.</div>`;
    note = gateNote + note;
    // is the data built by the code that is on disk?
    const code = L.build?.code;
    if (!code) note += `<div class="notice"><b class="big">Built by old code.</b> This ledger was built by a version of <code>scripts/ledger.mjs</code> from before it recorded its own version, so it may be missing sections or counting the old way.${w.kind === 'alive' ? ' The watcher running now loaded that old code: restart it with <code>npm run ledger:watch</code>.' : ' Run <code>npm run ledger</code>.'}</div>`;
    else if (code.stale) note += `<div class="notice"><b class="big">Built by older code than is on disk.</b> This build ran on <code>${esc(code.loaded)}</code>, but <code>${esc(code.files.join(' and '))}</code> are now <code>${esc(code.onDisk)}</code>. ${w.kind === 'alive' && W?.code ? 'The watcher reloads the new code on its next build.' : w.kind === 'alive' ? 'The watcher running now does not reload its code: restart it with <code>npm run ledger:watch</code>.' : 'Run <code>npm run ledger</code>.'}</div>`;
    else if (w.kind === 'alive' && W && !W.code) note += `<div class="notice">The watcher running now does not report which build code it has loaded, so it predates reloading and will keep building with old code after the next change to <code>scripts/ledger.mjs</code>. Restart it with <code>npm run ledger:watch</code>.</div>`;
    // The instruments' own failures, outside the chain above because it is a separate fact and can
    // be true alongside any of them. This page says "reported, not measured" about the work; this is
    // the same honesty pointed at the tools doing the reporting. On 2026-09-25 a process list timed
    // out at the same moment a status block had separately decided the run was over, and together
    // they read as one confident obituary for a gate that had twenty Chromium renderers working. A
    // failure of an instrument is a finding, and findings belong where the findings are.
    const inst = W?.instruments;
    if (inst?.count) note += `<div class="notice"><b class="big">The watching tools failed ${inst.count} time${inst.count === 1 ? '' : 's'} in the last day.</b> Not the app and not the checks — the instruments that report on them. What they could not do is recorded rather than swallowed, because a tool that gives up quietly is how you come to trust a reading taken by something that was not working: <code>${esc(inst.last.map((r) => r.what).join(' · ').slice(0, 220))}</code></div>`;
    if ($('livenote').dataset.note !== note) { $('livenote').dataset.note = note; $('livenote').innerHTML = note; }
  }

  function tickAges() {
    if (document.hidden) return;
    document.querySelectorAll('[data-ago]').forEach((el) => { const t = ago(el.dataset.ago); if (el.textContent !== t) el.textContent = t; });
    // the same tick keeps the table's commit ages honest; nothing is written unless the words change
    document.querySelectorAll('[data-ago-short]').forEach((el) => { const t = fmtAgeShort(age(el.dataset.agoShort)); if (el.textContent !== t) el.textContent = t; });
    renderLive();
  }

  /** Re-render in place, keeping where the reader is: scroll, the focused control, the caret in the search. */
  function rerender() {
    const x = scrollX, y = scrollY, tx = $('tablewrap').scrollLeft;
    const a = document.activeElement;
    const caret = a?.id === 'q' ? [a.selectionStart, a.selectionEnd] : null;
    const row = a?.closest?.('tr.row')?.dataset.id;
    const onTab = a?.getAttribute?.('role') === 'tab';
    const key = ['f', 'g', 't'].find((k) => a?.closest?.('#filters') && a.dataset?.[k] != null);
    const btn = key ? `#filters button[data-${key}="${CSS.escape(a.dataset[key])}"]` : null;
    render();
    if (caret) { const q = $('q'); q.focus({ preventScroll: true }); try { q.setSelectionRange(...caret); } catch {} }
    else if (row) document.querySelector(`tr.row[data-id="${CSS.escape(row)}"]`)?.focus({ preventScroll: true });
    else if (btn) document.querySelector(btn)?.focus({ preventScroll: true });
    else if (onTab) $('stats').querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
    $('tablewrap').scrollLeft = tx;
    scrollTo(x, y);
  }

  /* ---------- loading ---------- */
  const raw = { l: null, q: null, w: null };
  async function getText(name) {
    const r = await fetch(name, { cache: 'no-cache' });
    if (!r.ok) { const e = new Error(`${name}: HTTP ${r.status}`); e.missing = r.status === 404; throw e; }
    const type = r.headers.get('content-type') || '';
    const text = await r.text();
    // a dev server answers a missing file with its index page and a 200: that is not the file
    if (/html/.test(type) || /^\s*</.test(text)) { const e = new Error(`${name} is missing (the server sent a page instead)`); e.missing = true; throw e; }
    return text;
  }
  /* A writer on Windows may have to write a file in place, and a fetch can catch it half done. That
     is not news: keep the last good copy, try again next tick, and say so only if it keeps failing. */
  const parseFails = {};
  const parseFail = (name, errs) => {
    parseFails[name] = (parseFails[name] ?? 0) + 1;
    if (parseFails[name] >= 3) errs.push(`${name} has not parsed for ${parseFails[name]} fetches in a row; showing the last good copy`);
  };
  let first = true;
  async function refresh() {
    const [l, w] = await Promise.allSettled([getText('ledger.json'), getText('ledger-watch.json')]);
    const errs = [];
    let changedL = false;
    if (l.status === 'fulfilled') {
      if (l.value !== raw.l) {
        try {
          const next = JSON.parse(l.value);
          if (L && prevSig) for (const m of next.models) if (prevSig.get(m.id) !== rowSig(m)) flash.add(m.id);
          if (L) for (const m of next.models) { const was = wasStatus.get(m.id); if (was && was !== 'approved' && m.status === 'approved') justApproved.add(m.id); }
          wasStatus = new Map(next.models.map((m) => [m.id, m.status]));
          prevSig = new Map(next.models.map((m) => [m.id, rowSig(m)]));
          L = next; raw.l = l.value; changedL = true; parseFails['ledger.json'] = 0;
    checkPageBuild((L as any)?.pageBuild);
        } catch { parseFail('ledger.json', errs); }
      }
    } else errs.push(l.reason.message);
    if (w.status === 'fulfilled') { if (w.value !== raw.w) { try { W = JSON.parse(w.value); wMissing = false; raw.w = w.value; parseFails["ledger-watch.json"] = 0; } catch { parseFail('ledger-watch.json', errs); } } }
    else if (w.reason.missing) { W = null; wMissing = true; raw.w = null; }
    lastFetchAt = Date.now();
    if (!L) { if (first) loadFallback(l.reason); first = false; return; }
    first = false;
    fetchError = errs.length ? errs.join('; ') : null;
    if (!fetchError) lastChangeAt = Date.now();
    const firstRender = changedL && !rendered;
    if (changedL) rerender();
    if (firstRender) { rendered = true; try { const y = Number(sessionStorage.getItem('ledger-scroll')); if (y > 0) scrollTo(0, y); } catch {} }
    renderLive();
  }
  let rendered = false;
  addEventListener('pagehide', () => { try { sessionStorage.setItem('ledger-scroll', String(Math.round(scrollY))); } catch {} });

  function loadFallback(err) {
    $('meta').textContent = 'The ledger could not be loaded.';
    $('notices').innerHTML = `<div class="notice bad">Could not read <code>ledger.json</code>: ${esc(err?.message)}.
      Opened straight from disk, a browser will not let the page read files beside it. Serve the folder
      (for example <code>npm run dev</code>, then open <code>/docs/ledger.html</code>), run <code>npm run ledger</code> if the file does not exist,
      or pick the two files here. Picked files do not refresh.</div>
      <div class="loadbox"><label>ledger.json: <input type="file" id="pick" accept=".json,application/json" multiple></label></div>`;
    $('pick').addEventListener('change', async (e) => {
      for (const f of e.target.files) {
        try {
          const data = JSON.parse(await f.text());
          if (Array.isArray(data.models)) L = data;
        } catch (x) { alert(`${f.name}: ${x.message}`); }
      }
      if (L) { stopPolling(); render(); $('live').textContent = 'Showing picked files: this copy does not refresh.'; }
    });
  }

  let timer = null, ticker = null;
  /*
   * A refresh that threw used to be swallowed by .catch(() => {}).
   *
   * Everything after the throw simply did not happen, so the page kept whatever half-drawn state
   * it had reached -- a table with headings and no rows, filters with no chips -- and said nothing,
   * anywhere, about why. That is the same fault as the export worker's empty catch that hid a 429
   * for a week, in the one page whose whole purpose is to refuse to hide things.
   *
   * It says what broke, where anybody looking at the page will see it, and puts the stack in the
   * console. A board that cannot draw itself has to say so; a blank half of a page does not.
   */
  function refreshFailed(e) {
    console.error('ledger: the page could not finish drawing', e);
    const box = $('notices');
    if (!box) return;
    box.hidden = false;
    box.insertAdjacentHTML('afterbegin', `<div class="notice notice--stopped"><span class="notice__what"><b>This page could not finish drawing.</b></span><span class="notice__why">${esc(String(e?.message ?? e))} — the console has the stack. Anything below may be left over from before the error.</span></div>`);
  }

  const schedule = () => { clearTimeout(timer); if (!document.hidden) timer = setTimeout(() => refresh().catch(refreshFailed).finally(schedule), POLL_MS); };
  const stopPolling = () => { clearTimeout(timer); clearInterval(ticker); timer = ticker = null; document.removeEventListener('visibilitychange', onVis); };
  const onVis = () => { if (document.hidden) clearTimeout(timer); else refresh().catch(refreshFailed).finally(schedule); };
  document.addEventListener('visibilitychange', onVis);
  ticker = setInterval(tickAges, 1000);
  refresh().catch(refreshFailed).finally(schedule);
})();
