/**
 * How much of today's export time is used, read from the Worker without spending any of it.
 *
 *   node scripts/export-budget.mjs          what is used, what is left, when it resets
 *   node scripts/export-budget.mjs --json   the Worker's answer as it came
 *
 * WHY. Every visitor's export and the release's parity step draw on one allowance, and until
 * 2026-10-05 the only way to see it was spent was to be refused: two releases on 2026-10-04 used
 * it up, and visitors could not export until 00:00 UTC. Now it can be read before a run.
 *
 * WHAT IT CAN AND CANNOT KNOW. Cloudflare's free plan gives 10 minutes of browser time a day and
 * does not tell the Worker how much of that is left. What the Worker CAN say is its own count: each
 * export's real browser time once it has finished (one browser per export, closed when it is
 * done), and its worst case while it is still running. Close to what Cloudflare counts and never
 * under it; the Cloudflare dashboard (Browser Run) has the exact figure.
 */
import { pathToFileURL } from 'node:url';

// the same default check-worker-parity.mjs uses; VITE_CAPTURE_URL overrides both
const WORKER_DEFAULT = 'https://css-3d-lab-capture.social-posts-pinata.workers.dev/capture';

const FREE_DAY = 600; // Cloudflare's free plan: 10 minutes of browser time a day
const url = new URL('/budget', process.env.VITE_CAPTURE_URL || WORKER_DEFAULT).href;
const min = (s) => (s / 60).toFixed(s % 60 ? 1 : 0);

/** The Worker's answer, or null with the reason printed. */
export async function readBudget() {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) { console.log(`export budget: the Worker answered HTTP ${r.status} at ${url} (deployed before /budget existed?)`); return null; }
    return await r.json();
  } catch (e) {
    console.log(`export budget: could not ask ${url}: ${String(e?.message ?? e)}`);
    return null;
  }
}

/** One or two lines a person can act on. Used here and by check-worker-parity before it spends. */
export function sayBudget(b) {
  const c = b?.counted;
  if (!c) return ['export budget: the Worker answered, but its own count could not be read'];
  const used = c.usedDay;
  // on the free plan Cloudflare's 10 minutes is the outer limit; the Worker's own day sits under it
  const free = (b.plan ?? 'free') === 'free';
  const limit = free ? Math.min(FREE_DAY, c.capDay) : c.capDay;
  const left = Math.max(0, limit - used);
  const h = Math.floor(c.resetsIn / 3600), m = Math.round((c.resetsIn % 3600) / 60);
  const running = c.active ? `, ${c.active} export(s) running, counted at their worst case until they finish` : '';
  return [
    `export budget today: ${min(used)} of ${min(limit)} minutes used, ${min(left)} left (${free ? 'free plan' : "this site's daily ceiling"}${running}); resets in ${h} h ${m} min, at 00:00 UTC`,
    `  one visitor may use up to ${min(c.visitorDay)} min a day; at most ${c.maxBrowsers} exports at once`,
    `  this month: ${(c.usedMonth / 3600).toFixed(1)} of ${(c.capMonth / 3600).toFixed(1)} h`,
    // Until 2026-10-05 the count charged a browser's launch and not its reuse, and read low: that
    // day it said 6 of 10 minutes while Cloudflare had already refused. Said every time, not trusted.
    `  this is the site's own count; Cloudflare's is the exact one (dashboard, Browser Run), and if it refuses first, it is right`,
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const b = await readBudget();
  if (!b) process.exit(1);
  if (process.argv.includes('--json')) console.log(JSON.stringify(b, null, 2));
  else for (const l of sayBudget(b)) console.log(l);
}
