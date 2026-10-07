/**
 * How a picture drawn here and the same scene drawn on the Worker are judged: fine detail strictly,
 * soft areas loosely, and the worst place in the picture, not its average.
 *
 *   node scripts/parity-judge.mjs <dir> [id ...]   re-judge pairs saved by check-worker-parity --save,
 *                                                  without drawing anything or spending budget
 *
 * WHY IT CHANGED (2026-10-07). The rule was one number: the mean colour difference over the whole
 * picture, under 1.0. Comparing 96 models found three things wrong with it.
 *
 *   It read colours nobody sees. Pictures with a transparent background keep a colour in pixels
 *   that are almost fully transparent, and the two renderers fill those differently: flipper's
 *   faint halo scored 16.82, and drawn over a plain background it is under 0.4. Both pictures are
 *   now laid over mid grey first, so a pixel counts for what it shows.
 *
 *   It could not tell a glow from damage. The Worker's browser draws soft glows weaker (blur() keeps
 *   about three quarters at large radii, and a 256 px shadow is cut off in a rectangle: a test
 *   picture on 2026-10-07), so eleven glowing models failed while their shapes, text and places
 *   matched exactly. Each picture is now split into its FINE detail (the picture minus a 4 px blur
 *   of itself: edges, text, outlines) and its SOFT part (that blur: glows, shading, gradients), and
 *   the two are held to separate limits.
 *
 *   An average hides a missing part. A piece cut out of the picture moved the mean about as much as
 *   a harmless glow did. Each half is now scored by its WORST 20 x 20 px square (at 400 px wide),
 *   so damage in one place reads as damage.
 *
 * THE LIMITS, AND WHAT THEY WERE SET FROM. On the 96 pairs compared so far, the 92 that look the
 * same scored at most 9.9 for fine detail and 7.0 for soft. Damage made on purpose to real pairs --
 * a piece cut out where the model is, the whole picture moved 1% or 2%, and the treemap's hovered
 * map against its plain one -- scored 15 to 88 on at least one of the two. FINE_TOL 12 and
 * SOFT_TOL 10 sit between. (One cut-out passed: it fell in the empty gap between two candles, and
 * changed nothing anybody could see.)
 *
 * The four above the limits are real differences, not noise. Coin's star and cardfan's spades are
 * typed characters (★ ♠) that neither font travelling with the scene has, so each renderer draws
 * them in a font of its own; the font scan reads font names, so it cannot see a character the named
 * font lacks. Perfume names Georgia, which the Worker does not have (known since 2026-09-27).
 * Coderain is the other kind: plain ASCII in JetBrains Mono 600, which does travel, so it is the
 * two renderers rasterising a dense field of small bright glyphs differently, as treemap's labels
 * were -- held to what it measured.
 *
 * The allowances made under the old rule (treemap 1.36, neonsign 4.16, coderain 1.15, campfire
 * 1.04) are gone: under this one, all but coderain are inside the plain limits, and coderain has a
 * new one, below.
 */
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const FINE_TOL = 12; // worst 20 px square of edges, text and outlines
export const SOFT_TOL = 10; // worst 20 px square of what is left: glows, shading, gradients

/**
 * A model held to what it was measured at instead of the plain limits, with the reason. An entry
 * is a measurement and has to be re-earned: change the model and the number moves.
 */
export const EXPECTED = new Map([
  ['perfume', { fine: 31, why: 'names Georgia, which the Worker does not carry, so its serif is the renderer\'s own: fine 27.0 on 2026-10-05' }],
  ['coderain', { fine: 25, why: 'a dense field of small bright glyphs in a face that travels, rasterised differently by the two renderers: fine 17.8, 19.9 and 21.4 on three scenes' }],
]);

/** The two scores of one pair, and where each picture's ink sits (for the message, not the verdict). */
export function score(page, a, z) {
  return page.evaluate(async ([A, Z]) => {
    const load = async (s) => createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
    const [ia, iz] = await Promise.all([load(A), load(Z)]);
    const W = 400, H = Math.max(1, Math.round(W * ia.height / ia.width));
    const flat = (img) => {
      const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
      x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H);
      return c;
    };
    const blurred = (c) => {
      const o = new OffscreenCanvas(W, H), x = o.getContext('2d', { willReadFrequently: true });
      x.filter = 'blur(4px)'; x.drawImage(c, 0, 0);
      return x.getImageData(0, 0, W, H).data;
    };
    const ca = flat(ia), cz = flat(iz);
    const da = ca.getContext('2d').getImageData(0, 0, W, H).data, dz = cz.getContext('2d').getImageData(0, 0, W, H).data;
    const la = blurred(ca), lz = blurred(cz);
    const T = 20, tx = Math.ceil(W / T), ty = Math.ceil(H / T);
    const F = new Float64Array(tx * ty), S = new Float64Array(tx * ty), N = new Float64Array(tx * ty);
    let mean = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, t = Math.floor(y / T) * tx + Math.floor(x / T);
      for (let k = 0; k < 3; k++) {
        mean += Math.abs(da[i + k] - dz[i + k]) / 3;
        F[t] += Math.abs((da[i + k] - la[i + k]) - (dz[i + k] - lz[i + k])) / 3;
        S[t] += Math.abs(la[i + k] - lz[i + k]) / 3;
      }
      N[t]++;
    }
    let fine = 0, soft = 0;
    for (let t = 0; t < N.length; t++) { fine = Math.max(fine, F[t] / N[t]); soft = Math.max(soft, S[t] / N[t]); }
    const box = (d) => {
      const bg = [d[0], d[1], d[2]];
      let l = 1, r = 0, t = 1, b = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) > 28) {
          if (x / W < l) l = x / W;
          if ((x + 1) / W > r) r = (x + 1) / W;
          if (y / H < t) t = y / H;
          if ((y + 1) / H > b) b = (y + 1) / H;
        }
      }
      return [l, r, t, b];
    };
    return { fine, soft, mean: mean / (W * H), a: box(da), z: box(dz) };
  }, [a, z]);
}

/** Whether a pair holds, against its own measurement when it has one. */
export function judge(id, s) {
  const exp = EXPECTED.get(id);
  const fineLimit = exp?.fine ?? FINE_TOL;
  const softLimit = exp?.soft ?? SOFT_TOL;
  return { ok: s.fine <= fineLimit && s.soft <= softLimit, fineLimit, softLimit, exp };
}

/** One line per model, the same here and in check-worker-parity. */
export function line(id, s, v) {
  const head = `  ${v.ok ? (v.exp ? 'as-is' : 'same ') : 'OFF  '} ${id.padEnd(13)} fine ${s.fine.toFixed(1).padStart(5)} of ${v.fineLimit}  soft ${s.soft.toFixed(1).padStart(5)} of ${v.softLimit}`;
  return head + (v.exp ? `  (${v.exp.why})` : '');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir, ...only] = process.argv.slice(2);
  if (!dir) { console.log('usage: node scripts/parity-judge.mjs <dir saved by check-worker-parity --save> [id ...]'); process.exit(2); }
  const ids = only.length ? only : readdirSync(dir).map((f) => f.match(/^(.*)-local\.png$/)?.[1]).filter(Boolean)
    .filter((id) => existsSync(join(dir, `${id}-worker.png`))).sort();
  const { launchChromium } = await import('./browser.mjs');
  const browser = await launchChromium();
  const page = await browser.newPage();
  let bad = 0;
  for (const id of ids) {
    const s = await score(page, readFileSync(join(dir, `${id}-local.png`)).toString('base64'), readFileSync(join(dir, `${id}-worker.png`)).toString('base64'));
    const v = judge(id, s);
    if (!v.ok) bad++;
    console.log(line(id, s, v));
  }
  await browser.close();
  console.log(`\n${ids.length - bad} of ${ids.length} hold${bad ? `; ${bad} do not` : ''} (re-judged from saved pictures; nothing was drawn).`);
  process.exit(bad ? 1 : 0);
}
