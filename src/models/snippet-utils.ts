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
    // the site's own scale for this model — but never so big that the snippet's scene (which may
    // carry padding of its own, a pointer area) outgrows the frame: then it cannot be centred
    var f = Math.max(0.85, Math.min(6, innerWidth / 340, innerHeight / 280)) * ${size};
    var scene = document.body && document.body.firstElementChild;
    if (scene && scene.offsetWidth && scene.offsetHeight) f = Math.min(f, (innerWidth - 4) / scene.offsetWidth, (innerHeight - 4) / scene.offsetHeight);
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  if (document.body) fit();
  addEventListener('DOMContentLoaded', fit);
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
 * opens over the page you are on ("Save as PDF" is one of the printers). The backdrop is
 * the one on the stage (`look`: its colour, light or dark, and its dots if shown), kept on paper
 * (print-color-adjust: exact), and animations freeze on the frame
 * that is printed. `_size` (the site size factor) is no longer used: every model prints at one size.
 */
/** The backdrop a print is made on: the stage's own colour and, when it shows them, its dots. */
export interface PrintLook {
  bg: string;
  light: boolean;
  dots?: { image: string; size: string };
}

/** How the sheet is laid out: which way round it goes, and how much of it the model fills. */
export interface PrintSetup {
  paper: 'landscape' | 'portrait';
  fill: number;
  /** Print this picture instead of the model: a snapshot of the view the visitor made. */
  picture?: string;
}

export function printDoc(title: string, s: Snippet, _size = 1, url = '', look: PrintLook = { bg: '#0b0d18', light: false }, held = false, clock: number | null = null, setup: PrintSetup = { paper: 'landscape', fill: 2 / 3 }): string {
  // held ("Hold hover" on the stage): every :hover rule applies, as if the pointer were on it.
  // :not(.c3d-none) always matches and weighs the same as :hover, so the cascade is unchanged.
  const css = held ? s.css.replace(/:hover/g, ':not(.c3d-none)') : s.css;
  const ink = look.light ? '#14172b' : '#eceefb';
  const backdrop = look.dots ? `${look.dots.image} 0 0 / ${look.dots.size}, ${look.bg}` : look.bg;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} · CSS 3D Lab</title>
<style>
@page {
  size: A4 ${setup.paper};
  margin: 0;
}

html {
  background: ${backdrop};
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
  padding: 0 !important;
  overflow: hidden !important;
  background: transparent;
  color: ${ink};
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
  color: ${ink};
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

${css}
</style>
</head>
<body>
<main class="print-art"><div class="print-model">
${s.html}
</div></main>
<span class="print-sign" title="${url}">CSS 3D Lab</span>
${s.js ? `\n<script>\n${s.js}\n</script>\n` : ''}
<script>
// The moment on the stage when Print was pressed (ms into its animations): the print shows that pose.
var CLOCK = ${clock === null ? 'null' : Math.round(clock)};
// How much of the sheet the model fills, straight from the dialog's slider: the preview there is
// drawn to the same share of the same shape, so the paper matches what was on screen.
var FILL = ${setup.fill.toFixed(3)};
// Every model prints the same size: measure what is actually drawn (the union of every visible
// part, 3D turns included), zoom it to two thirds of the sheet — the same share of the frame the
// model fills in a card, in a saved picture and in a video — then move it to the exact middle.
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
  if (freeze === true) document.getAnimations().forEach(function (x) { if (CLOCK !== null) x.currentTime = CLOCK; x.pause(); });
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
  // a backdrop that already covers the sheet prints as it is
  if (d.r - d.l >= a.width * 0.95 && d.b - d.t >= a.height * 0.95) return;
  // Zoom, measure again, correct: a model sized in % or viewport units does not grow in step with
  // the zoom, so one step can land short. A few rounds settle it.
  var z = 1;
  for (var round = 0; round < 5; round++) {
    var k = Math.min((a.width * FILL) / (d.r - d.l), (a.height * FILL) / (d.b - d.t));
    if (Math.abs(k - 1) < 0.02) break;
    z = Math.min(z * k, 40);
    model.style.zoom = z.toFixed(3);
    d = drawn(model);
  }
  var dx = (a.left + a.width / 2 - (d.l + d.r) / 2) / z;
  var dy = (a.top + a.height / 2 - (d.t + d.b) / 2) / z;
  model.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
}
// Printing ignores backface-visibility: hidden, so a face turned away would print on top,
// mirrored. Find those faces the way the screen does: mark three corners of the face, see where
// they land, and if the corners run the other way round (mirrored), the face shows its back:
// hide it.
function cullBackfaces() {
  document.querySelectorAll('.print-model *').forEach(function (el) {
    if (getComputedStyle(el).backfaceVisibility !== 'hidden') return;
    var p = [0, 1, 2].map(function (k) {
      var m = document.createElement('print-mark');
      m.style.cssText = 'position:absolute!important;display:block!important;width:0!important;height:0!important;' +
        'margin:0!important;transform:none!important;left:' + (k === 1 ? '100%' : '0') + '!important;top:' + (k === 2 ? '100%' : '0') + '!important';
      el.appendChild(m);
      var b = m.getBoundingClientRect();
      m.remove();
      return { x: b.left, y: b.top };
    });
    var turn = (p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x);
    if (turn < 0) el.style.setProperty('visibility', 'hidden', 'important');
  });
}
addEventListener('beforeprint', function () { fitPrint(true); cullBackfaces(); });
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
