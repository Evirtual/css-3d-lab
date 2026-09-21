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
    queue: () => `${H}|${mtime('docs/ledger-queue.json')}`,
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
  const walk = (dir) => { const out = []; const go = (d) => { let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const f = join(d, e.name); e.isDirectory() ? go(f) : out.push(f); } }; go(dir); return out; };

  const PROOFS = [
    [/^The working tree is clean/, () => atRiskList.length ? F(`${atRiskList.length} path(s) in git status, e.g. ${atRiskList.slice(0, 3).map((x) => x.path).join(', ')}`) : T('git status prints nothing')],
    [/^The main index matches HEAD/, KEYS.index, () => exits0('diff', '--cached', '--quiet', 'HEAD') ? T('git diff --cached HEAD is empty') : F(`the main index differs from HEAD in ${git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean).length} path(s)`)],
    [/^scripts\/verify\.mjs and scripts\/check-exports\.mjs are committed/, KEYS.head, () => {
      const tracked = git('ls-files', 'scripts/verify.mjs', 'scripts/check-exports.mjs').trim().split('\n').filter(Boolean);
      let pkg = ''; try { pkg = git('show', 'HEAD:package.json'); } catch {}
      const entry = /"verify"\s*:/.test(pkg);
      return tracked.length === 2 && entry ? T('both are tracked, and HEAD:package.json has "verify"') : F(`tracked: ${tracked.join(', ') || 'neither'}; "verify" in HEAD:package.json: ${entry ? 'yes' : 'no'}`);
    }],
    [/^The lead's queue has nothing running/, KEYS.queue, () => {
      let running = []; try { running = (JSON.parse(read('docs/ledger-queue.json')).items ?? []).filter((i) => i.status === 'running'); } catch { return F('docs/ledger-queue.json could not be read'); }
      const committed = exits0('diff', '--quiet', 'HEAD', '--', 'docs/ledger-queue.json');
      return !running.length && committed ? T('no running item, and the file matches HEAD') : F(`${running.length} running (${running.map((i) => i.name).slice(0, 3).join('; ') || 'none'}); file matches HEAD: ${committed ? 'yes' : 'no'}`);
    }],
    [/^Local-only files stay local/, KEYS.index, () => { const t = git('ls-files', 'hero-options.html', 'og-preview.html', 'harness-tmp').trim(); return t ? F(`tracked: ${t.split('\n').join(', ')}`) : T('none of them is tracked'); }],
    [/^The remote has nothing main lacks/, () => N('needs git fetch, which uses the network')],
    [/^The verify gate holds/, () => N('npm run verify runs every check in browsers: slow')],
    [/^Every model is converted/, () => counts.notConverted === 0 && counts.converted === n ? T(`${counts.converted} of ${n} converted`) : F(`${counts.converted} of ${n} converted, ${counts.notConverted} not`)],
    [/^Every model is approved/, () => counts.approved === n ? T(`${n} of ${n} approved`) : F(`${counts.approved} of ${n} approved`)],
    [/^The ledger was built on the commit being pushed/, () => (H.startsWith(head) ? T(`built at ${head}, which is HEAD as this ledger was written (the watcher rebuilds when main moves)`) : F(`built at ${head}, HEAD is ${H.slice(0, 7) || 'unreadable'}`))],
    [/^No contract result is stale or failing/, () => { const c = counts.checks.models ?? {}; const keys = Object.keys(c); return keys.length === 1 && c.pass === n ? T(`"pass":${n}`) : F(JSON.stringify(c)); }],
    [/^check-stages has judged every model/, () => { const ok = models.filter((m) => m.checks.stages?.status === 'pass' && !m.checks.stages.stale).length; return ok === n ? T(`from the recorded results: ${n} of ${n} pass on the current code`) : F(`from the recorded results: ${ok} of ${n} have a fresh pass (the proof itself, a full capture run, is not run here)`); }],
    [/^check-motion has run over every model/, () => {
      const ran = models.filter((m) => m.checks.motion && m.checks.motion.status !== 'never' && !m.checks.motion.stale);
      const flagged = ran.filter((m) => ['flagged', 'broke'].includes(m.checks.motion.status));
      const unseen = flagged.filter((m) => !(m.reviews ?? []).some((r) => r.kind === 'visual'));
      return ran.length === n && !unseen.length ? T(`from the recorded results: ${n} of ${n} ran on the current code; ${flagged.length} flagged, each with a visual review`) : F(`from the recorded results: ${ran.length} of ${n} ran on the current code; ${unseen.length} flagged model(s) without a visual review`);
    }],
    [/^Recordings and snapshots match the dialog's canvas at every setting/, () => N('check-exports over its sample takes many minutes of browser work')],
    [/^Snapshots match the screen/, () => N('npm run compare captures in a browser: slow')],
    [/^Every standalone snippet runs without a script error/, () => N('snippet-check runs every snippet in a browser, after npm run generate: slow and writes files')],
    [/^Editing a model never remounts or moves its frame/, () => N('preview-check drives a browser: slow')],
    [/^The old implementation is gone/, () => {
      let files = 0; try { files = readdirSync(join(ROOT, 'src/styles/models')).length; } catch {}
      const uses = ((read('src/styles/main.scss') ?? '').match(/@use 'models\//g) ?? []).length;
      return !files && !uses ? T('src/styles/models is empty and main.scss uses none of it') : F(`src/styles/models holds ${files} file(s); main.scss has ${uses} @use 'models/ line(s) (the item allows keeping it only if VIEW-CONTRACT.md and the README say so, which is not checked here)`);
    }],
    [/^TypeScript is clean/, () => N('tsc over the project is slow')],
    [/^The build is clean/, () => N('npm run build is slow and writes dist/')],
    [/^QA on the built site finds nothing/, () => N('npm run qa needs a fresh build: slow')],
    [/^The social preview images are made/, () => N('npm run media renders images: slow and writes files')],
    [/^Every model's share preview is right/, () => { const ok = models.filter((m) => m.checks.media?.status === 'pass' && !m.checks.media.stale).length; return ok === n ? T(`from the recorded results: ${n} of ${n} pass check-media on the current code`) : F(`from the recorded results: ${ok} of ${n} have a fresh check-media pass`); }],
    [/^The build works on the Node the workflow uses/, () => /^v22\./.test(process.version) ? T(`node -v is ${process.version}`) : F(`node -v is ${process.version}, the workflow uses 22 (the item also allows "the build above was run on 22", not checked here)`)],
    [/^The sitemap dates are regenerated/, () => N('its proof runs npm run generate, which writes files')],
    [/^The dev fallback address is not in the production bundle/, KEYS.dist, () => {
      if (!existsSync(join(ROOT, 'dist'))) return F('there is no dist/ to search: build first');
      const hits = walk(join(ROOT, 'dist')).filter((f) => /\.(js|html|css|json|map)$/.test(f)).filter((f) => { try { return readFileSync(f, 'utf8').includes('127.0.0.1:8787'); } catch { return false; } });
      const age = Math.round((Date.now() - statSync(join(ROOT, 'dist')).mtimeMs) / 60000);
      return hits.length ? F(`found in ${hits.length} file(s) of dist/ (built about ${age} min ago)`) : T(`not in dist/, which was last written about ${age} min ago (an older build proves less)`);
    }],
    [/^The Worker in worker\/ is deployed/, () => N('needs wrangler and the network')],
    [/^ALLOWED_ORIGINS names the live site/, () => { const t = read('worker/wrangler.jsonc'); if (t == null) return F('worker/wrangler.jsonc is missing'); const line = t.split('\n').find((l) => l.includes('ALLOWED_ORIGINS')) ?? ''; return line.includes('https://css3dlab.edgarasneverdauskas.com') ? T('worker/wrangler.jsonc names it') : F(`the ALLOWED_ORIGINS line is: ${line.trim() || '(none)'}`); }],
    [/^The Worker answers the site and refuses anyone else/, () => N('needs curl against the deployed Worker: networked')],
    [/^VITE_CAPTURE_URL is passed to the Pages build/, () => { const t = read('.github/workflows/deploy.yml'); if (t == null) return F('.github/workflows/deploy.yml is missing'); const lines = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes('VITE_CAPTURE_URL')); return lines.length ? T(`deploy.yml mentions it on line ${lines.map(([i]) => i).join(', ')} (that it is in the build step's env is read by eye)`) : F('deploy.yml never mentions VITE_CAPTURE_URL'); }],
    [/^The value the workflow reads exists in the repository settings/, () => N('needs gh against GitHub: networked')],
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
    [/^VIEW-CONTRACT\.md's numbers are the checks' numbers/, () => N('comparing the table to the constants needs a person to read both')],
    [/^COMMIT-AUDIT\.md is marked as a historical snapshot/, () => { const line = (read('docs/COMMIT-AUDIT.md') ?? '').replace(/\r/g, '').split('\n')[2] ?? ''; return line.startsWith('> **Historical snapshot') ? T('line 3 starts with "> **Historical snapshot"') : F(`line 3 is: ${line.slice(0, 60) || '(empty)'}`); }],
    [/^The project article at public\/article\/index\.html is corrected/, () => N('needs a person to read the article line by line')],
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
        try { ev = run(); } catch (e) { ev = F(`its proof could not run here: ${e.message.split('\n')[0]}`); }
        if (key != null && cache) cache.set(it.item, { key, ev });
      }
    }
    // the file's tick is a claim; the proof now is the fact
    const state = ev.result === 'true' ? (it.done ? 'true-ticked' : 'true')
      : ev.result === 'false' ? (it.done ? 'conflict' : 'false')
      : it.done ? 'ticked-unproven' : 'not-evaluated';
    return { ...it, ...ev, state };
  });
}
