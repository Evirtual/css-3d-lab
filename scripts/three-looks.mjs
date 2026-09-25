// The three release-checklist items that can only be answered by opening the dialog and looking.
// Run on an idle machine, on /models/cube/, against the source (its own vite, like the checks):
//
//   npm run looks
//
// WHY IT IS IN THE REPOSITORY. It lived in .media-tmp until 2026-09-25, which is gitignored, while
// three checklist items named it as the thing that proved them. Anyone who cloned this repository
// would have read "run headless at <commit> (.media-tmp/three-looks.mjs)" against a file that was
// not there -- evidence citing a source nobody else can reach, which is the one failure this whole
// checklist exists to prevent. If a proof is written down, the thing that produced it ships.
//
// It is NOT one of the eleven checks in scripts/checks-registry.mjs and is not run by the gate: it
// asks three questions once, on one model, rather than the same question of all 135.
//
//  40  4K is held back and says so where it would be picked: a fourth Quality chip reading
//      "4K - coming later", faded and unpickable, with the reason in its tooltip.
//  41  every file the dialog hands out is named after its model and its settings, never "download".
//      Read from download.suggestedFilename(), so it is the name the browser would really save.
//      View zoom is gone from the editing view and Model size lives only in the export dialog: no
//      zoom control on the page before any dialog is opened, and the slider present and named
//      inside it. Until 2026-09-25 this item read the other way round -- it asked that a View zoom
//      control BE on the page -- and when the control was removed the item was deleted while these
//      lines were not, so two of its three assertions went on passing against the dialog's Model
//      size slider, which shares the class name.
//
// Item numbers are resolved from the checklist's own words at run time, not written in. See itemNo.
//
// It prints one PASS/FAIL line per thing asked, and exits 1 if any failed, so it cannot pass by
// printing something hopeful: every line is a comparison against what the checklist item says.
import { createServer as createVite } from 'vite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cacheDir = mkdtempSync(join(tmpdir(), 'three-looks-vite-'));
process.on('exit', () => rmSync(cacheDir, { recursive: true, force: true }));
const vite = await createVite({ cacheDir, logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}`;

const results = [];

/**
 * WHICH CHECKLIST ITEM A LOOK BELONGS TO, FOUND BY ITS WORDS AND NOT BY COUNTING.
 *
 * This script used to label its results [40], [41] and [58]. On 2026-09-25 those items were really
 * 23, 24, and -- for View zoom -- nothing at all: the item had been deleted along with the control.
 * The numbers are positions in a list that gets edited, so they drift silently, and evidence written
 * against them lands on the wrong line. Worse, the deleted item's two behaviour assertions kept
 * passing, because `.maker__zoom` is also the export dialog's Model size slider (src/video.ts:479)
 * and after the dialog had been opened once the selector found it -- so they measured a control
 * nobody asked about and reported PASS for the item whose control no longer existed.
 *
 * A key is a phrase from the item itself. If no item contains it, that is a FAILURE with its own
 * line, never a silent skip: an item that has been deleted or reworded must stop the run, because
 * the look that tested it is now testing nothing.
 */
const CHECKLIST = readFileSync(new URL('../docs/RELEASE-CHECKLIST.md', import.meta.url), 'utf8')
  .split('\n').filter((l) => /^\s*-\s*\[.\]/.test(l));
const itemNo = (key) => {
  const i = CHECKLIST.findIndex((l) => l.includes(key));
  return i < 0 ? null : i + 1;
};
const ITEM = {
  fourK: '4K is not offered at all while the render service cannot draw it',
  names: 'Every file the dialog hands out is named after its model',
  zoom: 'View zoom is gone from the editing view',
};
for (const [name, key] of Object.entries(ITEM)) {
  if (itemNo(key) === null) {
    console.log(`  FAIL  [?] a checklist item contains "${key}" -> none does; the look for "${name}" tests nothing`);
    results.push({ item: '?', ok: false, what: `a checklist item contains "${key}"`, got: 'none does' });
  }
}

const say = (key, ok, what, got) => {
  const item = itemNo(ITEM[key] ?? key) ?? key;
  results.push({ item, ok, what, got });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${item}] ${what}${got === undefined ? '' : ` -> ${got}`}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => say('any', false, 'no page error', e.message));

await page.goto(`${base}/models/cube/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.stage iframe[data-ready="true"]', { timeout: 30000 });
await page.waitForTimeout(1000);

/* ------------------------------------------------- zoom: the page, BEFORE any dialog is opened */
// This has to run before the export dialog is opened even once. `.maker__zoom` is the dialog's own
// Model size slider (src/video.ts:479), and once the dialog has been opened the element stays in the
// document -- so the same selector, asked later, finds a control that was never in question and
// answers "yes, zoom is here" about the wrong thing entirely. Asked first, it can only find a page
// control, and there is no longer one to find.
const zoomInfo = await page.evaluate(() => {
  const el = document.querySelector('.maker__zoom, input[type="range"].maker__zoom, [data-view-zoom]');
  const anyRange = [...document.querySelectorAll('input[type="range"]')].map((r) => r.className || '(no class)');
  const bar = document.querySelector('.stage-wrap[data-view-zoomed]') ? 'a [data-view-zoomed] stage-wrap is present' : null;
  return { found: Boolean(el), cls: el?.className ?? null, ranges: anyRange, bar };
});
say('zoom', !zoomInfo.found && !zoomInfo.bar, 'no View zoom control is on the model page', JSON.stringify(zoomInfo));

/* ---------------------------------------------------------------- open the export dialog */
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button, a')].find((x) => /video|image|export|make/i.test(x.textContent || ''));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
});
await page.waitForTimeout(1500);
const dialogUp = await page.$('.maker');
say('fourK', Boolean(dialogUp), 'the export dialog opens', opened);

if (dialogUp) {
  // the Video tab, where Quality lives
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.maker [data-tab], .maker button')].find((x) => /^video$/i.test((x.textContent || '').trim()));
    t?.click();
  });
  await page.waitForTimeout(900);

  /* ------------------------------------------------------------ 40: the 4K chip */
  const quality = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.maker button, .maker [data-value], .maker label')]
      .filter((el) => /(^|[^0-9])(480|720|1080|2160|4K)(p|\b)/i.test(el.textContent || ''));
    return chips.map((el) => ({
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled'),
      title: el.title || el.getAttribute('data-tip-text') || el.getAttribute('data-tiptext') || el.closest('[title]')?.title || null,
    }));
  });
  // 4K is not offered while FOUR_K is false, so the Quality group has three chips and none of them
  // mentions it. A faded chip explaining a feature that does not exist was worse than its absence.
  const fourK = quality.find((c) => /4K|2160/i.test(c.text));
  say('fourK', !fourK, 'no 4K chip is offered while the feature is off', fourK ? `still there: "${fourK.text}"` : `Quality offers only: ${quality.map((c) => c.text).join(' | ')}`);
  say('fourK', quality.length === 3, 'the Quality group has its three real choices', `${quality.length} chip(s)`);

  /* ------------------------------------------------------------ 41: the names */
  // The dialog takes the picture and then offers it: [data-go] ("Take the picture") makes the file
  // and shows it -- "1600 x 1600, PNG. This is the file." -- and [data-save] ("Save 0.3 MB") is what
  // actually hands it over. Waiting for a download straight off [data-go] sees nothing for ever,
  // which is what the first two runs of this did.
  const nameOf = async (label, prepare) => {
    await prepare();
    await page.waitForTimeout(700);
    await page.click('.maker button[data-go]');
    await page.waitForSelector('.maker button[data-save]', { timeout: 120000 }).catch(() => null);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }).catch(() => null),
      page.evaluate(() => { document.querySelector('.maker button[data-save]')?.click(); }),
    ]);
    const name = dl ? dl.suggestedFilename() : null;
    if (dl) await dl.cancel().catch(() => {});
    // back to the model, so the next setting is chosen on the dialog and not on the picture
    await page.evaluate(() => { document.querySelector('.maker button[data-again]')?.click(); });
    await page.waitForTimeout(900);
    return { label, name };
  };

  const pick = (re) => page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('.maker button, .maker [data-value], .maker label')].find((x) => rx.test((x.textContent || '').trim()));
    el?.click();
    return Boolean(el);
  }, re.source ?? re);

  // Image at its defaults
  await page.evaluate(() => { [...document.querySelectorAll('.maker [data-tab], .maker button')].find((x) => /^image$/i.test((x.textContent || '').trim()))?.click(); });
  await page.waitForTimeout(800);
  const a = await nameOf('image, defaults', async () => {});
  say('names', a.name === 'css-3d-lab-cube-1x1-1600px.png', 'Image at its defaults is named for the model and its settings', a.name ?? 'no download seen');

  // Image at 16:9 / Large / PNG clear
  const b = await nameOf('image 16:9 large clear', async () => {
    // the shape is its own group: matching the chip by text ("16:9" sits in a label with more
    // words) picked nothing and the file came back 1x1 with the other two choices right
    const gotShape = await page.evaluate(() => {
      const el = document.querySelector('.maker [data-pick="imageRatio"][data-value="16:9"]');
      el?.click(); return Boolean(el);
    });
    say('names', gotShape, 'the 16:9 shape chip can be picked', gotShape ? 'clicked' : 'no [data-pick=imageRatio][data-value="16:9"]');
    await page.waitForTimeout(500);
    await pick(/large/i); await page.waitForTimeout(400);
    await pick(/clear/i); await page.waitForTimeout(400);
  });
  say('names', b.name === 'css-3d-lab-cube-16x9-3200px-clear.png', 'Image at 16:9 / Large / PNG clear carries all three choices', b.name ?? 'no download seen');

  // Video at 9:16 / 480p. The item also names the model's own loop; cube offers one or it films
  // live, and either way the name is made from the shape and the quality.
  await page.evaluate(() => { [...document.querySelectorAll('.maker [data-tab]')].find((x) => /video/i.test(x.getAttribute('data-tab') || ''))?.click(); });
  await page.waitForTimeout(900);
  const v = await nameOf('video 9:16 480p', async () => {
    const shape = await page.evaluate(() => { const el = document.querySelector('.maker [data-pick="videoRatio"][data-value="9:16"], .maker [data-pick="ratio"][data-value="9:16"]'); el?.click(); return Boolean(el); });
    say('names', shape, 'the 9:16 shape can be picked on the Video tab', shape ? 'clicked' : 'no 9:16 chip found');
    await page.waitForTimeout(500);
    const q = await page.evaluate(() => { const el = [...document.querySelectorAll('.maker [data-pick][data-value]')].find((x) => /^480$/.test(x.getAttribute('data-value') || '')); el?.click(); return Boolean(el); });
    say('names', q, 'the 480p quality can be picked', q ? 'clicked' : 'no 480 chip found');
    await page.waitForTimeout(500);
  });
  say('names', v.name === 'css-3d-lab-cube-9x16-480p.mp4', 'Video at 9:16 / 480p is named for the model, its shape and its quality', v.name ?? 'no download seen');
}

/* ------------------------------------------------- zoom: the slider that is SUPPOSED to be there */
// The other half of the same item. Proving the page control is gone is worth nothing on its own --
// it would also pass if the whole feature had been lost -- so the run must show the control alive
// where it belongs: inside the dialog, under a legend that says Model size, with a real range.
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button, a')].find((x) => /video|image|export|make/i.test(x.textContent || ''));
  b?.click();
});
await page.waitForTimeout(1500);

const modelSize = await page.evaluate(() => {
  const dialog = document.querySelector('.maker');
  const el = dialog?.querySelector('.maker__zoom');
  if (!el) return { found: false, why: dialog ? 'the dialog is open but has no .maker__zoom' : 'the dialog did not open' };
  return {
    found: true,
    inDialog: dialog.contains(el),
    legend: el.closest('fieldset')?.querySelector('legend')?.textContent?.trim().slice(0, 40) ?? null,
    min: el.min, max: el.max, value: el.value,
  };
});
say('zoom', modelSize.found && modelSize.inDialog, 'the Model size slider is inside the export dialog', JSON.stringify(modelSize));
say('zoom', /^Model size/.test(modelSize.legend ?? ''), 'its legend reads "Model size"', modelSize.legend);
say('zoom', Number(modelSize.min) === 25 && Number(modelSize.max) > 25, 'it runs from 25 up to the fill limit', `${modelSize.min} to ${modelSize.max}`);

await browser.close();
await vite.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} held.`);
if (failed.length) { console.log('Not held:'); for (const f of failed) console.log(`  [${f.item}] ${f.what} -> ${f.got}`); process.exitCode = 1; }
