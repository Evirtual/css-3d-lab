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
 * does not tell the Worker how much of that is left. What the Worker CAN say is its own count
 * (180 s charged for each browser it opens: a browser stays open that long waiting for the next
 * export, and open time is what Cloudflare counts). That count is an estimate, said as one: it can
 * read low when a browser is kept busy past its 180 s, and the Cloudflare dashboard (Browser
 * Rendering) has the real figure.
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
  // on the free plan Cloudflare's 10 minutes refuse first; on a paid one, this site's own ceiling
  const free = (b.plan ?? 'free') === 'free';
  const limit = free ? Math.min(FREE_DAY, c.capDay) : c.capDay;
  const left = Math.max(0, limit - used);
  const h = Math.floor(c.resetsIn / 3600), m = Math.round((c.resetsIn % 3600) / 60);
  const lines = [
    `export budget today: about ${min(used)} of ${min(limit)} minutes used, about ${min(left)} left (${free ? "Cloudflare's free plan" : "this site's own daily ceiling"}; an estimate: ${b.browserSeconds ?? 180} s counted per browser opened); resets in ${h} h ${m} min, at 00:00 UTC`,
  ];
  if (free && c.capDay > FREE_DAY) lines.push(`  this site's own ceiling is ${min(c.capDay)} min a day, but on the free plan Cloudflare's 10 refuse first`);
  lines.push(`  this month: ${(c.usedMonth / 3600).toFixed(1)} of ${(c.capMonth / 3600).toFixed(1)} h`);
  if (b.platform) lines.push(`  right now: ${b.platform.browsersOpen} browser(s) open${b.platform.newBrowserWaitSeconds > 0 ? `, a new one allowed in ${b.platform.newBrowserWaitSeconds} s` : ''}`);
  return lines;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const b = await readBudget();
  if (!b) process.exit(1);
  if (process.argv.includes('--json')) console.log(JSON.stringify(b, null, 2));
  else for (const l of sayBudget(b)) console.log(l);
}
