/** Shared pieces for the copy-paste snippets. */
export interface Snippet {
  /** Step-by-step explanation. May contain <code>. */
  how: string[];
  html: string;
  css: string;
  js?: string;
}

/**
 * The complete page for a snippet. With `stage`, the page is see-through and its text follows that
 * theme: that is how an edited snippet runs inside the site's own stage. It then also scales its
 * content with the frame, like every stage does (`size` is the demo's own size factor): the frame
 * does it itself, because zooming an iframe from outside behaves differently between browsers.
 */
export function standaloneDoc(title: string, s: Snippet, stage?: 'dark' | 'light', size = 1): string {
  const fit = stage
    ? `<style>body > * { zoom: var(--fit, 1); }</style>
<script>
(function () {
  function fit() {
    var f = Math.max(0.85, Math.min(6, innerWidth / 340, innerHeight / 280)) * ${size};
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  fit();
  addEventListener('resize', fit);
})();
</script>`
    : '';
  const background = stage ? 'transparent' : '#0b0d18';
  const color = stage === 'light' ? '#14172b' : '#eceefb';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: ${background};
  color: ${color};
  font-family: system-ui, sans-serif;
}

${s.css}
</style>
${fit}
</head>
<body>

${s.html}
${s.js ? `\n<script>\n${s.js}\n</script>\n` : ''}
</body>
</html>`;
}

/**
 * A print-ready page for a snippet (the site's code or the visitor's edited version): an A4
 * landscape sheet with nothing but the model, fitted large in the middle, and a small faint
 * signature in the corner (it is meant to be printed as a picture). print.ts prints it from a hidden frame, so the dialog
 * opens over the page you are on ("Save as PDF" is one of the printers). The dark
 * background is kept on paper (print-color-adjust: exact), and animations freeze on the frame
 * that is printed. `_size` (the site size factor) is no longer used: every model prints at one size.
 */
export function printDoc(title: string, s: Snippet, _size = 1, url = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} · CSS 3D Lab</title>
<style>
@page {
  size: A4 landscape;
  margin: 0;
}

html {
  background: #0b0d18;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* one page, whatever area the printer settings leave: the sheet is the viewport, never more */
html,
body {
  height: 100%;
}

/* !important: some snippets restyle body for their own page (a dropdown pins it to the top) */
body {
  box-sizing: border-box;
  display: grid !important;
  grid-template-rows: minmax(0, 1fr);
  place-items: stretch !important;
  margin: 0 !important;
  padding: 12mm !important;
  overflow: hidden !important;
  background: #0b0d18;
  color: #eceefb;
  font-family: system-ui, sans-serif;
}

.print-art {
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
}

/* its zoom is set by the script below: as big as fits between the title and the footer */
.print-model {
  display: grid;
  place-items: center;
}

/* the only text on the sheet: a small, faint mark in the corner, like an artist's signature */
.print-sign {
  position: fixed;
  right: 12mm;
  bottom: 9mm;
  color: #eceefb;
  font: 600 7pt/1 system-ui, sans-serif;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.4;
}

@media print {
  *,
  *::before,
  *::after {
    animation-play-state: paused !important;
  }
}

${s.css}
</style>
</head>
<body>
<main class="print-art"><div class="print-model">
${s.html}
</div></main>
<span class="print-sign" title="${url}">CSS 3D Lab</span>
${s.js ? `\n<script>\n${s.js}\n</script>\n` : ''}
<script>
// Every model prints the same size: measure what is actually drawn (the union of every visible
// part, 3D turns included), zoom that to 82% of the area inside the margins (about 73% of the page), then move it to the exact middle.
// Again just before printing, because the printed page is a different size from the window.
function drawn(root) {
  var r = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  root.querySelectorAll('*').forEach(function (el) {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    // only what paints (a fill, a border, a shadow, text, a drawn ::before/::after): an empty
    // wrapper or a see-through box (a drag area, an unused wall) is not part of the picture
    var cs = getComputedStyle(el);
    var paints = /^(IMG|CANVAS|svg)$/.test(el.tagName) ||
      cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
      !/rgba\\(.*, 0\\)|transparent/.test(cs.backgroundColor) ||
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
      [].some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); }) ||
      ['::before', '::after'].some(function (p) { var c = getComputedStyle(el, p).content; return c !== 'none' && c !== 'normal'; });
    if (!paints) return;
    var b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    r.l = Math.min(r.l, b.left); r.t = Math.min(r.t, b.top);
    r.r = Math.max(r.r, b.right); r.b = Math.max(r.b, b.bottom);
  });
  return r.l < Infinity ? r : root.getBoundingClientRect();
}
function fitPrint(freeze) {
  var art = document.querySelector('.print-art');
  var model = document.querySelector('.print-model');
  // stop on the frame that gets printed, so the measurement matches the paper
  if (freeze === true) document.getAnimations().forEach(function (x) { x.pause(); });
  model.style.zoom = 1;
  model.style.translate = 'none';
  model.style.width = model.style.height = '';
  var a = art.getBoundingClientRect();
  // A full-screen snippet (position: fixed). When it covers the sheet (a starfield, a tunnel) it
  // prints full-bleed, as it is. When it is an object after all (a city block, a rocket), it gets
  // the art area as its screen (a translate makes the wrapper its containing block) and is fitted
  // like any other model.
  for (var k = 0; k < model.children.length; k++) {
    if (getComputedStyle(model.children[k]).position !== 'fixed') continue;
    var full = drawn(model);
    if (full.r - full.l >= innerWidth * 0.9 && full.b - full.t >= innerHeight * 0.9) return;
    model.style.width = a.width + 'px';
    model.style.height = a.height + 'px';
    model.style.translate = '0px 0px';
    break;
  }
  var d = drawn(model);
  var z = Math.min((a.width * 0.82) / (d.r - d.l), (a.height * 0.82) / (d.b - d.t), 12);
  // a whole scene rather than an object (a starfield, a room, a full-bleed backdrop) fills the
  // sheet as it is: its parts are scattered points, or they already cover everything
  if (z >= 12 || (d.r - d.l >= a.width * 0.95 && d.b - d.t >= a.height * 0.95)) return;
  model.style.zoom = z.toFixed(3);
  d = drawn(model);
  var dx = (a.left + a.width / 2 - (d.l + d.r) / 2) / z;
  var dy = (a.top + a.height / 2 - (d.t + d.b) / 2) / z;
  model.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
}
addEventListener('beforeprint', function () { fitPrint(true); });
addEventListener('load', function () { fitPrint(); });
</script>
</body>
</html>`;
}

export const CUBE_FACES = `/* turn each face outward, then push it half a side from the centre */
.cube > :nth-child(1) { transform: rotateY(0deg)   translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(2) { transform: rotateY(90deg)  translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(5) { transform: rotateX(90deg)  translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(6) { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }`;
