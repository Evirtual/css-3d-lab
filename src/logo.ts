/**
 * The brand mark: one cube built from 8 little cubes (2 x 2 x 2) with small gaps between them. On the site it spins slowly and every little cube drifts OUTWARD and back,
 * each by its own amount and on its own rhythm. Moving only outward means two neighbours can only
 * ever move apart, so they never touch. CSS draws and animates it (.logo-cube in _layout.scss);
 * this only writes the markup, the same every time (a fixed seed), for every page.
 *
 * The still versions (favicon, app icons, share images) are drawn by scripts/generate-icons.mjs
 * from the same layout.
 */
export function logoHtml(): string {
  let seed = 11;
  const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const faces = '<i></i>'.repeat(6);
  let cubes = '';
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        // every little cube is a corner: it moves out along all three of its axes
        const out = (v: number): string => ((v * 2 - 1) * (0.35 + Math.abs(rnd()) * 0.65)).toFixed(2);
        const dx = out(x);
        const dy = out(y);
        const dz = out(z);
        const turn = (rnd() * 5).toFixed(1);
        const time = (3.5 + Math.abs(rnd()) * 3.5).toFixed(2);
        const delay = (-Math.abs(rnd()) * 6).toFixed(2);
        cubes += `<b style="--x:${x - 0.5};--y:${y - 0.5};--z:${z - 0.5};--dx:${dx};--dy:${dy};--dz:${dz};--r:${turn}deg;--t:${time}s;--d:${delay}s">${faces}</b>`;
      }
    }
  }
  return `<span class="logo-cube" aria-hidden="true"><span class="logo-cube__spin">${cubes}</span></span>`;
}
