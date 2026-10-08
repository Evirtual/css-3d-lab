/**
 * Every character a model shows, checked against the four faces an export carries.
 *
 *   node scripts/check-glyphs.mjs        every model (the dev server is started for it)
 *
 * WHY. Only Inter 400/700 and JetBrains Mono 400/600 travel with an exported scene
 * (src/fonts/capture-fonts.ts), and only their Latin subsets. A character outside them -- ★, ♠,
 * →, ▾, ⅓ -- is drawn in whatever font each machine finds, even under `font: … Inter`, so the
 * export's star is not the screen's star, and every visitor's device picks its own as well. The
 * font scan in check-worker-parity reads font NAMES and could not see it; comparing pictures found
 * coin, cardfan and vinyl one by one (2026-10-07/08), and this found dropdown, funnel, rollbutton
 * and waterfall the same day by asking the fonts directly. check-worker-parity runs it every time
 * it asks the Worker, so a release cannot ship a character the export will swap.
 *
 * HOW, without reading the font files. A face that lacks a character falls back to the next font
 * in the list, and the text takes that font's width. Measured as `face, serif` and as
 * `face, monospace`, a character the face has is the same width both times; one it lacks is not.
 * ASCII and whitespace are skipped: every face has them.
 */
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './model-sources.mjs';

/** The faces an export carries, as src/fonts/capture-fonts.ts lists them. */
export const FACES = [['Inter', 400, 'inter-latin-400'], ['Inter', 700, 'inter-latin-700'], ['JetBrains Mono', 400, 'jetbrains-mono-latin-400'], ['JetBrains Mono', 600, 'jetbrains-mono-latin-600']];

/**
 * [{ char, code, ids }] for every character some model shows that some face lacks. `browser` is a
 * Playwright browser, `base` the dev server's address; `ids` defaults to every generated page.
 * Models that could not be read are returned in `unread`.
 */
export async function missingGlyphs(browser, base, ids = readdirSync(join(ROOT, 'models'))) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const chars = new Map();
  const unread = [];
  for (const id of ids) {
    try {
      await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForSelector('.stage iframe[data-ready="true"]', { timeout: 60_000 });
      const frame = page.frames().find((f) => f.parentFrame() === page.mainFrame());
      const text = await frame.evaluate(() => {
        let t = document.body.innerText;
        for (const el of document.querySelectorAll('*')) for (const p of ['::before', '::after']) {
          const c = getComputedStyle(el, p).content;
          if (c && c !== 'none' && c !== 'normal') t += c;
        }
        return t;
      });
      for (const ch of new Set([...text])) {
        if (ch.codePointAt(0) < 0x7f || /\s/.test(ch)) continue;
        if (!chars.has(ch)) chars.set(ch, new Set());
        chars.get(ch).add(id);
      }
    } catch (e) {
      unread.push(`${id}: ${String(e?.message ?? e).split('\n')[0]}`);
    }
  }
  await page.goto(`${base}/`);
  const css = FACES.map(([f, w, file]) => `@font-face{font-family:"G-${f}-${w}";src:url(/src/fonts/${file}.woff2) format("woff2")}`).join('');
  const lacking = await page.evaluate(async ([css, faces, list]) => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.append(s);
    await Promise.all(faces.map(([f, w]) => document.fonts.load(`40px "G-${f}-${w}"`, 'A')));
    const c = document.createElement('canvas').getContext('2d');
    const width = (font, ch) => { c.font = font; return c.measureText(ch).width; };
    const out = {};
    for (const ch of list) {
      const missing = faces.filter(([f, w]) => Math.abs(width(`40px "G-${f}-${w}", serif`, ch) - width(`40px "G-${f}-${w}", monospace`, ch)) > 0.01);
      if (missing.length) out[ch] = missing.map(([f, w]) => `${f} ${w}`);
    }
    return out;
  }, [css, FACES, [...chars.keys()]]);
  await context.close();
  const missing = Object.entries(lacking).map(([char, faces]) => ({
    char, code: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`, faces, ids: [...chars.get(char)].sort(),
  }));
  return { missing, unread, checked: ids.length - unread.length, seen: [...chars.keys()] };
}

/** One line per missing character, the same here and in check-worker-parity. */
export function sayGlyphs({ missing, unread, checked, seen }) {
  const lines = [`check-glyphs: ${checked} model(s) read; characters beyond ASCII they show: ${seen.join(' ') || 'none'}`];
  for (const m of missing) lines.push(`  OFF      ${m.char} ${m.code} is missing from ${m.faces.length === FACES.length ? 'every face an export carries' : m.faces.join(', ')}: ${m.ids.join(', ')}. Draw it (CSS or inline SVG), or write it in words.`);
  for (const u of unread) lines.push(`  unread   ${u}`);
  if (!missing.length) lines.push('  every one of them is in every face an export carries');
  return lines;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const { launchChromium } = await import('./browser.mjs');
  const vite = await createServer({ server: { port: 0 }, logLevel: 'silent' });
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await launchChromium();
  const result = await missingGlyphs(browser, base);
  for (const l of sayGlyphs(result)) console.log(l);
  await browser.close();
  await vite.close();
  process.exit(result.missing.length || result.unread.length ? 1 : 0);
}
