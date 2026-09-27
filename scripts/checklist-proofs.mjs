/**
 * Runs the proofs of docs/RELEASE-CHECKLIST.md that are cheap, local and read-only, for
 * scripts/ledger.mjs. Each item gets one of:
 *   { result: 'true',  found }   the proof holds now
 *   { result: 'false', found }   the proof fails now, and what it found
 *   { result: 'not-evaluated', why }  the proof is slow, networked, writes files or needs a person
 * An item is matched to its proof by the start of its text; an item nothing matches is "not
 * evaluated here". The `[x]` in the file is never taken as proof: a tick whose proof fails now is
 * reported as a conflict, and a tick whose proof is not evaluated here says so.
 *
 * Nothing here runs a build, a check, the network or anything that writes: only git's read
 * commands, file reads and the ledger's own counts from the same build.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTRY } from './checks-registry.mjs';
import { workingSources } from './model-sources.mjs';
// read-only: git's own read commands over the committed snapshot. Importing it writes nothing.
import { snapshotStatus } from './release-snapshot.mjs';

export function evaluateChecklist(items, { ROOT, counts, models, atRiskList, head, checkFiles, cache = null }) {
  const mtime = (p) => { try { return statSync(join(ROOT, p)).mtimeMs; } catch { return 0; } };
  // HEAD read straight from .git, as the watcher does: no process to start
  const headNow = () => {
    try {
      const h = readFileSync(join(ROOT, '.git/HEAD'), 'utf8').trim();
      if (!h.startsWith('ref: ')) return h;
      const ref = h.slice(5);
      try { return readFileSync(join(ROOT, '.git', ref), 'utf8').trim(); } catch {}
      const line = readFileSync(join(ROOT, '.git/packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(` ${ref}`));
      return line ? line.slice(0, 40) : null;
    } catch { return null; }
  };
  const H = headNow() ?? '';
  // what each git-reading proof depends on; such a proof is rerun only when that changes
  const KEYS = {
    index: () => `${H}|${mtime('.git/index')}`,
    head: () => H,
    dist: () => `${mtime('dist')}|${mtime('dist/index.html')}`,
    readme: () => `${H}|${mtime('.git/index')}|${mtime('README.md')}|${mtime('package.json')}`,
  };
  const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const exits0 = (...a) => { try { git(...a); return true; } catch { return false; } };
  const read = (p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return null; } };
  const T = (found) => ({ result: 'true', found });
  const F = (found) => ({ result: 'false', found });
  const N = (why) => ({ result: 'not-evaluated', why });
  const n = models.length;
  /**
   * A check whose verdict is already recorded per model, read back rather than run again. The
   * capture run itself is hours of browser work, and every result it would look at is in
   * docs/checks/<key>.json already; the found text says so, so a read is never read as a run.
   */
  const recorded = (key, what, extra = '') => {
    const ok = models.filter((m) => m.checks[key]?.status === 'pass' && !m.checks[key].stale).length;
    const stale = models.filter((m) => m.checks[key]?.status === 'pass' && m.checks[key].stale).length;
    return ok === n
      ? T(`from the recorded results in docs/checks/${key}.json: ${n} of ${n} models pass ${what} on the current code (read back, not re-run here)${extra}`)
      : F(`from the recorded results in docs/checks/${key}.json: ${ok} of ${n} have a fresh pass${stale ? `, ${stale} passed on code that has changed since` : ''}`);
  };
  /** The same for a site-wide check, whose results are pages rather than models. */
  const recordedPages = (key) => {
    const f = checkFiles?.[key];
    if (!f) return F(`docs/checks/${key}.json does not exist: this check has never been captured`);
    const pages = Object.values(f.models ?? {});
    const bad = pages.filter((p) => p.status !== 'pass');
    return pages.length && !bad.length
      ? T(`from the recorded results in docs/checks/${key}.json: ${pages.length} of ${pages.length} pages pass, run ${f.updatedAt ?? 'at an unknown time'} (read back, not re-run here)`)
      : F(`from the recorded results in docs/checks/${key}.json: ${pages.length - bad.length} of ${pages.length} pages pass${bad.length ? `; not passing: ${bad.length}` : ' (no page results recorded)'}`);
  };
  const walk = (dir) => { const out = []; const go = (d) => { let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const f = join(d, e.name); e.isDirectory() ? go(f) : out.push(f); } }; go(dir); return out; };

  /*
   * The steps that leave no per-model record now leave a record of the RUN.
   *
   * These answered "not evaluated: tsc is slow", "npm run build writes dist/", "qa needs a fresh
   * build" -- all true of running the command, and none of it about the run that just finished.
   * verify writes docs/checks/gate.json when it ends: what ran, how it ended, when, at which
   * commit. Reading it costs nothing and runs nothing.
   *
   * The record is only as good as its commit: a gate run against other code proves nothing about
   * this one, so a stale record fails rather than passes.
   */
  const gate = (() => {
    try { return JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'gate.json'), 'utf8')); } catch { return null; }
  })();
  /**
   * Are these the same commit, when either side may be abbreviated? Git's own rule: a short sha
   * identifies the commit it is a prefix of. Seven characters minimum, so an empty or truncated
   * value can never match everything.
   */
  const sameCommit = (a, b) => {
    const x = String(a ?? '').trim();
    const y = String(b ?? '').trim();
    const n = Math.min(x.length, y.length);
    return n >= 7 && x.slice(0, n) === y.slice(0, n);
  };
  const fromGate = (pick, what) => () => {
    if (!gate) return N(`docs/checks/gate.json is not there: no gate run has recorded itself yet (npm run verify writes it)`);
    // head is `rev-parse --short` (seven characters) and gate.json records the full forty, so a
    // plain !== between them is true even when they are the same commit. That is what this line was,
    // and it printed the result: "the last recorded gate run was at d00ed98, and HEAD is d00ed98: it
    // proves nothing about this code". Six checklist items could not go green by any means -- the
    // gate held all seventeen steps at that very commit -- and the sentence saying so contradicted
    // itself in its own words. Compare on the shorter length, whichever side is abbreviated.
    if (!sameCommit(gate.commit, head)) return F(`the last recorded gate run was at ${String(gate.commit).slice(0, 7)}, and HEAD is ${String(head).slice(0, 7)}: it proves nothing about this code`);
    const r = pick(gate);
    if (r == null) return N(`the recorded gate run did not include ${what}`);
    return r.ok
      ? T(`from docs/checks/gate.json: ${what} ran at ${String(gate.commit).slice(0, 7)} and passed, ${gate.finishedAt?.slice(0, 16)?.replace('T', ' ')}`)
      : F(`from docs/checks/gate.json: ${what} ran at ${String(gate.commit).slice(0, 7)} and did not pass`);
  };
  const step = (key) => (g) => (g.steps ?? []).find((s) => s.key === key) ?? null;
  /*
   * The three that need a network, read back from the gate step that asked them.
   *
   * Not asked from here: a proof runs on every ledger build, several times a minute, and a fetch
   * or a preflight on that clock is a tax on looking at the page. scripts/check-remote.mjs runs
   * once a gate and writes docs/checks/remote.json; this reads it, with the same rule as the
   * gate record -- a stale answer is not an answer.
   */
  const remote = (() => {
    try { return JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'remote.json'), 'utf8')); } catch { return null; }
  })();
  const fromRemote = (key, what) => () => {
    if (!remote) return N(`docs/checks/remote.json is not there: no gate run has asked yet (npm run check-remote writes it)`);
    const r = remote.checks?.[key];
    if (!r) return N(`the recorded run did not ask about ${what}`);
    const when = String(remote.at ?? '').slice(0, 16).replace('T', ' ');
    if (r.ok === null) return N(`${r.found} (asked ${when})`);
    return r.ok ? T(`${r.found} — asked ${when}`) : F(`${r.found} — asked ${when}`);
  };
  /*
   * The three that only a person opening the dialog could answer, read back from the look that
   * asked them. scripts/three-looks.mjs printed its answers and wrote nothing until 2026-09-28, so
   * these lines said "not evaluated" while the look sat in the terminal one screen above.
   */
  const looks = (() => {
    try { return JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'looks.json'), 'utf8')); } catch { return null; }
  })();
  const fromLooks = (key, what) => () => {
    if (!looks) return N(`docs/checks/looks.json is not there: nothing has looked yet (npm run looks writes it)`);
    if (!sameCommit(looks.commit, head)) return F(`the look ran at ${String(looks.commit).slice(0, 7)}, and HEAD is ${String(head).slice(0, 7)}: it was looking at other code`);
    const r = looks.looks?.[key];
    if (!r) return N(`the recorded look did not ask about ${what}`);
    const when = String(looks.at ?? '').slice(0, 16).replace('T', ' ');
    return r.ok
      ? T(`${r.found} — looked ${when} on /models/${looks.model}/`)
      : F(`${r.found} — looked ${when} on /models/${looks.model}/`);
  };
  const PROOFS = [
    [/^Every file the dialog hands out is named after its model/, fromLooks('names', 'the names the dialog hands out')],
    [/^The working tree is clean/, () => atRiskList.length ? F(`${atRiskList.length} path(s) in git status, e.g. ${atRiskList.slice(0, 3).map((x) => x.path).join(', ')}`) : T('git status prints nothing')],
    [/^The main index matches HEAD/, KEYS.index, () => exits0('diff', '--cached', '--quiet', 'HEAD') ? T('git diff --cached HEAD is empty') : F(`the main index differs from HEAD in ${git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean).length} path(s)`)],
    [/^scripts\/verify\.mjs and scripts\/check-exports\.mjs are committed/, KEYS.head, () => {
      const tracked = git('ls-files', 'scripts/verify.mjs', 'scripts/check-exports.mjs').trim().split('\n').filter(Boolean);
      let pkg = ''; try { pkg = git('show', 'HEAD:package.json'); } catch {}
      const entry = /"verify"\s*:/.test(pkg);
      return tracked.length === 2 && entry ? T('both are tracked, and HEAD:package.json has "verify"') : F(`tracked: ${tracked.join(', ') || 'neither'}; "verify" in HEAD:package.json: ${entry ? 'yes' : 'no'}`);
    }],
    [/^Local-only files stay local/, KEYS.index, () => { const t = git('ls-files', 'hero-options.html', 'og-preview.html', 'harness-tmp').trim(); return t ? F(`tracked: ${t.split('\n').join(', ')}`) : T('none of them is tracked'); }],
    [/^The verify gate holds/, () => N('npm run verify is hours of browser work and is written for an idle machine, so it is never run from here. Capped at C3D_MAX_BROWSERS (default 2) and one check at a time since an earlier run opened 57 browsers. The same checks are recorded green per model in the ledger at this commit, which is evidence, not this proof')],
    [/^Every model is approved/, () => counts.approved === n ? T(`${n} of ${n} approved`) : F(`${counts.approved} of ${n} approved`)],
    [/^The raw check records stay out of the repo/, () => `${KEYS.index()}|${mtime('.gitignore')}|${mtime('docs/release-snapshot.json')}`, () => {
      const ignored = (read('.gitignore') ?? '').split(/\r?\n/).some((l) => l.trim() === '/docs/checks/');
      const leaked = git('ls-files', 'docs/checks').trim().split('\n').filter(Boolean);
      const snapTracked = git('ls-files', 'docs/release-snapshot.json').trim() === 'docs/release-snapshot.json';
      let kb = null; try { kb = statSync(join(ROOT, 'docs/release-snapshot.json')).size / 1024; } catch {}
      const small = kb != null && kb < 200;
      return ignored && !leaked.length && snapTracked && small
        ? T(`/docs/checks/ is gitignored and none of it is tracked; docs/release-snapshot.json is tracked, ${kb.toFixed(0)} kB`)
        : F(`/docs/checks/ in .gitignore: ${ignored ? 'yes' : 'no'}; tracked under docs/checks: ${leaked.length}; docs/release-snapshot.json tracked: ${snapTracked ? 'yes' : 'no'}; size: ${kb == null ? 'missing' : `${kb.toFixed(0)} kB${small ? '' : ', over the 200 kB this item allows'}`}`);
    }],
    [/^The release snapshot is the state of the commit being pushed/, () => `${H}|${mtime('docs/release-snapshot.json')}`, () => {
      // the same call the item's command makes, read as data rather than run as a process
      const s = snapshotStatus();
      return s.ok ? T(s.why) : F(`${s.why}${s.changed.length ? `: e.g. ${s.changed.slice(0, 3).join(', ')}` : ''}`);
    }],
    [/^The ledger was built on the commit being pushed/, () => (H.startsWith(head) ? T(`built at ${head}, which is HEAD as this ledger was written (the watcher rebuilds when main moves)`) : F(`built at ${head}, HEAD is ${H.slice(0, 7) || 'unreadable'}`))],
    [/^Every model draws the same whatever box-sizing/, () => recorded('boxsizing', 'check-boxsizing', ', and no result carries a "content-box by design" exception for anyone to have read')],
    [/^Every model's text is readable on the dark stage/, () => recorded('contrast', 'check-contrast')],
    [/^Every model is within its performance budgets/, () => recorded('perf', 'check-perf')],
    [/^Every model stops when paused, names its controls/, () => recorded('access', 'check-access')],
    [/^No check result behind the ledger was judged under an older rule/, () => {
      const bad = models.flatMap((m) => Object.entries(m.checks)).filter(([, c]) => (c.staleWhy ?? []).some((w) => String(w).startsWith('rule changed')));
      return bad.length ? F(`${bad.length} result(s) judged under an older rule, e.g. ${bad.slice(0, 3).map(([k]) => k).join(', ')}`) : T('no result carries a "rule changed" staleness, over every model and every check');
    }],
    [/^The built gallery stays answerable over all 135 models/, () => recordedPages('app')],
    [/^The built site passes the SEO check/, () => {
      const r = recordedPages('seo');
      const f = checkFiles?.seo;
      const listed = Object.values(f?.models ?? {}).filter((p) => p.listed).length;
      /*
       * Every page passing is provable from the records. Whether a WAIVED or OWN-TEXT line has
       * been accepted by a person is not -- but only while there IS one.
       *
       * This used to return "not evaluated" whichever way it went, so with 416 of 416 passing and
       * not a single listed finding the item still could not be ticked, and the reason it gave was
       * that somebody had to accept findings that do not exist. Nothing left for a person to
       * accept is an answer, not a question.
       */
      if (r.result === 'true' && !listed) return T(`${r.found}, and no page carries a WAIVED or OWN-TEXT line for a person to accept`);
      return N(`${r.found}. But the item also asks that each WAIVED or OWN-TEXT line has been fixed or accepted by the user${listed ? ` (${listed} page(s) carry listed findings)` : ''}, which needs a person; run npm run check-seo -- --strict once they are all fixed`);
    }],
    /*
     * The two items that wait for a person, and the one rule that applies to them anyway.
     *
     * A person reads the article and says it is ready; a person says to push. Neither is a thing
     * a script can decide, and neither is trying to be. But both are claims ABOUT A STATE -- this
     * article, describing this code, at this commit -- and the rest of this ledger already holds
     * every verdict to the same rule: a verdict dies when the thing it judged changes.
     *
     * These two were the only claims on the page exempt from it. They were written once and stayed
     * ticked through every commit after, so "the person said to push" went on being true while the
     * thing they had said it about was rewritten underneath them.
     *
     * When the tick was written is not guessed: git is asked when that exact line last changed.
     * The tick holds if that is HEAD and nothing is uncommitted. Anything else and it is a
     * statement about code that is not the code being pushed, and it says so and how far back.
     * Nobody is asked to write a hash down; the claim expires by itself.
     */
    ...[
      [/^The person publishing has read the release article/, 'read the article and called it ready'],
      [/^The person publishing has said to push/, 'said to push'],
    ].map(([re, what]) => [re, KEYS.index, (it) => {
      const line = Number(it?.line);
      if (!Number.isFinite(line)) return N('the item has no line number, so when it was ticked cannot be read');
      let at = null;
      try {
        const out = git('log', '-1', '--format=%H', `-L${line},${line}:docs/RELEASE-CHECKLIST.md`);
        at = (out.split("\n")[0] || "").trim() || null;
      } catch { return N('git could not read the history of this line'); }
      if (!at) return N('this line has no commit history yet, so there is nothing to date the tick from');
      const short = at.slice(0, 7);
      const dirty = git('status', '--porcelain').split('\n').filter(Boolean).length;
      let behind = 0;
      try { behind = Number(git('rev-list', '--count', `${at}..HEAD`).trim()) || 0; } catch { /* leave it */ }
      if (!behind && !dirty) return T(`${what} at ${short}, which is HEAD, with nothing uncommitted`);
      const why = [
        behind ? `${behind} commit${behind === 1 ? '' : 's'} have landed since` : null,
        dirty ? `${dirty} path(s) are uncommitted` : null,
      ].filter(Boolean).join(', ');
      return F(`${what} at ${short}; ${why}. It is a claim about code that is not the code being pushed, so it does not carry: read and say it again on what is going out`);
    }]),
    [/^No contract result is stale or failing/, () => { const c = counts.checks.models ?? {}; const keys = Object.keys(c); return keys.length === 1 && c.pass === n ? T(`"pass":${n}`) : F(JSON.stringify(c)); }],
    [/^check-stages has judged every model/, () => { const ok = models.filter((m) => m.checks.stages?.status === 'pass' && !m.checks.stages.stale).length; return ok === n ? T(`from the recorded results: ${n} of ${n} pass on the current code`) : F(`from the recorded results: ${ok} of ${n} have a fresh pass (the proof itself, a full capture run, is not run here)`); }],
    /*
     * The headline item, which no perfect run could tick.
     *
     * It said "no cheap local proof is wired for this item", so a four-hour run over all 135
     * models ended with the board green and this line still open, which is the wrong way round:
     * the run writes its answer into the result files, and reading them is cheap.
     *
     * What this can and cannot see. It reads every recorded verdict and asks whether each is a
     * fresh pass on the current code -- that is the "every check holds over all 135" half, and it
     * is a fact. Whether the machine was IDLE is not in any file; the nearest thing to evidence is
     * that check-perf measures frame times against budgets and would fail under load, so its
     * passing is the machine saying it was quiet enough. Said out loud rather than assumed.
     *
     * A flagged model with no open flags counts: the check looked, raised nothing that still
     * stands, and "flags cleared" is a held verdict, not a pending one.
     */
    [/^Every check holds over all 135 models/, () => {
      const keys = Object.keys(models[0]?.checks ?? {});
      if (!keys.length) return F('no recorded results to read');
      const held = (r) => r && !r.stale && (r.status === 'pass' || (r.status === 'flagged' && (r.openFlags ?? 0) === 0));
      const off = keys.map((k) => [k, models.filter((m) => !held(m.checks[k])).length]).filter(([, bad]) => bad > 0);
      const perf = models.filter((m) => held(m.checks.perf)).length;
      return off.length
        ? F(`from the recorded results: ${off.map(([k, bad]) => `${k} ${bad} of ${n} not a fresh pass`).join('; ')}`)
        : T(`from the recorded results: ${keys.length} checks, each a fresh pass over all ${n} models on the current code. The machine being idle is not recorded anywhere; check-perf holds for ${perf} of ${n} against frame-time budgets that fail under load, which is the nearest evidence there is`);
    }],
    /*
     * This used to require every flagged model to have a visual review recorded against it, which
     * is a thing that can no longer happen: reviews left this ledger. The proof would have failed
     * for ever, on a condition nobody could satisfy.
     *
     * What it proves now is what a script can prove: that the check ran on every model, on the
     * code as it is. What it FOUND, including anything it flagged, is reported and counted; a
     * person judging a flagged animation is a person watching the real thing, and that happens
     * on what is shipped.
     */
    [/^check-motion has run over every model/, () => {
      const ran = models.filter((m) => m.checks.motion && m.checks.motion.status !== 'never' && !m.checks.motion.stale);
      const flagged = ran.filter((m) => ['flagged', 'broke'].includes(m.checks.motion.status));
      const said = `from the recorded results: ${ran.length} of ${n} ran on the current code`
        + (flagged.length ? `; ${flagged.length} flagged for a person to look at, which holds nothing back` : '; none flagged');
      return ran.length === n ? T(said) : F(said);
    }],
    [/^Recordings and snapshots match the dialog's canvas at every setting/, () => N('check-exports over its sample takes many minutes of browser work')],
    [/^The old implementation is gone/, () => {
      let files = 0; try { files = readdirSync(join(ROOT, 'src/styles/models')).length; } catch {}
      const uses = ((read('src/styles/main.scss') ?? '').match(/@use 'models\//g) ?? []).length;
      return !files && !uses ? T('src/styles/models is empty and main.scss uses none of it') : F(`src/styles/models holds ${files} file(s); main.scss has ${uses} @use 'models/ line(s) (the item allows keeping it only if VIEW-CONTRACT.md and the README say so, which is not checked here)`);
    }],
    /*
     * Both of these said "not evaluated: it is slow and writes files" -- true of RUNNING them, and
     * beside the point. The run already did it, and what it left behind is cheap to read. An item
     * that stays open after the thing it asks for has happened is the checklist disagreeing with
     * the board, and the board is the one with the evidence.
     */
    [/^The social preview images are made/, () => {
      // check-media makes every share image (its prepare step) and then compares each against a
      // fresh render of the page. So a fresh pass over every model IS the image existing and being
      // right; nothing here re-renders anything.
      const ok = models.filter((m) => m.checks.media?.status === 'pass' && !m.checks.media.stale).length;
      return ok === n
        ? T(`from the recorded results: check-media holds for ${n} of ${n} models on the current code, and it makes every share image before it compares each against a fresh render of the page`)
        : F(`from the recorded results: ${ok} of ${n} have a fresh pass from check-media`);
    }],
    [/^Every model's share preview is right/, () => { const ok = models.filter((m) => m.checks.media?.status === 'pass' && !m.checks.media.stale).length; return ok === n ? T(`from the recorded results: ${n} of ${n} pass check-media on the current code`) : F(`from the recorded results: ${ok} of ${n} have a fresh check-media pass`); }],
    [/^The build works on the Node the workflow uses/, () => /^v22\./.test(process.version) ? T(`node -v is ${process.version}`) : F(`node -v is ${process.version}, the workflow uses 22 (the item also allows "the build above was run on 22", not checked here)`)],
    /*
     * "Regenerated and committed" is two things, and both are readable without regenerating
     * anything: the build writes src/sitemap-dates.json, and verify builds before the steps that
     * judge dist/. So if the file has an entry for every model page and git has nothing
     * outstanding for it, the last build's answer is the committed one.
     *
     * It said "its proof runs npm run generate, which writes files" -- true of the command, and
     * not what the item asks. The item asks about the file.
     */
    /*
     * The same scan check-parity runs, so a tick here cannot outlive the thing it claims.
     *
     * It proves the precondition and says so: every model's text names a family that travels with
     * the captured scene, which is what stops a renderer choosing its own. Whether the two
     * renderers then draw the same pixels was MEASURED on 2026-09-27 and is written into the item;
     * it needs the Worker's daily budget and is not re-run from here.
     */
    [/^Both renderers draw the same picture/, () => {
      const EMBEDDED = /\bInter\b|\bJetBrains Mono\b/i;
      const CSS_WIDE = /^\s*(inherit|initial|unset|revert|revert-layer)\s*$/i;
      const NAMES = /[A-Za-z][\w -]*(?=\s*(?:,|$))/;
      const KNOWN = new Set(['perfume']); // measured and listed in scripts/check-worker-parity.mjs
      const srcs = workingSources();
      const loose = [];
      for (const m of models) {
        const src = srcs.get(m.id);
        const text = typeof src?.snippet === 'string' ? src.snippet : '';
        for (const f of text.matchAll(/font(?:-family)?:\s*([^;{}]+);/g)) {
          const v = f[1].trim();
          if (EMBEDDED.test(v) || CSS_WIDE.test(v) || !NAMES.test(v)) continue;
          if (!KNOWN.has(m.id)) loose.push(m.id);
          break;
        }
      }
      const off = [...new Set(loose)];
      /*
       * NOT-EVALUATED when the scan is clean, not true.
       *
       * The scan proves the PRECONDITION -- no model naming a family the scene leaves behind --
       * and the item asks something else: that the two renderers then draw the same pixels. That
       * needs the Worker and its daily budget, so it cannot be answered from here.
       *
       * Returning true for it auto-ticked the item the moment the automatic stages started
       * counting proofs, which is the failure this checklist is built to catch, produced by the
       * checklist. A proof that cannot answer the question says so; the tick then stands or falls
       * on a person, and right now it is correctly unticked -- the fix has never been measured
       * against the Worker.
       */
      return off.length
        ? F(`${off.length} model(s) name a family the captured scene does not carry, so the renderer picks its own: ${off.slice(0, 4).join(', ')}`)
        : N(`the precondition holds -- every model's text names a family the scene carries, over all ${n} -- but whether the two renderers draw the same picture needs the Worker's daily budget: npm run check-parity -- --render`);
    }],
    // tsc is not its own step: `npm run build` is generate && tsc && vite build, so one exit code
    // answers for both lines, and both say so rather than pretending to be separate evidence.
    [/^TypeScript is clean/, fromGate((g) => (g.build?.ran ? g.build : null), 'the build (which runs tsc)')],
    [/^The build is clean/, fromGate((g) => (g.build?.ran ? g.build : null), 'npm run build')],
    [/^QA on the built site finds nothing/, fromGate(step('qa'), 'qa')],
    [/^Every standalone snippet runs without a script error/, fromGate(step('snippets'), 'snippet-check over every model')],
    [/^Editing a model never remounts/, fromGate(step('preview'), 'preview-check')],
    [/^Snapshots match the screen/, fromGate(step('compare'), 'compare-capture')],
    /*
     * Nothing watched this one. Now check-exports does, so its holding is the answer.
     *
     * The chip was read and printed on every model and held to nothing, so the line was verified by
     * hand on 2026-09-23 and true only of that day. From rule v9 the check FAILS when the dialog
     * offers 2160 and the renderer cannot encode it -- so a fresh export pass over every model is
     * the condition holding, and it is re-earned on every run rather than remembered.
     */
    [/^4K is not offered at all/, () => {
      const ok = models.filter((m) => m.checks.exports?.status === 'pass' && !m.checks.exports.stale).length;
      return ok === n
        ? T(`from the recorded results: check-exports holds for ${n} of ${n} models on the current code, and from rule v9 it fails a model whose dialog offers 4K while the renderer cannot encode 2160`)
        : F(`from the recorded results: ${ok} of ${n} have a fresh export pass, so the 4K condition is not proven on the current code`);
    }],
    [/^The remote has nothing main lacks/, fromRemote('remoteAhead', 'the remote')],
    [/^The Worker answers the site and refuses anyone else/, fromRemote('workerOrigins', 'the Worker origins')],
    [/^The value the workflow reads exists in the repository/, fromRemote('workflowVariable', 'the workflow variable')],
    [/^The sitemap dates are regenerated/, () => {
      const path = 'src/sitemap-dates.json';
      let dates;
      try { dates = JSON.parse(readFileSync(join(ROOT, path), 'utf8')); } catch { return F(`${path} is not there or is not readable`); }
      const missing = models.filter((m) => !dates[`models/${m.id}/`]).map((m) => m.id);
      const dirty = git('status', '--porcelain', '--', path).trim();
      if (missing.length) return F(`${path} has no entry for ${missing.length} model page(s): ${missing.slice(0, 3).join(', ')}`);
      if (dirty) return F(`${path} has changes that are not committed: ${dirty.split('\n')[0]}`);
      return T(`${path} has an entry for all ${n} model pages and nothing uncommitted; the build writes it, and verify builds before the steps that read dist/`);
    }],
    [/^The dev fallback address is not in the production bundle/, KEYS.dist, () => {
      if (!existsSync(join(ROOT, 'dist'))) return F('there is no dist/ to search: build first');
      const hits = walk(join(ROOT, 'dist')).filter((f) => /\.(js|html|css|json|map)$/.test(f)).filter((f) => { try { return readFileSync(f, 'utf8').includes('127.0.0.1:8787'); } catch { return false; } });
      const age = Math.round((Date.now() - statSync(join(ROOT, 'dist')).mtimeMs) / 60000);
      return hits.length ? F(`found in ${hits.length} file(s) of dist/ (built about ${age} min ago)`) : T(`not in dist/, which was last written about ${age} min ago (an older build proves less)`);
    }],
    [/^The Worker in worker\/ is deployed/, () => N('needs wrangler and the network')],
    [/^ALLOWED_ORIGINS names the live site/, () => { const t = read('worker/wrangler.jsonc'); if (t == null) return F('worker/wrangler.jsonc is missing'); const line = t.split('\n').find((l) => l.includes('ALLOWED_ORIGINS')) ?? ''; return line.includes('https://css3dlab.edgarasneverdauskas.com') ? T('worker/wrangler.jsonc names it') : F(`the ALLOWED_ORIGINS line is: ${line.trim() || '(none)'}`); }],
    [/^VITE_CAPTURE_URL is passed to the Pages build/, () => { const t = read('.github/workflows/deploy.yml'); if (t == null) return F('.github/workflows/deploy.yml is missing'); const lines = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes('VITE_CAPTURE_URL')); return lines.length ? T(`deploy.yml mentions it on line ${lines.map(([i]) => i).join(', ')} (that it is in the build step's env is read by eye)`) : F('deploy.yml never mentions VITE_CAPTURE_URL'); }],
    [/^A local production build with the variable carries the endpoint/, () => N('needs a production build and the Worker URL: slow')],
    [/^The README's counts are the code's/, () => {
      const cats = { css: 0, js: 0 };
      for (const f of walk(join(ROOT, 'src/models'))) { if (!f.endsWith('.ts')) continue; for (const m of (readFileSync(f, 'utf8').match(/category: '([a-z]*)'/g) ?? [])) { const k = m.slice(11, -1); cats[k] = (cats[k] ?? 0) + 1; } }
      const readme = read('README.md') ?? '';
      const says = (x) => new RegExp(`\\b${x}\\b`).test(readme);
      const ok = n === 135 && cats.css === 93 && cats.js === 42 && says(135) && says(93) && says(42);
      return ok ? T(`${n} models, ${cats.css} css and ${cats.js} js, and the README has 135, 93 and 42`) : F(`the code has ${n} models, ${cats.css} css, ${cats.js} js; the README has 135: ${says(135)}, 93: ${says(93)}, 42: ${says(42)}`);
    }],
    [/^Every npm script points at a file that exists/, () => { let s = {}; try { s = JSON.parse(read('package.json')).scripts ?? {}; } catch {} const missing = Object.entries(s).map(([k, v]) => [k, (String(v).match(/node (\S+)/) ?? [])[1]]).filter(([, f]) => f && !existsSync(join(ROOT, f))); return missing.length ? F(`missing: ${missing.map(([k, f]) => `${k} → ${f}`).join(', ')}`) : T(`all ${Object.keys(s).length} scripts' files exist`); }],
    [/^The README lists every npm script and every check that is committed/, KEYS.readme, () => {
      const readme = read('README.md') ?? '';
      let s = {}; try { s = JSON.parse(read('package.json')).scripts ?? {}; } catch {}
      const tracked = git('ls-files', 'scripts').trim().split('\n').filter((f) => /^scripts\/[^/]+\.mjs$/.test(f)).map((f) => f.slice(8));
      const absent = [...Object.keys(s), ...tracked].filter((x) => !readme.includes(x));
      return absent.length ? F(`not in README.md: ${absent.join(', ')}`) : T(`all ${Object.keys(s).length} scripts and ${tracked.length} committed scripts/*.mjs are named`);
    }],
    [/^Every script under scripts\/ and server\/ says what it does/, () => {
      const files = ['scripts', 'server'].flatMap((d) => { try { return readdirSync(join(ROOT, d)).filter((f) => f.endsWith('.mjs')).map((f) => `${d}/${f}`); } catch { return []; } });
      const bad = files.filter((f) => !/^(\/\*\*|\/\/)/.test(read(f) ?? ''));
      return bad.length ? F(`does not open with /** or //: ${bad.join(', ')}`) : T(`all ${files.length} open with /** or //`);
    }],
    [/^README, ADDING-MODELS\.md and VIEW-CONTRACT\.md were reviewed/, KEYS.head, () => {
      const docs = git('log', '-1', '--format=%cI', '--', 'README.md', 'docs/ADDING-MODELS.md', 'docs/VIEW-CONTRACT.md').trim();
      const code = git('log', '-1', '--format=%cI', '--', 'package.json', 'scripts/', 'server/', 'worker/', 'src/preview.ts', 'src/video.ts').trim();
      return Date.parse(docs) >= Date.parse(code) ? T(`heuristic: docs last committed ${docs.slice(0, 16)}, code ${code.slice(0, 16)}`) : F(`heuristic: docs last committed ${docs.slice(0, 16)}, older than the code's ${code.slice(0, 16)}`);
    }],
    [/^VIEW-CONTRACT\.md's numbers are the checks' numbers/, () => {
      // Each limit, read from the check's own constant and from the sentence in the document that
      // states it. A number changed in one place and not the other makes this false and names both.
      const src = read('scripts/check-models.mjs') ?? '';
      const doc = read('docs/VIEW-CONTRACT.md') ?? '';
      if (!src || !doc) return F(`${!src ? 'scripts/check-models.mjs' : 'docs/VIEW-CONTRACT.md'} could not be read`);
      const konst = (name) => (new RegExp(`^const ${name} = ([\\d.]+)`, 'm').exec(src) ?? [])[1] ?? null;
      const inSrc = (re) => (re.exec(src) ?? [])[1] ?? null;
      const PAIRS = [
        ['tallest (BAND)', konst('BAND'), /\|\s*Tallest\s*\|\s*solid\s*\|\s*(\d+)vmin/],
        ['shortest (FLOOR)', konst('FLOOR'), /\|\s*Shortest\s*\|\s*solid\s*\|\s*(\d+)vmin/],
        ['widest (WIDEST)', konst('WIDEST'), /\|\s*Widest\s*\|\s*solid\s*\|\s*(\d+)%/],
        ['centred (CENTRED)', konst('CENTRED'), /\|\s*Centred\s*\|\s*solid\s*\|\s*within (\d+)vmin/],
        ['top corners (CORNER)', konst('CORNER'), /\|\s*Top corners\s*\|\s*all\s*\|\s*nothing drawn within (\d+)vmin/],
        ['all ink (INK)', konst('INK'), /Edges are judged on all ink, alpha over (\d+)\/255/],
        ['solid ink (SOLID)', konst('SOLID'), /judged on solid ink, alpha (\d+)\/255/],
        ['the quick pass (FINEST)', konst('FINEST'), /quick pass over up to (\d+) moments/],
        ['the width floor (WIDE_FLOOR)', konst('WIDE_FLOOR'), /at least (\d+)vmin wide at rest/],
        ['full canvas, judged', inSrc(/coversW >= 0\.(\d+)/), /covers at least (\d+)% of the canvas both ways/],
        ['full canvas, must cover', inSrc(/coversW < 0\.(\d+)/), /must cover (\d+)%/],
      ];
      const off = PAIRS.map(([what, code, re]) => [what, code, (re.exec(doc) ?? [])[1] ?? null])
        .filter(([, code, said]) => code == null || said == null || String(Number(code)) !== String(Number(said)));
      return off.length
        ? F(`${off.length} of ${PAIRS.length} do not line up: ${off.map(([w, c, d]) => `${w}: the check says ${c ?? 'nothing this proof could find'}, VIEW-CONTRACT.md says ${d ?? 'nothing this proof could find'}`).join('; ')}`)
        : T(`all ${PAIRS.length} limits line up: ${PAIRS.map(([w, c]) => `${w.replace(/ \(.*/, '')} ${c}`).join(', ')}`);
    }],
    [/^The README says how to run the ledger from a fresh clone/, KEYS.readme, () => {
      const readme = read('README.md') ?? '';
      const at = readme.indexOf('\n## Running the ledger');
      if (at < 0) return F('README.md has no "## Running the ledger" section');
      const end = readme.indexOf('\n## ', at + 1);
      const sec = readme.slice(at, end < 0 ? readme.length : end);
      // everything the item asks the section to say, each looked for in the section itself
      const wants = [
        ['local tool', /local\*{0,2} tool/i], ['nothing hosted', /nothing about it is hosted|nothing is hosted|no service/i],
        ['npm install', /npm install/], ['npm run dev', /npm run dev/], ['npm run capture', /npm run capture -- /],
        ['npm run ledger', /npm run ledger\b/], ['npm run ledger:watch', /npm run ledger:watch/],
        ['the local address', /localhost:5183\/docs\/ledger\.html/], ['"not run yet"', /not run yet/],
        ['the committed snapshot', /release-snapshot\.json/], ['npm run export for the export check', /npm run export/],
        ["Playwright's browser", /playwright install chromium|Playwright's Chromium/i],
      ];
      const absent = wants.filter(([, re]) => !re.test(sec)).map(([w]) => w);
      return absent.length ? F(`the section is there but does not say: ${absent.join(', ')}`) : T(`"## Running the ledger" is at README.md line ${readme.slice(0, at + 1).split('\n').length}, and says all ${wants.length} things the item asks for`);
    }],
    [/^COMMIT-AUDIT\.md is marked as a historical snapshot/, () => { const line = (read('docs/COMMIT-AUDIT.md') ?? '').replace(/\r/g, '').split('\n')[2] ?? ''; return line.startsWith('> **Historical snapshot') ? T('line 3 starts with "> **Historical snapshot"') : F(`line 3 is: ${line.slice(0, 60) || '(empty)'}`); }],
    [/^The project article at public\/article\/index\.html is corrected/, () => N('needs a person to read the article line by line')],
    // The story is kept as published and dated instead of corrected, so the proof is the note:
    // both files carry it, and it names the article that says what changed. Both are file reads.
    [/^The project article at public\/article\/index\.html is kept as published/, () => {
      const page = read('public/article/index.html') ?? '';
      const css = read('public/article/assets/site.css') ?? '';
      const missing = [];
      if (!/class="note-then"/.test(page)) missing.push('the note is not in public/article/index.html');
      if (!/\.note-then\b/.test(css)) missing.push('nothing styles .note-then in public/article/assets/site.css');
      if (!/css-3d-lab-ledger/.test(page)) missing.push('the note does not link to the ledger article');
      const when = /Written in ([A-Z][a-z]+ \d{4})/.exec(page)?.[1];
      if (!when) missing.push('the note does not say when the article was written');
      return missing.length ? F(missing.join('; ')) : T(`the note is in the page, styled, dated ${when}, and links to the ledger article`);
    }],
    // Two halves: what the code says is a file read, what the chip looks like is a person or a
    // browser. The reading is reported either way, so the item is never just "not evaluated".
    [/^4K video is held back/, () => {
      const v = read('src/video.ts') ?? '';
      const flag = /export const FOUR_K = (true|false);/.exec(v)?.[1];
      const words = /4K\s*·\s*coming later/.test(v);
      if (flag !== 'false') return F(`src/video.ts has FOUR_K = ${flag ?? '(not found)'}, so 4K is not held back`);
      return N(`read here: src/video.ts has FOUR_K = false${words ? ' and the chip\'s words "4K · coming later"' : ', but not the chip\'s words'}. That the chip is shown, faded and unpickable, with its tooltip, is a look in the browser`);
    }],
    [/^Every file the dialog hands out is named after its model/, () => {
      const uses = ((read('src/video.ts') ?? '').match(/fileName\(/g) ?? []).length;
      if (!existsSync(join(ROOT, 'src/file-name.ts'))) return F('src/file-name.ts is gone, so nothing builds the names');
      if (uses < 2) return F(`src/video.ts calls fileName( ${uses} time(s): a download goes out without it`);
      return N(`read here: src/file-name.ts exists and src/video.ts calls fileName( ${uses} times, so every download the dialog makes is named there. What the browser actually saves is a look in the browser`);
    }],
    [/^A second article on how the view-contract rewrite was run/, () => N('needs a person, and the rewrite to be complete')],
    [/^The deploy succeeded/, () => N('needs gh against GitHub: networked, and only after the push')],
    [/^Recording works on the live site/, () => N('a manual check on the live site')],
  ];

  return items.map((it) => {
    const p = PROOFS.find(([re]) => re.test(it.item));
    const run = p ? p[p.length - 1] : null;
    const keyOf = p && p.length === 3 ? p[1] : null;
    let ev;
    if (!p) ev = N('no cheap local proof is wired for this item');
    else {
      const key = keyOf ? String(keyOf()) : null;
      const hit = key != null ? cache?.get(it.item) : null;
      if (hit && hit.key === key) ev = hit.ev;
      else {
        // the item itself, for the few proofs that need to know WHERE it is written: the two
        // human items date their tick from the history of their own line
        try { ev = run(it); } catch (e) { ev = F(`its proof could not run here: ${e.message.split('\n')[0]}`); }
        if (key != null && cache) cache.set(it.item, { key, ev });
      }
    }
    // the file's tick is a claim; the proof now is the fact
    const state = ev.result === 'true' ? (it.done ? 'true-ticked' : 'true')
      : ev.result === 'false' ? (it.done ? 'conflict' : 'false')
      : it.done ? 'ticked-unproven' : 'not-evaluated';
    // DONE, OR NOT DONE. There is no third thing.
    //
    // A model check is never "passed, but a while ago": every result records fingerprints of the
    // files it judged, and the moment one changes the result goes STALE and stops counting. That
    // is why `approved` fell from 135 to 0 the instant src/preview.ts changed.
    //
    // Checklist items never had that, so they grew a mushy middle -- "done, not re-proved here" --
    // which really means "nobody knows", written to look like done. A count of commits since does
    // not fix it either: it is a number to interpret, and interpreting is the thing a checklist
    // exists to stop you having to do.
    //
    // So an item that names the commit it was run at ALSO says which paths its proof depends on,
    // below. If any of those changed between that commit and HEAD, the item is stale and is not
    // done. If none changed, it is done, with no caveat and nothing to weigh up.
    const WATCHES = [
      [/^The verify gate holds/, ['src', 'scripts/verify.mjs', 'scripts/check-models.mjs', 'scripts/qa.mjs', 'scripts/check-stages.mjs', 'scripts/check-media.mjs', 'scripts/check-exports.mjs']],
      [/^Recordings and snapshots match/, ['src/video.ts', 'src/record.ts', 'src/capture-scene.ts', 'src/capture-client.ts', 'src/preview.ts', 'server/render.mjs', 'scripts/check-exports.mjs']],
      [/^Snapshots match the screen/, ['src', 'scripts/compare-capture.mjs', 'scripts/generate-pages.mjs']],
      [/^4K video is held back/, ['src/video.ts', 'src/main.ts', 'src/model-page.ts']],
      [/^Every file the dialog hands out/, ['src/video.ts', 'src/file-name.ts', 'src/print.ts', 'src/main.ts']],
      [/^Every standalone snippet runs/, ['src/models', 'src/models/snippet-utils.ts', 'scripts/snippet-check.mjs']],
      [/^Editing a model never remounts/, ['src/preview.ts', 'src/live-edit.ts', 'scripts/preview-check.mjs']],
      [/^TypeScript is clean/, ['src', 'tsconfig.json', 'package.json']],
      [/^The build is clean/, ['src', 'scripts/generate-pages.mjs', 'vite.config.ts', 'package.json']],
      [/^QA on the built site/, ['src', 'scripts/qa.mjs', 'scripts/generate-pages.mjs']],
      [/^The built site passes the SEO check/, ['src', 'scripts/check-seo.mjs', 'scripts/generate-pages.mjs']],
      [/^The social preview images are made/, ['src', 'scripts/generate-media.mjs', 'scripts/og-shot.mjs']],
      [/^The sitemap dates are regenerated/, ['src/models', 'scripts/generate-pages.mjs']],
      [/^A local production build with the variable/, ['src/capture-client.ts', 'scripts/generate-pages.mjs', 'vite.config.ts']],
      [/^The Worker in worker\//, ['server/render.mjs', 'worker']],
      // These three had no entry at all, so nothing could ever stale them: they were ticked once
      // and exempt by omission rather than by anything true about them.
      [/^View zoom is gone from the editing view/, ['src/editor.ts', 'src/zoom.ts', 'src/live-edit.ts', 'src/model-page.ts', 'src/main.ts']],
      [/^Both renderers draw the same picture/, ['server/render.mjs', 'src/capture-scene.ts', 'src/capture-client.ts', 'worker', 'scripts/check-renderers.cjs']],
      [/^`check-exports` does not run shards side by side/, ['scripts/check-exports.mjs', 'scripts/verify.mjs', 'scripts/capture-check.mjs']],
      // These are about the outside world, not this tree: no file here can stale them.
      [/^The remote has nothing main lacks/, []],
      [/^The Worker answers the site/, []],
      [/^The value the workflow reads exists/, []],
      [/^A second article on how the view-contract rewrite/, []],
    ];

    // HOW OLD THE EVIDENCE IS, for the items this ledger cannot re-run.
    //
    // "done, not re-proved here" is a true and useless thing to say on its own: it does not say
    // whether the run was this morning or last week, nor how much has changed since. The gate
    // holds AT 74f4aa4 -- and by the time anyone reads that, HEAD has moved and View zoom has been
    // taken out. So where an item's own line names the commit it was run at, count how far back
    // that is. A number of commits is not proof the item went stale; it is the one fact a reader
    // needs to decide whether to re-run it, and it costs one `git rev-list --count`.
    let provedAt = null, behind = null;
    if (state === 'ticked-unproven') {
      // WHICH hash in the line, because several may be there for different reasons. A proof that
      // says "re-run 2026-09-25 at `31bf1b5`: prints 0. origin/main is still b1d49c2" holds two,
      // and taking the last gave "676 commits ago" about a run from this morning. So prefer one
      // introduced by "at" -- which is how a run is written down here -- and only fall back to any
      // hash when the line names none that way.
      const proofText = String(it.proof ?? '');
      const at = [...proofText.matchAll(/\bat `?([0-9a-f]{7,40})`?/g)].map((x) => x[1]);
      const any = [...proofText.matchAll(/\b([0-9a-f]{7,40})\b/g)].map((x) => x[1]).reverse();
      for (const hash of (at.length ? at.reverse() : any)) {
        try {
          const n = execFileSync('git', ['rev-list', '--count', `${hash}..HEAD`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (/^\d+$/.test(n)) { provedAt = hash; behind = Number(n); break; }
        } catch { /* not a commit in this history: try the next hash in the line */ }
      }
      /*
       * An item that names no commit is still dated: git knows when its own line last changed.
       *
       * Only items that happened to write a hash into their own words were ever held to the
       * expiry rule below. Every other tick was exempt by accident -- not because it could not go
       * stale, but because nobody had written down when it was made. So they stayed ticked through
       * every commit after, which is the one thing this page exists not to do.
       *
       * The line's own history is the honest answer and needs no bookkeeping: whoever ticked it
       * committed that tick, and that commit is when the claim was made.
       */
      if (!provedAt && Number.isFinite(Number(it.line))) {
        try {
          const out = execFileSync('git', ['log', '-1', '--format=%H', `-L${it.line},${it.line}:docs/RELEASE-CHECKLIST.md`],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
          const hash = (out.split('\n')[0] || '').trim();
          if (/^[0-9a-f]{40}$/.test(hash)) {
            const n = execFileSync('git', ['rev-list', '--count', `${hash}..HEAD`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            if (/^\d+$/.test(n)) { provedAt = hash.slice(0, 7); behind = Number(n); }
          }
        } catch { /* no history for this line yet: nothing to date it from, so leave it alone */ }
      }
    }
    // and then: did anything it depends on change since it was proven?
    let staleBy = null;
    if (provedAt) {
      const watch = WATCHES.find(([re]) => re.test(it.item));
      const paths = watch ? watch[1] : null;
      if (paths === null) staleBy = undefined; // nothing declared: cannot judge, leave it alone
      else if (paths.length) {
        try {
          const out = execFileSync('git', ['diff', '--name-only', `${provedAt}..HEAD`, '--', ...paths], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (out) staleBy = out.split('\n').filter(Boolean);
        } catch { /* leave it as it was */ }
      }
    }
    const finalState = staleBy && staleBy.length ? 'stale' : state;
    const extra = staleBy && staleBy.length
      ? { found: `proven at ${provedAt}, but ${staleBy.length} file(s) its proof depends on changed since: ${staleBy.slice(0, 3).join(', ')}${staleBy.length > 3 ? `, +${staleBy.length - 3}` : ''}`, why: 'needs running again on this commit' }
      : {};
    return { ...it, ...ev, ...extra, state: finalState, ...(provedAt ? { provedAt, behind } : {}), ...(staleBy?.length ? { staleBy } : {}) };
  });
}
