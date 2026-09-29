/**
 * How every check opens a browser: one place, so the answer to "which Chromium do the checks run
 * on" is written once -- and, since 2026-09-29, so that every result can say which one it was.
 *
 * THE HISTORY, BECAUSE IT KEEPS HAPPENING
 *
 * Since Playwright 1.49, `chromium.launch({ headless: true })` with no channel starts
 * chrome-headless-shell, a separate binary. On 2026-09-23 Windows Smart App Control on this
 * machine began blocking it -- every launch died with `spawn UNKNOWN`, and the Code Integrity log
 * said "An Application Control policy has blocked this file". The full Chromium build Playwright
 * installs beside it was not blocked, so the checks asked for it by name: `channel: 'chromium'`.
 *
 * On 2026-09-29 the policy reached that one too. `chrome.exe --version`, run by hand, answered
 * "An Application Control policy has blocked this file", and the binary is NotSigned. Every
 * browser-driven check on the project stopped at once, mid-gate, reporting reds about snapshots
 * and downloads that were nothing of the kind.
 *
 * Smart App Control has no exclusion list and turning it off cannot be undone without reinstalling
 * Windows, so the answer is not to argue with it: it is to use a browser it already trusts. A
 * signed Brave, Chrome or Edge is the same engine at a nearby version, and it runs.
 *
 * WHICH BROWSER IS PART OF THE RESULT
 *
 * That last point is the whole reason this file now reports an identity. Several checks are
 * CALIBRATED: check-worker-parity holds treemap to a difference of 1.36 measured against the
 * Worker's Linux Chromium, and check-perf's frame budgets were measured on a particular build.
 * Quietly swapping the local browser would move those numbers and the board would read the
 * movement as a regression -- a false red of exactly the kind this project spent a week learning
 * to spot. So BROWSER_ID goes into the records, and a result measured on another browser is stale
 * for the same reason a result measured on other code is.
 *
 * Structural checks do not care: whether a page throws, whether a frame remounts, whether a
 * download is named for its model. Those are the same answer on any recent Chromium.
 *
 *   C3D_BROWSER=auto      the default: Playwright's own build, then a signed system browser
 *   C3D_BROWSER=chromium  Playwright's build only -- fail rather than fall back
 *   C3D_BROWSER=brave|chrome|edge   that one
 *   C3D_BROWSER=<path to an exe>    exactly that
 */
import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CHROMIUM_CHANNEL = 'chromium';

/** A launch that failed because something refused to START the binary, not because of its flags. */
const BLOCKED = /spawn UNKNOWN|Application Control|EPERM|EACCES|ENOENT|not recognized|Failed to launch/i;

/* Signed, already-trusted Chromium builds, in the order they are worth trying. Edge is last
   because it is the most heavily modified of the three, not because it does not work. */
const SYSTEM = [
  ['brave', [
    `${process.env.ProgramFiles ?? ''}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${process.env['ProgramFiles(x86)'] ?? ''}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ]],
  ['chrome', [
    `${process.env.ProgramFiles ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  ]],
  ['edge', [
    `${process.env['ProgramFiles(x86)'] ?? ''}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles ?? ''}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ]],
];

/*
 * Read the version off the disk, never by running the browser.
 *
 * `brave.exe --version` on an already-running Brave does not print a version: it hands the
 * argument to the running instance, which opens a tab, and answers "Opening in existing browser
 * session." That went straight into a result as the browser's version, and it opened a window on
 * somebody's desktop to do it. Chromium builds keep their version as a folder beside the exe
 * (Application/154.1.96.59/), which is there whether or not the browser is running.
 */
const versionOf = (exe) => {
  try {
    const dir = dirname(exe);
    const v = readdirSync(dir).filter((n) => /^[0-9]+([.][0-9]+){2,3}$/.test(n)).sort().at(-1);
    return v ?? null;
  } catch { return null; }
};

/** Where a named system browser is, or null. */
export function findSystemBrowser(name) {
  const entry = SYSTEM.find(([n]) => n === name);
  if (!entry) return null;
  const exe = entry[1].filter(Boolean).find((p) => existsSync(p));
  return exe ? { name, exe } : null;
}

let chosen = null; // decided once per process: a check opens many browsers

/*
 * REMEMBER WHAT THE POLICY SAID, SO IT IS NOT ASKED AGAIN EVERY RUN.
 *
 * Trying Playwright's Chromium first is right the first time and wrong every time after: on a
 * machine where Smart App Control refuses it, each attempt raises a Windows notification -- "Part
 * of this app has been blocked" -- so a person watching a board gets one per run, about a decision
 * that was made an hour ago. It also costs a second of process launch to learn nothing new.
 *
 * So the answer is written down and tried first next time. It is re-checked when the remembered
 * browser stops working, which is what happens if a policy is lifted or a browser uninstalled, so
 * nothing is stuck with an old answer. It is a fact about this machine, so it lives beside the
 * doctor's note and is never committed.
 */
const REMEMBERED = new URL('../docs/checks/browser.json', import.meta.url);
const remember = (id, launch) => {
  try {
    mkdirSync(new URL('../docs/checks/', import.meta.url), { recursive: true });
    writeFileSync(REMEMBERED, `${JSON.stringify({
      note: 'Written by scripts/browser.mjs: which browser worked here last. Tried first so a refused one is not asked again every run. Describes this machine, so it is not committed.',
      at: new Date().toISOString(), ...id, launch,
    }, null, 2)}
`);
  } catch { /* remembering is an optimisation, not a requirement */ }
};
const recall = () => {
  try { return JSON.parse(readFileSync(REMEMBERED, "utf8")); } catch { return null; }
};

/**
 * Which browser this process will use, and why. Decided by actually launching one -- a binary that
 * exists and a binary that may run are different things, which is the entire lesson of today.
 */
export async function resolveBrowser() {
  if (chosen) return chosen;
  const want = (process.env.C3D_BROWSER ?? 'auto').trim();
  const tried = [];

  // what worked here last, tried first: a refused browser is not asked again every run
  const seen = want === "auto" ? recall() : null;
  if (seen?.launch) {
    try {
      const b = await chromium.launch(seen.launch);
      await b.close().catch(() => {});
      chosen = { kind: seen.kind, name: seen.name, version: seen.version ?? null, label: seen.name, launch: seen.launch };
      return chosen;
    } catch { /* it stopped working: fall through and decide again from scratch */ }
  }

  const tryLaunch = async (label, opts, id) => {
    try {
      const b = await chromium.launch(opts);
      await b.close().catch(() => {});
      chosen = { ...id, label, launch: opts };
      remember(id, opts);
      return true;
    } catch (e) {
      tried.push(`${label}: ${String(e?.message ?? e).split('\n')[0]}`);
      if (!BLOCKED.test(String(e?.message ?? e))) throw e; // a real problem, not a refusal
      return false;
    }
  };

  if (want.includes('\\') || want.includes('/')) {
    if (!existsSync(want)) throw new Error(`C3D_BROWSER points at ${want}, which is not there`);
    if (await tryLaunch(want, { executablePath: want }, { kind: 'path', name: want, version: versionOf(want) })) return chosen;
    throw new Error(`C3D_BROWSER=${want} could not start:\n  ${tried.join('\n  ')}`);
  }

  if (want === 'auto' || want === 'chromium') {
    const ok = await tryLaunch("Playwright's chromium", { channel: CHROMIUM_CHANNEL },
      { kind: 'playwright', name: 'playwright-chromium', version: null });
    if (ok) return chosen;
    if (want === 'chromium') throw new Error(`C3D_BROWSER=chromium and it could not start:\n  ${tried.join('\n  ')}`);
  }

  for (const [name] of SYSTEM) {
    if (want !== 'auto' && want !== name) continue;
    const found = findSystemBrowser(name);
    if (!found) { tried.push(`${name}: not installed`); continue; }
    if (await tryLaunch(name, { executablePath: found.exe }, { kind: 'system', name, version: versionOf(found.exe) })) {
      // Say it plainly, once. A run on a different browser than the records were made with is a
      // thing the reader has to know, and burying it would be the whole failure this project is about.
      console.error(`browser: Playwright's own Chromium could not start, using ${name} ${chosen.version ?? ''} instead.`);
      console.error(`browser: results measured here say so, and a calibrated check will call an old result stale rather than compare across browsers.`);
      return chosen;
    }
  }
  throw new Error(`no browser could be started:\n  ${tried.join('\n  ')}\n\nSmart App Control blocks unsigned binaries and has no exclusion list. Install a signed browser (Brave, Chrome or Edge), set C3D_BROWSER to its path, or run these checks where the policy does not apply.`);
}

/**
 * What produced a result, for the records. Null until a browser has actually been opened, because
 * before that it is a guess.
 */
export function browserId() {
  if (!chosen) return null;
  return { kind: chosen.kind, name: chosen.name, version: chosen.version ?? null };
}

/** chromium.launch with this project's browser, and the caller's options over it. */
export async function launchChromium(options = {}) {
  const b = await resolveBrowser();
  return chromium.launch({ ...b.launch, ...options });
}
