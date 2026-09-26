/* The ledger's behaviour, split out of docs/ledger.html and built by Vite like the app's own.
   Nothing here changed in the split. */

(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = [
    // short names for the same exclusive buckets as the summary: never read as running totals
    { key: 'to check', short: 'To check', long: 'to check: an automated check is not cleared', cls: 's-conv', color: 'var(--st-conv)' },
    { key: 'checked', short: 'Awaiting review', long: 'awaiting review: every check clear', cls: 's-chk', color: 'var(--st-chk)' },
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
    $('theme').textContent = `Theme: ${mode}`;
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
  const ssChevron = '<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true" focusable="false"><path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  /* No data-tip here: the page's tooltip writes aria-expanded on whatever it points at, which on a
     disclosure would both fight this button's own state and tell a screen reader the wrong thing. */
  const ssToggle = (id, label, open) => `<button type="button" class="sstog" data-ss="${esc(id)}" aria-expanded="${open}" aria-controls="ss-${esc(id)}">${ssChevron}${esc(label)}</button>`;
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
    if (id.startsWith('run:')) renderRunning(); else { renderStage(); renderCheckBars(); }
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
  function checkMark(key, m) {
    const r = m.checks[key];
    const [kind, word] = markKind(r);
    const title = CHECK_NAMES[key] ?? key;
    const run = L.running?.[key];
    const now = run && run.alive !== false && run.last === m.id;
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
    return markHtml(kind, `${title}: ${word}${s ? `, ${s.status} at the last release` : ''}${now ? ', running now' : ''}`, text, MARKS[kind][0], `${now ? ' is-running' : ''}${s ? ' mk--wasrel' : ''}`, aged ? `--age:${aged.toFixed(2)}` : '');
  }
  /** A review as a mark: V or T, coloured by its latest fresh verdict. */
  function reviewMark(m, kind) {
    const list = (m.reviews ?? []).filter((r) => r.kind === kind);
    const L1 = kind === 'visual' ? 'V' : 'T';
    if (!list.length) return markHtml('never', `${kind} review: none`, `${kind} review: none recorded.`, L1, ' mk--letter');
    const fresh = list.find((r) => !r.stale);
    if (!fresh) return markHtml('stale', `${kind} review: stale`, `${kind} review: stale. ${list[0].staleWhy}.`, L1, ' mk--letter');
    const v = fresh.verdict ?? 'marked';
    // "fixed" is a pass: it was drawn violet, which read next to the green ones as if it were unfinished.
    // Same green, and the difference is carried by a dot on the mark, not by a hue nobody can name.
    const cls = v === 'problem' ? 'fail' : 'pass';
    const who = fresh.source === 'log' ? `${fresh.reviewer}, ${String(fresh.reviewedAt).slice(0, 10)}` : `commit ${fresh.commit}: ${fresh.subject}`;
    return markHtml(cls, `${kind} review: ${v}`, `${kind} review: ${v}. ${who}.`, L1, ` mk--letter${v === 'fixed' ? ' mk--fixed' : ''}`);
  }
  function renderMarkLegend() {
    const items = [['pass', 'pass'], ['cleared', 'flags cleared'], ['stale', 'passed on older code'], ['flag', 'open flags'], ['fail', 'failed'], ['broke', "didn't run (test crashed)"], ['never', 'not run yet']];
    $('marklegend').innerHTML = items.map(([k, w]) => `<span><span class="mk mk--${k}" aria-hidden="true">${MARKS[k][0]}</span>${esc(w)}</span>`).join('')
      + `<span><span class="mk mk--pass is-running" aria-hidden="true">${GLYPH.tick}</span>running on it now</span>`
      + `<span><span class="mk mk--pass mk--letter" aria-hidden="true">V</span><span class="mk mk--pass mk--letter" aria-hidden="true">T</span>visual and text review: fine</span>`
      + `<span><span class="mk mk--pass mk--letter mk--fixed" aria-hidden="true">V</span>a problem, since fixed</span>`;
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

  const rowSig = (m) => JSON.stringify([m.status, ...COLS.map(([k]) => [m.checks[k]?.status, m.checks[k]?.stale, m.checks[k]?.ranAt]), m.commits.length, (m.reviews ?? []).map((r) => [r.kind, r.verdict, r.stale])]);

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
    if (a === 'review') return `${b} review ${c === 'none' ? 'missing' : c === 'problem' ? 'found a problem' : c}`;
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
    const rank = (r) => (r.scope === 'review' ? 2 : 1);
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
    if (b.scope === 'review') return {
      title: `${esc(cap(b.review))} review: ${esc(b.label)}`, sw: REVIEW_SW[b.kind] ?? 'var(--k-never)', why: `${esc(cap(b.means))}.`,
      state: b.kind === 'problem' ? 'Fix what the review found, then review again.' : `Needs a fresh ${esc(b.review)} review (an entry in <code>docs/reviews/</code>).`,
    };
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
      state = 'Open one in the table for its flags. A fresh visual review can mark each one a false alarm.';
    } else if (b.kind === 'failed') {
      state = run && run.alive !== false && inRun ? `The run in progress will re-run ${inRun} of them. Open one in the table for what failed.` : 'Open one in the table for what failed.';
    } else if (b.kind === 'stale-pass') state = 'A re-run of the check on the current code clears it.';
    return { title: `${esc(short)}: ${esc(b.label)}`, sw: KIND_SW[b.kind] ?? 'var(--k-never)', why: `${esc(cap(b.means))}.`, state };
  }

  /* the three states as one extruded arrow, and as tabs: exactly one is selected, and its panel shows
     that stage's detail. Selecting one does not filter the table; its panel has a button that does. */
  const STEP_SHORT = { 'to check': 'To check', checked: 'Awaiting review', approved: 'Approved' };
  const STEP_SUB = { 'to check': 'an automated check is not yet cleared', checked: 'every check clear; reviews pending', approved: 'checks clear and reviewed' };
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
      renderStage();
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
  function seaPath(lvs) {
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
    return `<div class="flow__scene" aria-hidden="true" data-sel="${sel}" style="--lv1:${lvs[0]};--lv2:${lvs[1]};--lv3:${lvs[2]}">
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
  function envelope(amps, vw) {
    const g = WV_GATE.map(([s, e]) => [s * vw, e * vw]);
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
    const scene = OCEAN ? sceneHtml(from, selIx)
      : synthScene(buckets.map((b, i) => waveAmp(lvs[i], b.count, WV.amp)), selIx, grew);
    const stepAmp = fromAmp(WVN);
    // the sun's light is the Approved share; the wave is what carries the number, the sun only warms to it
    $('stats').style.setProperty('--ch3', String(lvs[2] ?? 0));
    $('stats').innerHTML = scene + `<ol class="flow" role="tablist" aria-label="Stages every model passes through">${buckets.map((b, i) => {
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
      return `<li class="flow__li" role="presentation"><span id="step-rule-${i}" class="visually-hidden">${esc(rule)}</span><button type="button" role="tab" id="stage-tab-${i}" class="step step--${i + 1}${b.count ? ' has-work' : ''}" data-stage="${esc(b.key)}" data-lv="${lv}" style="--lv:${f};--ch:${f}" aria-selected="${on}" aria-controls="ov-stage" tabindex="${on ? 0 : -1}" data-tip aria-describedby="step-rule-${i}"
          aria-label="${esc(`${name}: ${b.count} of ${total} models, ${pct}% of the strip`)}">
        <span class="step__body" aria-hidden="true">
          ${inner}
          <span class="step__text"><span class="step__label">${esc(name)}</span><span class="step__n">${b.count}</span><span class="step__sub">${esc(STEP_SUB[b.key] ?? '')}</span></span>
        </span></button></li>`;
    }).join('')}</ol>`;
    // the wave rises from where it stood; a redraw on select starts where it already is, so nothing moves
    const settle = () => {
      let moved = false;
      for (const el of $('stats').querySelectorAll('.step')) {
        const to = +el.dataset.lv, was = shownLv.get(el.dataset.stage);
        el.style.setProperty('--lv', el.dataset.lv);
        el.style.setProperty('--ch', el.dataset.lv);
        shownLv.set(el.dataset.stage, to);
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
    const ap = by('approved'), ch = by('checked'), cv = by('to check');
    // the answer first, in one true sentence
    const parts = [];
    if (ch) parts.push(`<b>${ch}</b> ${ch === 1 ? 'has' : 'have'} every check clear and ${ch === 1 ? 'waits' : 'wait'} for review`);
    if (cv) parts.push(`<b>${cv}</b> ${cv === 1 ? 'is' : 'are'} held by a check`);

    // the accounting: every model in exactly one state; the sum itself is one hover away
    const buckets = c.buckets ?? STATUS.map((s) => ({ key: s.key, label: s.long, count: by(s.key) }));
    const sum = buckets.reduce((s, b) => s + b.count, 0);
    const bal = c.balance ?? { ok: sum === n, sum, models: n, problems: sum === n ? [] : [`the buckets sum to ${sum}, not ${n}`] };
    // every state is a filter its panel's button (and the chip) can set
    BLK = new Map(buckets.map((b) => [`status:${b.key}`, { ids: new Set(L.models.filter((m) => m.status === b.key).map((m) => m.id)), chip: STEP_SHORT[b.key] ?? b.label }]));
    renderStats(buckets);
    const sumText = `${buckets.map((b) => `${b.count} ${b.label.toLowerCase()}`).join(' + ')} = ${bal.sum}, and there are ${bal.models} models`;
    $('balance').className = `tally${bal.ok ? '' : ' bad'}`;
    $('balance').innerHTML = bal.ok
      ? `<span class="tally__ok" tabindex="0" data-tip data-tiptext="${esc(`${sumText}. Each model is in exactly one state; the build fails if they do not add up.`)}" aria-label="${esc(`The numbers add up: ${sumText}`)}">✓ The numbers add up: every model is counted once</span>`
      : `<span class="tick" aria-hidden="true">✗</span> <b>MISMATCH, the books do not balance:</b> ${bal.problems.map(esc).join('; ')} (${esc(sumText)}). Nothing on this page adds up until this is fixed.`;

    // what holds the rest back
    const rows = blockerRows();
    if (!rows) {
      $('blk-note').textContent = '';
      $('blockers').innerHTML = '<li class="muted">This ledger was built before it listed what holds each model back; the list appears on the next build.</li>';
    } else {
      $('blk-note').textContent = rows.length
        ? `These overlap: a model held by two checks is counted under both. ${cv} model${cv === 1 ? ' is' : 's are'} held by at least one check${ch ? `; the review rows count only the ${ch} with every check clear` : ''}. Click one to show exactly those models in the table.`
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
    btn.hidden = !rows;
    btn.innerHTML = `What’s holding models back <small>· ${n - ap}</small>`;
    btn.setAttribute('aria-label', `What’s holding models back: ${n - ap} models not approved`);
    btn.dataset.tip = '';
    btn.dataset.tiptext = `${n - ap} of ${n} models are not approved: ${cv} held by a check${ch ? `, ${ch} waiting only on reviews` : ''}. Opens every reason, with counts.`;
    renderRunning();
    renderStage();
  }

  /* checks running now: a line each; the model ids behind a toggle */
  const openRuns = new Set();
  function renderRunning() {
    const all = Object.entries(L.running ?? {}).filter(([, p]) => p);
    // A run whose process has gone is not a run. It is something that happened, and it belongs
    // in the notices rather than in a panel that measures progress -- a bar at 0/135 beside the
    // words "its process is gone" was one line contradicting itself.
    const runs = all.filter(([, p]) => p.alive !== false);
    const stopped = all.filter(([, p]) => p.alive === false);
    drawNotices(stopped);
    {
      const h = document.getElementById("run-h");
      if (h) h.textContent = "Running now";
    }
    $('run-note').innerHTML = runs.length ? `From each check's result file, as the ledger built ${agoSpan(L.generatedAt)} read it.` : '';
    /* Nothing running is the normal state, and a heading over a sentence saying so is a row of the
       page spent on no news: the heading goes with it. */
    const head = document.querySelector('.ovsub--run');
    if (head) head.hidden = !runs.length;
    $('runnow').hidden = !runs.length;
    if (!runs.length) { $('runnow').innerHTML = ''; return; }
    $('runnow').innerHTML = `<ul class="runs">${runs.map(([key, p]) => {
      const title = CHECK_NAMES[key] ?? key, short = CHECK_LIST.find((c) => c.key === key)?.short ?? key;
      const gone = p.alive === false;
      const pct = p.total ? Math.min(100, (100 * p.done) / p.total) : 0;
      const e = etaOf(p);
      const ids = idsOfRun(p), done = doneInRun(key, p);
      const opened = openRuns.has(key);
      // a run's own parts: open unless this visitor has closed them, so what it is doing is in sight
      const c = CHECK_LIST.find((x) => x.key === key) ?? { key, short, title, steps: [], unit: 'models' };
      const ssN = (c.steps ?? []).length, ssId = `run:${key}`, ssSeen = ssN > 0 && ssIsOpen(ssId);
      return `<li class="run${gone ? ' gone' : ''}">
        <span class="run__name" data-tip data-tiptext="${esc(title)}">${esc(short)}</span>${gone ? '<span class="run__stopped">stopped</span>' : ''}
        <span class="run__track" role="progressbar" aria-label="${esc(`${title}: ${p.done} of ${p.total ?? '?'}`)}" aria-valuemin="0" aria-valuemax="${esc(p.total ?? 0)}" aria-valuenow="${esc(p.done)}"><span style="width:${pct}%"></span></span>
        <span class="run__n">${esc(p.done)} / ${esc(p.total ?? '?')}</span>
        <span class="run__meta">
          <span>last write <b>${agoSpan(p.updatedAt)}</b></span>
          ${gone ? `<span>its process (pid ${esc(p.pid)}) is gone: it stopped without finishing, and the rest never reported</span>`
            : e ? `<span tabindex="0" data-tip data-tiptext="${esc(`An estimate from the pace so far: about ${fmtDur(e.per)} per model, ${p.total - p.done} to go.`)}">about <b>${fmtDur(e.left)}</b> left (estimate)</span>` : '<span>no time estimate yet</span>'}
          <span>started ${esc(clock(p.startedAt))}${p.commit ? ` at <code>${esc(p.commit)}</code>` : ''}</span>
          ${p.last ? `<span>latest <code>${esc(p.last)}</code></span>` : ''}
          ${p.totalIsEstimate ? `<span>the total is an estimate: ${esc(p.totalFrom)}</span>` : ''}
          ${ids.length ? `<button type="button" class="linkish" data-runids="${esc(key)}" aria-expanded="${opened}">${opened ? 'hide models' : `show models (${ids.length})`}</button>` : ''}
          ${ssN ? ssToggle(ssId, ssSeen ? 'hide what it is covering' : `what it is covering (${ssN})`, ssSeen) : ''}
        </span>
        ${ssSeen ? ssPanel(c, ssId, p) : ''}
        ${opened ? `<div class="run__ids"><div class="qids">${ids.map((id) => `<span class="mid${done.has(id) ? ' is-done' : ''}" title="${done.has(id) ? 'reported in this run' : 'not reported in this run yet'}">${esc(id)}</span>`).join('')}</div>
          <p class="run__meta" style="margin:6px 0 0">${done.size} reported in this run (dimmed), ${ids.length - done.size} still to go${p.args?.some((a) => a.startsWith('-')) ? `; flags <code>${esc(p.args.filter((a) => a.startsWith('-')).join(' '))}</code>` : ''}.</p></div>` : ''}
      </li>`;
    }).join('')}</ul>`;
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
      return `<div class="notice notice--stopped" data-notice="${esc(id)}"><span class="notice__what"><b>${esc(name)}</b> stopped after ${esc(far)}</span><span class="notice__why">its process (pid ${esc(p.pid ?? "?")}) is gone, so the rest never reported. Run it again when you are ready.</span><button type="button" class="notice__x" data-dismiss="${esc(id)}" aria-label="Dismiss">&times;</button></div>`;
    }).join('');
  }
  $('notices')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dismiss]');
    if (!b) return;
    dismissNotice(b.dataset.dismiss);
    b.closest('.notice')?.remove();
    const box = $('notices'); if (box && !box.querySelector('.notice')) box.hidden = true;
  });
  $('runnow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-runids]');
    if (!b) return;
    const k = b.dataset.runids;
    openRuns.has(k) ? openRuns.delete(k) : openRuns.add(k);
    renderRunning();
    $('runnow').querySelector(`[data-runids="${CSS.escape(k)}"]`)?.focus({ preventScroll: true });
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
  /** The per-check bars counted over some models only (a stage), from each model's gates. */
  function bucketCheckBars(models) {
    const list = CHECK_LIST.filter((c) => c.scope === 'model').map((c) => {
      const tally = { pass: 0, stale: 0, flag: 0, fail: 0, broke: 0, never: 0 };
      for (const m of models) { const k = m.gates?.[c.key]?.kind; tally[k == null ? 'pass' : GATE_TALLY[k] ?? 'never']++; }
      return { ...c, unit: 'models', total: models.length, tally, captured: c.captured, running: null, listed: 0, lastRun: null, kinds: null };
    });
    return releaseNotice() + checkBarsOf(list, false);
  }
  /** Where each model's latest review of a kind stands: fine or fixed (fresh), problem, stale, none. */
  const reviewState = (m, kind) => {
    const list = (m.reviews ?? []).filter((r) => r.kind === kind);
    if (!list.length) return 'none';
    const fresh = list.find((r) => !r.stale);
    if (!fresh) return 'stale';
    return fresh.verdict === 'problem' ? 'problem' : fresh.verdict === 'fixed' ? 'fixed' : 'fine';
  };
  const RV_SEGS = [['fine', 'fresh, fine', 'var(--k-pass)'], ['fixed', 'fresh, fixed', 'var(--st-conv)'], ['problem', 'found a problem', 'var(--k-fail)'], ['stale', 'stale', 'var(--k-stale)'], ['none', 'none yet', 'var(--k-never)']];
  function reviewBars(models) {
    return `<ul class="bd">${['visual', 'text'].map((kind) => {
      const t = Object.fromEntries(RV_SEGS.map(([k]) => [k, 0]));
      for (const m of models) t[reviewState(m, kind)]++;
      const segs = RV_SEGS.map(([k, label, c]) => ({ label, n: t[k], c }));
      const ok = t.fine + t.fixed;
      const pills = segs.filter((x) => x.n).map((x) => `<span class="bdpill"><i style="background:${x.c}"></i>${esc(x.label)} <b>${x.n}</b></span>`).join('');
      return `<li><span class="bd__name">${esc(cap(kind))} review</span>${segBar(segs, models.length)}<b class="bd__n">${ok}/${models.length}</b>
        <span class="bd__under"><span class="bd__note" style="font-style:normal">${ok} of ${models.length} with a fresh ${kind} review that is not “problem”</span>${pills}</span></li>`;
    }).join('')}</ul>`;
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
  /** The folded bar's one line: how many models are in the stage, and what is wrong across their checks. */
  function stageBrief(key, b, models) {
    const words = { stale: 'on older code', flag: 'flagged', fail: 'failed', broke: "didn't run", never: 'not run yet' };
    const n = {};
    for (const m of models) for (const [k] of COLS) { const kd = markKind(m.checks[k])[0]; if (words[kd]) n[kd] = (n[kd] ?? 0) + 1; }
    const bits = Object.entries(words).filter(([k]) => n[k]).map(([k, w]) => `${n[k]} ${w}`);
    return [`${b.count} ${(STEP_SHORT[key] ?? b.label).toLowerCase()}`, ...bits].join(' · ');
  }
  function renderStage() {
    const buckets = L.counts.buckets ?? [];
    const key = stage, i = buckets.findIndex((x) => x.key === key), b = buckets[i];
    const panel = $('ov-stage');
    if (!b) { panel.innerHTML = ''; return; }
    panel.setAttribute('aria-labelledby', `stage-tab-${i}`);
    /* NEITHER OF THESE BELONGS TO A STAGE.
       "All 135, passing" is every model whatever stage it is in, and the site's checks are counted
       in pages and gate no model at all — the page says so in its own heading. They were folded
       away with whichever stage was open, so the same two blocks appeared under To check, under
       Awaiting review and under Approved, identical every time, and vanished when the stage they
       did not belong to was collapsed. They now stand on their own, outside the fold, once.
       The one case the "All N" line is still dropped: when a single stage holds every model, it
       would repeat that stage's own bars line for line. */
    $('checkbars').hidden = b.count === L.models.length && key === 'to check';
    $('sitebars').hidden = false;
    panel.style.setProperty('--stage-c', STAGE_C[i] ?? 'var(--border-strong)');
    const models = L.models.filter((m) => m.status === key);
    const holds = holdsIn(models);
    const holdLine = holds.length
      ? `<p class="stagebox__holds"><b>What holds them</b> (a model can have several): ${holds.slice(0, 4).map((x) => `${esc(chipLabel(x.r.key))} <b>${x.n}</b>`).join(', ')}${holds.length > 4 ? `, and ${holds.length - 4} more` : ''}. <button type="button" class="linkish" data-open-blk>Every reason</button></p>` : '';
    let body = '';
    if (!models.length) body = `<p class="stagebox__holds">${{ 'to check': 'None: no model is held by a check.', checked: 'None yet: no model has every automated check clear on its current code.', approved: 'None yet: no model has every check clear plus a fresh visual and a fresh text review.' }[key] ?? 'None.'}</p>`;
    else if (key === 'to check') body = `${holdLine}<div class="ckbars"><h3>Checks, over these ${models.length} <span class="muted" style="text-transform:none;letter-spacing:0">· in gate order; each needs every one clear on its current code</span></h3>${bucketCheckBars(models)}</div>`;
    else if (key === 'checked') body = `${holdLine}<div class="ckbars"><h3>Reviews, over these ${models.length} <span class="muted" style="text-transform:none;letter-spacing:0">· each needs a fresh visual and a fresh text review, neither “problem”</span></h3>${reviewBars(models)}</div>`;
    else if (key === 'approved') body = models.length ? `<p class="stagebox__holds">Approved:</p>${modelChips(models)}` : '<p class="stagebox__holds">None yet: no model has every check clear plus a fresh visual and a fresh text review.</p>';
    else body = models.length ? `${holdLine}${modelChips(models)}` : '<p class="stagebox__holds">None.</p>';
    const shown = blk === `status:${key}`;
    const op = stageIsOpen(key);
    panel.classList.toggle('is-folded', !op);
    /* the title starts at the row's left edge; the two controls sit together at its right end */
    panel.innerHTML = `<div class="stagebox__head">
      <div class="stagebox__ttl"><h3 id="stage-h">${esc(STEP_SHORT[key] ?? b.label)}<span class="n">${b.count}</span></h3>
        <p class="stagebox__means">${esc(cap(b.means ?? ''))}.</p>
        <p class="stagebox__brief">${esc(stageBrief(key, b, models))}</p></div>
      <div class="stagebox__acts">${b.count ? `<button type="button" class="btn bdhead__all" data-show="${esc(`status:${key}`)}" style="padding:5px 12px;font-size:12.5px">${shown ? 'Shown in the table below' : `Show ${b.count === 1 ? 'it' : `these ${b.count}`} in the table`}</button>` : ''}</div>
      <button type="button" class="stagetog" data-stage-tog aria-expanded="${op}" aria-controls="stage-body" aria-label="${esc(op ? `Collapse ${STEP_SHORT[key] ?? b.label}` : `Expand ${STEP_SHORT[key] ?? b.label}`)}">${ssChevron}</button></div>
      <div id="stage-body" class="stagebox__body"${op ? '' : ' hidden'}>${body}</div>`;
  }
  $('ov-stage').addEventListener('click', (e) => {
    if (!L) return;
    const tog = e.target.closest('[data-stage-tog]');
    if (tog) {
      stageOpen[stage] = tog.getAttribute('aria-expanded') !== 'true';
      stageSave();
      renderStage();
      $('ov-stage').querySelector('[data-stage-tog]')?.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-open-blk]')) { openBlockers(e.target.closest('[data-open-blk]')); return; }
    // show this stage's models in the table: sets the filter, never unsets it (the chip's × does that)
    const b = e.target.closest('[data-show]');
    if (b) showOnly(b.dataset.show, 'ov-stage', { toggle: false });
  });

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
  $('blk-dialog').addEventListener('click', (e) => { if (e.target === $('blk-dialog')) $('blk-dialog').close(); });
  $('blk-dialog').addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('blk-dialog').open) { e.preventDefault(); $('blk-dialog').close(); } });
  // focus goes back to whatever opened it, unless a blocker was picked: then it goes to the table's filter chip
  $('blk-dialog').addEventListener('close', () => { if (!blkKeepFocus) (blkFrom?.isConnected ? blkFrom : $('blk-btn')).focus({ preventScroll: true }); blkKeepFocus = false; });

  /** Pressed states of everything that sets the table's filter, without redrawing it. */
  function syncPressed() {
    document.querySelectorAll('[data-blk]').forEach((b) => b.setAttribute('aria-pressed', String(blk === b.dataset.blk)));
    if (L) renderStage(); // its "show these in the table" button says whether they are
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
  $('stats').addEventListener('click', (e) => { const b = e.target.closest('[data-stage]'); if (b && L) selectStage(b.dataset.stage, true); });
  $('stats').addEventListener('keydown', (e) => {
    const tabs = [...$('stats').querySelectorAll('[role="tab"]')];
    const at = tabs.indexOf(document.activeElement);
    if (at < 0 || !L) return;
    const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to == null) return;
    e.preventDefault();
    selectStage(tabs[(to + tabs.length) % tabs.length].dataset.stage, true);
  });
  for (const id of ['blockers', 'checkbars']) $(id).addEventListener('click', (e) => {
    const b = e.target.closest('[data-blk]');
    if (!b || !L) return;
    // a blocker in the dialog: close it, then filter; focus goes to the filter chip, not back to the opener
    if (id === 'blockers' && $('blk-dialog').open) { blkKeepFocus = true; $('blk-dialog').close(); }
    showOnly(b.dataset.blk, id);
  });

  /* ---------- notes: collapsed to a badge; each closable; back when its content changes ---------- */
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
    btn.hidden = !NOTES.length;
    btn.innerHTML = `<b>${shown.length}</b> note${shown.length === 1 ? '' : 's'}${hid ? ` <small>· ${hid} dismissed</small>` : ''}`;
    btn.setAttribute('aria-expanded', String(notesOpen));
    btn.classList.toggle('is-quiet', !shown.length);
    const pop = $('notes-pop');
    pop.hidden = !notesOpen || !NOTES.length;
    pop.innerHTML = (shown.length
      ? shown.map((n) => `<div class="note"><div>${n.html}</div><button type="button" class="note__x" data-dismiss="${esc(n.key)}" aria-label="Dismiss this note">${XICON}</button></div>`).join('')
      : '<p class="muted" style="margin:4px 2px">Every note is dismissed.</p>')
      + (hid ? `<p style="margin:8px 2px 2px"><button type="button" class="linkish" data-undismiss>Show the ${hid} dismissed note${hid === 1 ? '' : 's'}</button> <span class="muted" style="font-size:12px">A dismissed note comes back by itself if what it says changes.</span></p>` : '');
  }
  $('notes-btn').addEventListener('click', (e) => { e.stopPropagation(); notesOpen = !notesOpen; renderNotes(); });
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
    tip.innerHTML = text.innerHTML;
    tip.hidden = false;
    placeTip();
  }
  function placeTip() {
    if (!tipFor || !tipFor.isConnected) { hideTip(); return; }
    const a = tipFor.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 10;
    const below = a.bottom + gap + h <= innerHeight - 8 || a.top - gap - h < 8;
    const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), innerWidth - w - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${below ? a.bottom + gap : a.top - gap - h}px`;
    tip.dataset.side = below ? 'below' : 'above';
    tip.style.setProperty('--arrow-x', `${Math.min(Math.max(12, a.left + a.width / 2 - left), w - 12)}px`);
  }
  function hideTip() {
    tipFor?.setAttribute('aria-expanded', 'false');
    tipFor = null; tipPinned = false; tip.hidden = true;
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

  /** The latest review of a kind, as a chip: fresh verdict, stale, or none. */
  const reviewChip = (m, kind) => {
    const list = (m.reviews ?? []).filter((r) => r.kind === kind);
    if (!list.length) return `<span class="chip s-none">${kind}: none</span>`;
    const fresh = list.find((r) => !r.stale);
    if (!fresh) return `<span class="chip s-warn" title="${esc(list[0].staleWhy)}">${kind}: stale</span>`;
    const v = fresh.verdict ?? 'marked';
    const cls = v === 'problem' ? 's-bad' : v === 'fixed' ? 's-conv' : 's-chk';
    return `<span class="chip ${cls}" title="${esc(fresh.source === 'log' ? `${fresh.reviewer}, ${fresh.reviewedAt}` : `commit ${fresh.commit}: ${fresh.subject}`)}">${kind}: ${esc(v)}</span>`;
  };

  function render() {
    if (!L) return;
    syncChecks(L.checkList);
    const c = L.counts, n = c.models;
    const by = L.build?.by ? ` by <code>${esc(L.build.by)}</code>${L.build.reason ? ` (${esc(L.build.reason)})` : ''}` : '';
    const built = L.generatedAt ? new Date(L.generatedAt).toLocaleString() : 'an unknown time';
    const full = `Built ${built}${L.build?.by ? ` by ${L.build.by}${L.build.reason ? ` (${L.build.reason})` : ''}` : ''} at HEAD ${L.head}. Every status below is read from git, the model files and the captured checks.`;
    // short while it is fresh; the age is the fact, so it is never rounded away
    $('meta').innerHTML = `<span tabindex="0" data-tip data-tiptext="${esc(full)}">HEAD <code>${esc(L.head)}</code></span><span class="sep">·</span><span>built ${agoSpan(L.generatedAt)}</span>`;

    const notes = [];
    for (const [name, src] of Object.entries(L.sources.checks)) if (/never been captured/.test(src)) notes.push({ key: `never:${name}`, col: name, html: `<b>${esc(CHECK_NAMES[name] ?? name)}</b> has no result file: its column says “not run yet” for every model because no run was captured, not because models failed. Capture one with <code>npm run capture -- ${esc(name)}</code>.` });
    for (const note of L.notes ?? []) notes.push({ key: `ledger:${sig(note)}`, html: esc(note) });
    NOTES = notes;
    $('notices').innerHTML = '';
    renderNotes();

    // short headers: each names its check in the tooltip and opens its definition
    const theadHtml = `<th class="model" scope="col">Model</th><th class="st" scope="col">Status</th>${COLS.map(([k, label]) => {
      const p = L.running?.[k];
      const note = NOTES.find((n) => n.col === k); // why the column reads as it does, even after the note is dismissed
      const title = CHECK_NAMES[k] ?? k;
      return `<th class="c" scope="col"><button type="button" class="colh" data-def="${esc(k)}" data-tip data-tiptext="${esc(`${title}. Click for its definition.`)}" aria-label="${esc(`${title}: open its definition`)}">${esc(label)}</button>${note ? helpIcon(`col-${k}`, `About the ${label} column`, note.html) : ''}${p ? `<span class="hrun${p.alive === false ? ' is-gone' : ''}" role="img" aria-label="${esc(`${title} ${p.alive === false ? 'stopped without finishing' : 'is running'}: ${p.done} of ${p.total ?? '?'}`)}" data-tip data-tiptext="${esc(`${title} ${p.alive === false ? 'stopped without finishing' : 'is running'}: ${p.done} of ${p.total ?? '?'} done. “Running now”, above, has the details.`)}">${esc(p.done)}</span>` : ''}</th>`;
    }).join('')}<th class="rvw c" scope="col"><span class="colv" data-tip data-tiptext="Reviews: V is the visual review, T the text review">Reviews</span></th><th class="last" scope="col">Last commit</th><th class="num ncom" scope="col">Commits</th>`;
    // rewritten only when it changes, so an open tooltip is not pulled out from under the reader
    if ($('thead').dataset.html !== theadHtml) { $('thead').dataset.html = theadHtml; $('thead').innerHTML = theadHtml; stickyOffsets(); }

    // an old ledger has no blockers: a filter set by one would hide every row without saying why
    if (!Array.isArray(c.blockers) && !String(blk).startsWith('status:')) blk = null;
    renderOverview();
    renderRules();
    renderCheckBars();
    renderMarkLegend();

    // a group or tag chosen earlier that no longer exists would hide everything without saying why
    if (group !== 'all' && !(L.groups ?? []).some((g) => g.key === group)) group = 'all';
    for (const t of [...tags]) if (!(L.tags ?? []).includes(t)) tags.delete(t);
    renderFilterChips();
    renderRows();
    renderReadiness();
  }

  /**
   * The gallery's filter bar, filled in: status tabs, the Tags button, group and tag chips. Each
   * count is what the list would hold with that choice, given every other filter and the search.
   */
  const HASH = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>';
  const XICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
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
  let stickTop = 0, headH = 0, wasStuck = null, wasEdge = null, headOff = false;
  /** How far the table's header has tucked up: nothing while it is out, its own height while it is away.
      The group rows and any open row take the same number off, so the stack closes up behind it. */
  const applyHeadOff = () => document.documentElement.style.setProperty('--head-off', headOff ? `${-headH}px` : '0px');
  function stickyOffsets() {
    const bar = $('filters');
    stickTop = parseFloat(getComputedStyle(bar).top) || 0;
    document.documentElement.style.setProperty('--stick-head', `${Math.round(stickTop + bar.offsetHeight)}px`);
    // the thead is hidden on a phone, where each model is a card: measuring it gives 0 there by itself
    headH = Math.round($('thead').offsetHeight);
    document.documentElement.style.setProperty('--head-h', `${headH}px`);
    applyHeadOff();
    const grow = $('rows').querySelector('tr.grow > th');
    document.documentElement.style.setProperty('--grow-h', `${grow ? Math.round(grow.offsetHeight) : 0}px`);
    onScroll();
  }
  /* ---------- the table's header gets out of the way ----------
     Reading down the table you already know what the columns are, and ten vertical words are a band in
     the way. So scrolling down tucks the header up behind the filter bar -- which stays put, and is
     above it in the stack, so it really does go behind it -- and scrolling up slides it back out. It
     stays out while the table's top is still on screen, while a dialog is open, and while anything in
     the header or the filter bar has focus, so a keyboard reaching a column button brings it back. A
     run of travel in one direction has to build up before it moves either way, so a jittery wheel or a
     thumb resting on the glass does nothing. */
  const HIDE_RUN = 26, SHOW_RUN = 12;
  let lastY = -1, run = 0;
  const dialogOpen = () => Boolean($('rules-dialog').open || $('blk-dialog').open || $('cl-dialog').open);
  function setHeadOff(off) {
    if (off === headOff) return;
    headOff = off;
    $('tbl').classList.toggle('head-off', off);
    applyHeadOff();
  }
  const revealHead = () => { run = 0; setHeadOff(false); };
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
    // the header can only tuck away once it is pinned: before that it is where it belongs, in the table
    const pinned = stuck && headH > 0 && $('rows').getBoundingClientRect().top <= stickTop + bar.offsetHeight + headH;
    if (!pinned || dialogOpen() || bar.contains(document.activeElement) || $('tbl').contains(document.activeElement)) revealHead();
    else if (dy) {
      run = (run > 0) === (dy > 0) ? run + dy : dy;   // a run is travel in one direction, restarted by a turn
      if (run > HIDE_RUN) setHeadOff(true);
      else if (run < -SHOW_RUN) setHeadOff(false);
    }
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
  let showBits = [];   // the bracketed aside after the heading, built as the counts become known

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
  const runningOn = (m) => COLS.map(([k]) => k).filter((k) => { const r = L.running?.[k]; return r && r.alive !== false && r.last === m.id; });
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
  function groupRow(g, opened) {
    const n = g.all.length;
    const count = (st) => g.all.filter((m) => m.status === st).length;
    const ap = count('approved'), ch = count('checked'), cv = count('to check');
    const seg = (x, c, w) => x ? `<i style="flex-grow:${x};background:${c}" title="${esc(`${x} ${w}`)}"></i>` : '';
    // the problems inside, per check: shown on the row whether it is open or folded
    /* The chips count the whole group, which is the honest number, but the rows under them are whatever
       the filter left. When those differ the chip said "1" over a list with nothing wrong in it, which
       reads as a bug. It now says how many of them the filter is hiding, and clicking it shows exactly
       those models: the filter is cleared and a chip above the table says what is on screen. */
    const hid = (n2, shown) => (n2 > shown ? ` <span class="chip__aside">· ${n2 - shown} hidden by filter</span>` : '');
    const ofGroup = 'Counted over the whole group; the list below is filtered.';
    const probs = COLS.map(([k, label]) => {
      const bad = g.all.filter((m) => problemsOf(m).includes(k)).length;
      const shown = g.models.filter((m) => problemsOf(m).includes(k)).length;
      return bad ? `<button type="button" class="chip s-bad chip--act" data-show-bad="${esc(k)}" data-tip data-tiptext="${esc(`${CHECK_NAMES[k]}: ${bad} model${bad === 1 ? '' : 's'} in this group failed or flagged. ${ofGroup} Click to show exactly those models.`)}">✗ ${esc(label)} ${bad}${hid(bad, shown)}</button>` : '';
    }).join('') + COLS.map(([k, label]) => {
      const nr = g.all.filter((m) => brokeOf(m).includes(k)).length;
      const shown = g.models.filter((m) => brokeOf(m).includes(k)).length;
      return nr ? `<span class="chip s-conv" data-tip data-tiptext="${esc(`${CHECK_NAMES[k]}: the test crashed on ${nr} model${nr === 1 ? '' : 's'} in this group, so ${nr === 1 ? 'it was' : 'they were'} never judged. ${ofGroup}`)}">${esc(label)} didn't run ${nr}${hid(nr, shown)}</span>` : '';
    }).join('') + COLS.map(([k, label]) => {
      const on = g.all.filter((m) => runningOn(m).includes(k)).length;
      return on ? `<span class="chip s-chk" data-tip data-tiptext="${esc(`${CHECK_NAMES[k]} is running on a model in this group now`)}">running ${esc(label)}</span>` : '';
    }).join('');
    const shownNote = g.models.length !== n ? `, ${g.models.length} match` : '';
    return `<tr class="grow" style="--gc:${gcFor(g.key)}"><th colspan="${colCount()}" scope="rowgroup"><div class="grow__in">
      <button type="button" class="grow__btn" data-grp="${esc(g.key)}" aria-expanded="${opened}">${CHEVRON}${esc(g.label)} <span class="n">· ${n}${shownNote}</span></button>${runBtn('all', idsOfGroup(g.key), `Run every check on ${g.label}`)}
      <span class="grow__bar" role="img" aria-label="${esc(`${ap} approved, ${ch} awaiting review, ${cv} to check, of ${n}`)}">${seg(ap, 'var(--st-ok)', 'approved')}${seg(ch, 'var(--st-chk)', 'awaiting review')}${seg(cv, 'var(--st-conv)', 'to check')}</span>
      <span class="grow__meta">${ap} approved · ${ch} awaiting review · ${cv} to check</span>
      ${probs ? `<span class="grow__probs">${probs}</span>` : ''}</div></th></tr>`;
  }
  /**
   * A run button for part of the table.
   *
   * Everything used to run over all 135 models or nothing, which is the wrong size for most of what
   * you actually want: one model has changed, or one group, or one check is red and the rest are
   * fine. `what` is a check key or 'all'; `ids` are the models it covers.
   */
  function runBtn(what, ids, label, cls = 'rowrun') {
    if (!RUN_OK) return '';
    const key = `${what}:${ids.join(',')}`;
    if (PENDING && PENDING.key === key) return `<span class="${cls} ckrun--wait" role="status" aria-label="Starting"><i></i></span>`;
    const busy = !!RUN_NOW.running;
    return `<button type="button" class="${cls}" data-run-what="${esc(what)}" data-run-ids="${esc(ids.join(','))}" title="${esc(busy ? 'Something is already running' : label)}" aria-label="${esc(label)}"${busy ? ' disabled' : ''}>&#9654;</button>`;
  }
  /** Every model id in a group, in the order the table shows them. */
  const idsOfGroup = (key) => (L?.models ?? []).filter((m) => (m.group ?? '') === key).map((m) => m.id);

  function modelRow(m, flat) {
    const last = m.commits.find((x) => x.matchedBy.includes('diff')) ?? m.commits[0];
    const glabel = m.groupLabel ?? m.group ?? '';
    const short = glabel.split(/\s*[&,]\s*|\s+/)[0];
    let sd = 0; for (const ch of m.id) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0; // the row's own place in the sweep
    return `<tr class="row${flash.has(m.id) ? ' flash' : ''}" style="--gc:${gcFor(m.group ?? '')};--sweep-d:-${sd % 9}s" tabindex="0" data-id="${esc(m.id)}" aria-expanded="${open.has(m.id)}">
        <td class="model"><div class="mt">${runBtn('all', [m.id], `Run every check on ${m.title}`)}<b data-tip data-tiptext="${esc(`${m.title} (${m.id}), group: ${glabel || 'none'}`)}">${esc(m.title)}</b><code>${esc(m.id)}</code>${flat && glabel ? `<span class="gchip" data-tip data-tiptext="${esc(`Group: ${glabel}`)}" aria-label="${esc(`group: ${glabel}`)}">${esc(short)}</span>` : ''}</div></td>
        <td class="st">${chipFor(m.status, justApproved.has(m.id))}</td>
        ${COLS.map(([k, label]) => `<td class="c" data-label="${esc(label)}">${checkMark(k, m)}${runBtn(k, [m.id], `Run ${label} on ${m.title}`, 'cellrun')}</td>`).join('')}
        <td class="rvw c" data-label="Reviews"><span class="rv">${reviewMark(m, 'visual')}${reviewMark(m, 'text')}</span></td>
        <td class="num last">${last ? `<span data-tip data-tiptext="${esc(`${new Date(last.date).toLocaleString()} · ${last.hash}: ${last.subject}`)}" data-ago-short="${esc(last.date)}">${esc(fmtAgeShort(age(last.date)))}</span>` : '<span class="muted">none found</span>'}</td>
        <td class="num ncom">${m.commits.length}</td></tr>`;
  }
  $('rows').addEventListener('click', (e) => {
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
  $('showing').addEventListener('click', (e) => { if (e.target.closest('[data-expand-all]')) setAll(true); });

  function renderRows() {
    ensureBad();
    const f = view();
    const matching = L.models.filter((m) => passes(m, f));
    const total = L.models.length;
    const hidden = total - matching.length;
    const onScreen = Math.min(limit, matching.length);
    const glabel = (L.groups ?? []).find((g) => g.key === group)?.label ?? group;
    const why = [blk ? `“${BLK.get(blk)?.chip ?? chipLabel(blk)}”` : '', filter !== 'all' ? `status “${filter}”` : '', group !== 'all' ? `group “${glabel}”` : '', ...[...tags].map((t) => `#${t}`), query.trim() ? `search “${query.trim()}”` : ''].filter(Boolean).join(', ');
    const screen = '';
    /* One aside after the heading, in brackets and never bold: what is on screen, then the hint. It is
       built in pieces so the counts that are only known later can join the same sentence. */
    showBits = hidden
      ? [`${matching.length} of ${total} match, ${hidden} hidden by ${esc(why)}`, `<button type="button" class="linkish" id="clear">show all ${total}</button>`]
      : [`${total} match`];

    // Sections per group, in the ledger's group order. A filter that leaves only a few models drops
    // them for a flat list with a group mark on each row. A folded group renders no rows, and the
    // lazy loading counts only rows that are drawn.
    const filtering = blk !== null || filter !== 'all' || group !== 'all' || tags.size > 0 || query.trim() !== '';
    const flat = filtering && matching.length <= FLAT_BELOW;
    const sections = flat ? [{ key: null, models: matching }] : groupSections(matching);
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
        html += modelRow(m, flat) + (open.has(m.id) ? `<tr class="detail" style="--gc:${gcFor(m.group ?? '')}"><td colspan="${colCount()}">${detail(m)}</td></tr>` : '');
      }
    }
    $('rows').innerHTML = html || `<tr class="empty"><td colspan="${colCount()}" class="muted">No model matches.${hidden ? ' Every model is hidden by the filters above.' : ''}</td></tr>`;
    // say what the folding hides, with one click to see it
    if (folded) showBits.push(`${folded} in ${foldedGroups} folded group${foldedGroups === 1 ? '' : 's'}`);
    if (cut) showBits.push(`${drawn} drawn, ${cut} more as you scroll`);
    // the hint is the first thing to go when the screen is narrow
    $('showing').innerHTML = `(${showBits.join(' \u00b7 ')}<span class="showing__hint"> \u00b7 click a row for its commits, checks and reviews</span>)`;
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
      tr.addEventListener('click', toggle);
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

    const rv = m.reviews ?? [];
    parts.push(`<h3>Reviews (${rv.length})</h3>` + (rv.length ? `<ul class="commits">${rv.map((r) => {
      const v = r.verdict ? `<span class="chip ${r.verdict === 'problem' ? 's-bad' : r.verdict === 'fixed' ? 's-conv' : 's-chk'}">${esc(r.verdict)}</span>` : '<span class="chip s-none" title="a commit marker carries no verdict">no verdict</span>';
      const who = r.source === 'log' ? `${esc(r.reviewer)} · <code>${esc(r.file)}</code>` : `commit marker: ${esc(r.subject)}`;
      return `<li><span class="chip s-none">${esc(r.kind)}</span> ${v} ${r.stale ? `<span class="chip s-warn">stale</span>` : ''}
        <span class="muted num">${esc(String(r.reviewedAt).slice(0, 16).replace('T', ' '))}</span> read <code>${esc(String(r.commit).slice(0, 7))}</code> · ${who}
        ${r.stale ? `<br><span class="muted" style="font-size:13px">Stale: ${esc(r.staleWhy)}.</span>` : ''}
        ${(r.ruledBy ?? []).map((x) => `<br><span class="chip s-conv" title="${esc(`${x.reason} Evidence: ${x.evidence}`)}">ruling</span> <span class="muted" style="font-size:13px">Not staled by <code>${esc(x.commit)}</code>: ${esc(x.title)} (scripts/fingerprint.mjs, RULINGS). ${esc(x.reason)} Evidence: ${esc(x.evidence)}</span>`).join('')}</li>`;
    }).join('')}</ul>` : '<p class="muted">No review recorded, in docs/reviews/ or as a commit marker.</p>'));

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
          return `Release checklist <small>· ${cl.total - stuck.length} of ${cl.total} done${bits.length ? `, ${bits.join(', ')}` : ''}</small>`;
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
        const when = ran ? ` <span class="clwhen">run ${ran[1]}</span>` : '';
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
  const CK_SEGS = [['pass', 'pass', 'var(--k-pass)', null], ['stale', 'passed on older code', 'var(--k-stale)', 'stale-pass'], ['flag', 'flagged, needs a person', 'var(--k-flag)', 'flagged'],
    ['fail', 'failed', 'var(--k-fail)', 'failed'], ['broke', "didn't run (test crashed)", 'var(--k-broke)', 'broke'], ['never', 'not run yet', 'var(--k-never)', 'never']];
  function checkBarsOf(list, interactive = true) {
    return `<ul class="bd">${list.map((c) => {
      const t = c.tally ?? { pass: 0, stale: 0, fail: 0, never: c.total ?? 0 };
      const total = c.total ?? 0;
      const segs = CK_SEGS.map(([k, label, col, kind]) => ({ label, n: t[k] ?? 0, c: col, blk: c.scope === 'model' && kind ? `${c.key}:${kind}` : null }));
      const run = c.running;
      const ran = total - (t.never ?? 0);
      const unit = c.unit === 'pages' ? 'pages' : 'models';
      // a site check's pages by kind, public first, every group saying its own pass count — a group
      // that passes whole said only its size before ("145 public (9 pass) · 136 embeds"), which read
      // as if the embeds were the failing ones: "9 of 145 public · 136 of 136 embeds · 135 of 135 redirects"
      const KIND_ORDER = ['public', 'embeds', 'redirects'];
      const kinds = c.kinds ? KIND_ORDER.filter((k) => c.kinds[k]).map((k) => `${c.kinds[k].pass} of ${c.kinds[k].pages} ${k}`).join(' · ') : '';
      // no results of this check's own, but the committed snapshot has its verdicts: one labelled
      // pill beside the bar, reading as the last release's state. The bar itself does not move.
      const relc = !c.captured ? L.release?.checks?.[c.key] : null;
      const relPill = relc && relc.reported ? `<span class="bdpill bdpill--rel" data-tip data-tiptext="${esc(`From ${L.release.file}, the committed state at commit ${L.release.head}${L.release.takenAt ? `, taken ${new Date(L.release.takenAt).toLocaleString()}` : ''}. ${relc.pass} of ${relc.of} models passed ${c.short} then${relc.unknown ? `, and ${relc.unknown} model(s) here were not in it` : ''}${relc.ruleChanged ? `; judged under rule v${relc.ruleVersion}, and the rule is v${relc.ruleNow} now` : ''}. Nothing has been captured on this machine, so the bar above stays "not run yet".`)}">at the last release <b>${relc.pass}/${relc.of}</b>${relc.ruleChanged ? ' · older rule' : ''}</span>` : '';
      const status = !c.captured && !run ? `not run yet (0 of ${total} ${unit})` : `${t.pass} of ${total} ${unit} pass${kinds ? ` (${kinds})` : ''}${c.listed ? ` · ${c.listed} of them with listed findings (waived or the model's own text, not failed)` : ''}${c.lastRun?.finishedAt ? ` · last run ${new Date(c.lastRun.finishedAt).toLocaleString()}${c.lastRun.commit ? ` at ${c.lastRun.commit}` : ''}` : ''}`;
      const runChip = run ? `<span class="chip ${run.alive === false ? 's-bad' : 's-chk'}">${run.alive === false ? 'stopped' : 'running'} ${esc(run.done)} of ${run.total ?? '?'}</span>` : '';
      // a segment a blocker covers is a button: it filters the table to those models, as the blocker does
      const pills = segs.filter((x) => x.n).map((x) => (interactive && x.blk && BLK.has(x.blk)
        ? `<button type="button" class="pillbtn" data-blk="${esc(x.blk)}" aria-pressed="${blk === x.blk}" data-tip data-tiptext="${esc(`${c.short}: ${x.n} ${x.label}. Click to show only these in the table.`)}"><i class="sw" style="background:${x.c};width:8px;height:8px;border-radius:50%"></i>${esc(x.label)} <b>${x.n}</b></button>`
        : `<span class="bdpill"><i style="background:${x.c}"></i>${esc(x.label)} <b>${x.n}</b></span>`)).join('');
      const bar = segBar(segs, total).replace('class="bdbar"', `class="bdbar${run && run.alive !== false ? ' is-running' : ''}"`);
      // what the check covers, part by part: closed by default, opened one bar at a time. Its counts
      // are over every result the check's file holds, which a bar drawn over one stage's models is
      // not, so the panel's footer says exactly what it counted.
      const nSteps = (c.steps ?? []).length;
      const ssId = `bar:${c.key}`;
      const ssShown = nSteps > 0;
      const ssOpened = ssShown && ssIsOpen(ssId);
      const ssBtn = ssShown ? ssToggle(ssId, ssOpened ? 'hide what it covers' : `what it covers (${nSteps})`, ssOpened) : '';
      // the same panel "Running now" draws, off the same record: while this check runs it says so
      // here too, and when the run ends the counts it left stay
      const ssRun = L.running?.[c.key] ?? null;
      return `<li><span class="ckhead">${RUN_OK ? runControl(c) : ''}<button type="button" class="ckname" data-def="${esc(c.key)}" data-tip data-tiptext="${esc(`${c.title}. Click for its definition.`)}">${esc(c.short)}</button></span>${bar}<b class="bd__n" aria-label="${esc(status)}">${t.pass}/${total}</b>
        <span class="bd__under">${runChip}<span class="bd__note" style="font-style:normal">${esc(status)}${c.captured ? `, ${ran} reported` : ''}</span>${pills}${relPill}${ssBtn}</span>${ssOpened ? ssPanel(c, ssId, ssRun) : ''}</li>`;
    }).join('')}</ul>`;
  }
  function renderCheckBars() {
    const models = CHECK_LIST.filter((c) => c.scope === 'model');
    const site = CHECK_LIST.filter((c) => c.scope === 'site');
    const n = L.models.length;
    // a ledger from before the registry has no tallies: say so rather than draw empty bars as if nothing ran
    if (!L.checkList) { $('checkbars').innerHTML = '<p class="muted">This ledger was built before it listed its checks; the bars appear on the next build.</p>'; return; }
    // over every model, one line: the bars are in the selected stage's panel, over its models only.
    // Each count's full split (older code, flagged, failed, didn't run, not run yet) is in its tooltip.
    const splitOf = (c) => CK_SEGS.filter(([k]) => c.tally?.[k]).map(([k, label]) => `${c.tally[k]} ${label}`).join(', ');
    $('checkbars').innerHTML = `<p class="allline"><span class="label">All ${n}, passing</span>${models.map((c) => `<span tabindex="0" data-tip data-tiptext="${esc(`${c.title}, over all ${n} models: ${splitOf(c)}.`)}">${esc(c.short.toLowerCase())} <b>${c.tally?.pass ?? 0}</b></span>`).join('<span class="allline__sep" aria-hidden="true">·</span>')}</p>`;
    $('sitebars').innerHTML = (site.length ? `<h3>Site <span class="muted" style="text-transform:none;letter-spacing:0">· counted in pages, not a gate on any model</span></h3>${checkBarsOf(site)}` : '');
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
      <h3>The three states</h3>
      <p class="muted" style="font-size:14px">The sentence and the three arrows at the top. Every model is in exactly one of these. The arrows are tabs: one is always selected (the last one you picked, or else the first with models in it), and the panel under them shows that stage’s detail: its check bars, its review bars or its models. The panel’s button shows those models in the table; the filter chip’s × shows every model again.</p>
      <dl class="defs">
        ${['approved', 'checked', 'to check'].map((k) => B(k)).filter(Boolean).map((b) => `<dt>${esc(b.label)} ${n(b.count)}</dt>${dd(`${esc(b.means ?? '')}.`)}`).join('')}
        <dt id="def-sum">The numbers add up ${n(c.balance?.ok ? '✓' : '✗')}</dt>
        ${dd(`${buckets.map((b) => `${n(b.count)} ${esc(b.label.toLowerCase())}`).join(' + ')} = ${n(sum)}, and there are ${n(c.models)} models. <code>scripts/ledger.mjs</code> fails the build if these differ, if a first-reason split below does not add up, or if what holds a model back does not match its state.${c.balance?.problems?.length ? ` Now: <b>${c.balance.problems.map(esc).join('; ')}</b>.` : ''}`)}
      </dl>
      <h3>What’s holding models back</h3>
      <p class="muted" style="font-size:14px">The list behind the <b>What’s holding models back</b> button at the top. Each row counts the models one reason holds back, and clicking it shows exactly those models in the table. The rows <b>overlap</b>: a model held by two checks is counted under both, so they do not add up to the model count. “Held by this alone” counts the models with no other reason, the ones that move on once it is fixed. Review rows count only models whose every check is clear. “Passed on older code” is one row for all checks, with the count per check in it; the check bars below split it per check. Rows are largest first, with reviews last.</p>
      <dl class="defs">
        ${(s.holdKinds ?? []).map((k) => `<dt>${esc(cap(k.label))}</dt>${dd(`${esc(k.means)}.${k.key === 'broke' ? ' A crash says nothing about the model, so it is never counted as failed: not in the bars, not in the marks, not in the counts.' : ''}`)}`).join('')}
        ${(s.reviewHolds ?? []).map((k) => `<dt>Review ${esc(k.label)}</dt>${dd(`${esc(k.means)}.`)}`).join('')}
        ${B('to check')?.parts ? `<dt>First reason, in gate order</dt>${dd(`The ledger also files each model under the first thing that holds it, in the gate order below. Unlike the rows above, these do add up. ${esc(B('to check').label)}: ${firsts(B('to check'))}. ${esc(B('checked')?.label ?? '')}: ${firsts(B('checked'))}.`)}` : ''}
      </dl>
      <h3>The checks, in gate order</h3>
      <p class="muted" style="font-size:14px">${esc(s.gates ?? '')}.</p>
      <dl class="defs">${gates.map((g, i) => `<dt id="def-${esc(g.key)}">${i + 1}. ${esc(g.label)} <span class="muted" style="font-weight:500">(column “${esc(CHECK_LIST.find((c) => c.key === g.key)?.short ?? g.key)}”)</span></dt>${dd(`${esc(g.rule)}. From ${esc(g.source)}.`)}`).join('')}</dl>
      ${CHECK_LIST.some((c) => c.scope === 'site') ? `<h3>Site checks</h3><p class="muted" style="font-size:14px">Counted in pages, shown in the Site block; they do not gate any model.</p><dl class="defs">${CHECK_LIST.filter((c) => c.scope === 'site').map((c) => `<dt id="def-${esc(c.key)}">${esc(c.title)}</dt>${dd(`${esc(c.rule)}. ${c.captured ? `${c.total} pages` : `Not run yet; ${c.total ?? 'an unknown number of'} pages to judge`}.`)}`).join('')}</dl>` : ''}
      <h3>Reviews</h3>
      <dl class="defs">
        <dt>Visual review</dt>${dd(esc(s.review))}
        <dt>Text review</dt>${dd(esc(s.textReview))}
        <dt>The review log</dt>${dd(esc(s.reviewLog ?? ''))}
        ${s.staleness ? `<dt id="def-stale">When a result or review goes stale</dt>${dd(esc(s.staleness))}` : ''}
        ${c.reviewed ? `<dt>Reviews found</dt>${dd(['visual', 'text'].map((k) => `${k}: <span class="n">${c.reviewed[k].fresh}</span> models with a fresh review, <span class="n">${c.reviewed[k].staleOnly}</span> with only stale ones${c.reviewed[k].problem ? `, <span class="n">${c.reviewed[k].problem}</span> whose latest found a problem` : ''}`).join('; ') + '.')}` : ''}
      </dl>
      <h3>Running totals</h3>
      <p class="muted" style="font-size:14px">These are not buckets: a model counts in every stage it has reached, so they do not add up to the model count.</p>
      <dl class="defs">${(c.reachedAtLeast ?? []).map((x) => `<dt>${esc(x.label[0].toUpperCase() + x.label.slice(1))} <span class="n">${x.count}</span></dt>`).join('')}</dl>`;
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
  let RUN_NOW = { running: null, paused: false, mine: false };
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
   * The control beside a check's name, which is whatever makes sense right now.
   *
   *   this one is running   stop it, and pause or resume it
   *   another is running    nothing to offer: one at a time is the point
   *   nothing is running    run it
   */
  /**
   * The control beside a check's name. One place, next to the name, whatever the state.
   *
   *   starting      a spinner: the click has been sent and the board has not said yes yet
   *   running       pause (or resume) and stop, together, where the play button was
   *   another runs  a play button, greyed: one at a time is the whole point of the runner
   *   idle          play
   *
   * The pause and stop used to live in a bar of their own at the bottom of the list, so the row
   * that was running still showed a play button while the controls for it sat somewhere else.
   */
  function runControl(c) {
    const waiting = pendingOn(c.key);
    if (waiting) {
      const said = { run: 'Starting', pause: 'Pausing after the model it is on', resume: 'Resuming', stop: 'Stopping' }[waiting] ?? 'Working';
      return `<span class="ckrun ckrun--wait" role="status" aria-label="${esc(said)}" title="${esc(said)}"><i></i></span>`;
    }
    const mine = RUN_NOW.running === c.key;
    if (mine) {
      const pr = RUN_NOW.paused
        ? '<button type="button" class="ckrun ckrun--go" data-act="resume" title="Resume" aria-label="Resume">&#9654;</button>'
        : '<button type="button" class="ckrun ckrun--hold" data-act="pause" title="Pause after the model it is on" aria-label="Pause">&#10074;&#10074;</button>';
      return pr + '<button type="button" class="ckrun ckrun--stop" data-act="stop" title="Stop" aria-label="Stop">&#9632;</button>';
    }
    const busy = !!RUN_NOW.running;
    return `<button type="button" class="ckrun" data-run="${esc(c.key)}" title="${busy ? 'Another check is running' : 'Run this check on its own'}" aria-label="Run ${esc(c.title)}"${busy ? ' disabled' : ''}>&#9654;</button>`;
  }

  async function runState() {
    try {
      const { body } = await api('/api/state');
      RUN_OK = true;
      const bar = $('runbar'); if (bar) bar.hidden = false;
      const st = $('run-state');
      const on = !!body.running;
      const was = `${RUN_NOW.running}|${RUN_NOW.paused}|${PENDING ? PENDING.act : ''}`;
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
        const askedFor = String(PENDING.key).split(':')[0];
        const isPart = String(PENDING.key).includes(':');
        const done = PENDING.act === 'run'
          ? (isPart ? body.running === askedFor : (body.running === PENDING.key && L?.running?.[PENDING.key]?.alive === true))
          : PENDING.act === 'stop' ? !body.running
          : PENDING.act === 'pause' ? !!body.paused
          : !body.paused;
        if (done) PENDING = null;
      }
      RUN_NOW = { running: body.running ?? null, paused: !!body.paused, mine: !!body.mine };
      // Only when it actually changes: this polls every three seconds, and redrawing the bars on
      // every poll would fight the page's own rebuild and lose any disclosure somebody had opened.
      // renderStage draws the bars that are actually on screen. renderCheckBars fills #checkbars,
      // which is a different container further down -- calling that one redrew nothing anybody
      // could see, and the empty catch hid the fact that it had not worked.
      if (L && was !== `${RUN_NOW.running}|${RUN_NOW.paused}|${PENDING ? PENDING.act : ''}`) { renderStage(); renderRows(); }
      if (st) {
        const where = body.mine ? '' : ' (started outside this page)';
        const howFar = body.done != null && body.total != null ? ` ${body.done}/${body.total}` : '';
        st.textContent = body.paused ? `${body.running ?? 'A run'} is PAUSED — it stops after the model it is on`
          : on ? `Running: ${body.running}${howFar}${where}` : 'Nothing running';
        st.className = 'runbar__state' + (body.paused ? ' is-paused' : on ? ' is-on' : '');
      }
      const show = (id, yes) => { const el = $(id); if (el) el.hidden = !yes; };
      // A single check carries its own controls on its row, where the thing is. The bar keeps them
      // only for "every check", which is not one row and has nowhere else to live.
      const whole = body.running === 'all';
      show('run-all', !on); show('run-stop', on && body.mine && whole);
      show('run-pause', on && whole && !body.paused); show('run-resume', on && whole && body.paused);

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
      const bar = $('runbar');
      if (bar) {
        bar.hidden = false;
        bar.innerHTML = '<span class="runbar__state runbar__hint">Nothing can be run from this page: it is not being served by the board. Run <code>npm run board</code> and open the address it prints.</span>';
      }
      return null;
    }
  }
  async function runDo(path, check, models = []) {
    // A 409 is the board answering -- "something is already running" -- so it is shown, not thrown.
    try {
      await api(path + (check ? `?check=${encodeURIComponent(check)}${models.length ? `&models=${encodeURIComponent(models.join(','))}` : ''}` : ''), 'POST');
    } catch (e) {
      PENDING = null;
      const m = /^409 /.test(String(e.message)) ? 'Something is already running.' : String(e.message);
      const st = $('run-state');
      if (st) { st.textContent = m; st.className = 'runbar__state is-paused'; }
    }
    await runState();
  }
  document.addEventListener('click', (e) => {
    const part = e.target.closest('[data-run-what]');
    if (part && !part.disabled) {
      const ids = (part.dataset.runIds ?? '').split(',').filter(Boolean);
      PENDING = { key: `${part.dataset.runWhat}:${ids.join(',')}`, act: 'run' };
      renderRows(); renderStage();
      runDo('/api/run', part.dataset.runWhat, ids);
      return;
    }
    const one = e.target.closest('[data-run]');
    if (one && !one.disabled) {
      PENDING = { key: one.dataset.run, act: 'run' };
      renderStage();
      runDo('/api/run', one.dataset.run);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      PENDING = { key: RUN_NOW.running, act: act.dataset.act };
      renderStage();
      runDo('/api/' + act.dataset.act);
      return;
    }
    if (e.target.closest('#run-all')) runDo('/api/run', 'all');
    else if (e.target.closest('#run-stop')) runDo('/api/stop');
    else if (e.target.closest('#run-pause')) runDo('/api/pause');
    else if (e.target.closest('#run-resume')) runDo('/api/resume');
  });
  runState().then((s) => { if (s) rerender(); });
  setInterval(runState, 3000);

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
    $('live').innerHTML = `<span class="sep">·</span><span tabindex="0" data-tip data-tiptext="${esc(checked)}"><i class="dot ${dot}"></i>${esc(short)}</span>`
      + (dataAge != null && dataAge > QUIET_S ? `<span class="sep">·</span><span class="stale">not rebuilt for ${esc(fmtAge(dataAge).replace(/ ago$/, ''))}</span>` : '');

    // the plain-words notice: minute granularity, rewritten only when it changes (it is aria-live)
    const min = (s) => `${Math.max(1, Math.round(s / 60))} min`;
    let note = '';
    if (fetchError) note = `<div class="notice bad"><b class="big">Could not refresh.</b> ${esc(fetchError)}. What you see was fetched ${esc(lastChangeAt ? fmtAge((Date.now() - lastChangeAt) / 1000).replace(/\d+ s ago/, 'under a minute ago') : 'earlier')}.</div>`;
    else if (w.kind === 'dead' && dataAge > QUIET_S) note = `<div class="notice bad"><b class="big">Stale: this page has stopped updating.</b> The ledger has not changed for ${min(dataAge)}, and the watcher that should rebuild it last reported ${min(w.beat ?? 0)} ago without recording a stop, so it has probably crashed or the laptop slept. Commits and check results since ${esc(clock(W.heartbeatAt))} are missing. Restart it with <code>npm run ledger:watch</code>.</div>`;
    else if (w.kind === 'dead') note = `<div class="notice">The watcher last reported ${min(w.beat ?? 0)} ago without recording a stop. This data is recent because it was built ${L.build?.by ? `by <code>${esc(L.build.by)}</code>` : 'another way'}, but nothing is rebuilding it. Restart the watcher with <code>npm run ledger:watch</code>.</div>`;
    else if (w.kind === 'alive' && dataAge > QUIET_S) note = `<div class="notice info">Quiet, not stale: nothing the ledger reads has changed for ${min(dataAge)}. The watcher is alive and looking every 3 s.</div>`;
    else if ((w.kind === 'stopped' || w.kind === 'none') && dataAge > QUIET_S) note = `<div class="notice"><b class="big">Not live.</b> No watcher is running, so this is the build from ${min(dataAge)} ago and it will not change until someone runs <code>npm run ledger</code> or starts <code>npm run ledger:watch</code>.</div>`;
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
  const schedule = () => { clearTimeout(timer); if (!document.hidden) timer = setTimeout(() => refresh().catch(() => {}).finally(schedule), POLL_MS); };
  const stopPolling = () => { clearTimeout(timer); clearInterval(ticker); timer = ticker = null; document.removeEventListener('visibilitychange', onVis); };
  const onVis = () => { if (document.hidden) clearTimeout(timer); else refresh().catch(() => {}).finally(schedule); };
  document.addEventListener('visibilitychange', onVis);
  ticker = setInterval(tickAges, 1000);
  refresh().catch(() => {}).finally(schedule);
})();
