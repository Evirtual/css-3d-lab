/** Shared pieces for the copy-paste snippets. */
export interface Snippet {
  /** Step-by-step explanation. May contain <code>. */
  how: string[];
  html: string;
  css: string;
  js?: string;
}

/**
 * A model's lengths are in vmin, so when its canvas changes size (an export shape, full screen, a
 * window resized) every one of them changes in px, and a model with a `transition` on transform
 * would glide there from its old size in px: for half a second after each change the model is
 * drawn at the size it had on the old canvas (coverflow 12vmin too wide, the accordion 7vmin too
 * tall). A new canvas is a new layout, not a move, so the frame lands on it at once: when the
 * canvas changes size, every transition running is taken to its end (the ones the new size has
 * just started, and a hover caught mid-way, which lands where it was going), and until two frames
 * later nothing starts a new one. It is a ResizeObserver, not the resize event, because the site
 * animates some canvases to their new shape over a few frames and the first of those comes a frame
 * before the first resize event: an observer runs after that frame's layout and before its paint,
 * so not even that frame is drawn at the old size.
 */
const RESIZE_SNAP = `new ResizeObserver(function(){var r=document.documentElement;r.setAttribute('data-c3d-resizing','');document.getAnimations().forEach(function(a){if(a instanceof CSSTransition)a.finish()});r.getBoundingClientRect();requestAnimationFrame(function(){requestAnimationFrame(function(){r.removeAttribute('data-c3d-resizing')})})}).observe(document.documentElement)`;

/**
 * The complete page for a snippet. With `stage`, the page is see-through and its text follows that
 * theme: that is how an edited snippet runs inside the site's own stage. It then also scales its
 * content with the frame, like every stage does (`size` is the demo's own size factor): the frame
 * does it itself, because zooming an iframe from outside behaves differently between browsers.
 * The empty `#c3d-held` style is the checks' slot (check-models, check-motion, check-stages): they
 * write the model's CSS into it with every :hover made to match, to judge its hover pose. The site
 * itself never fills it.
 */
export function standaloneDoc(title: string, s: Snippet, stage?: 'dark' | 'light'): string {
  const background = stage ? 'transparent' : '#0b0d18';
  const color = stage === 'light' ? '#14172b' : '#eceefb';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${stage ? `/* The lab's own faces, so a model in a frame draws what an export draws. Only in the
   frame: a copied file has no /fonts/ to load and should use the reader's own fonts. */
@font-face{font-family:Inter;font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/inter-latin-400.woff2) format("woff2")}
@font-face{font-family:Inter;font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/inter-latin-700.woff2) format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/jetbrains-mono-latin-400.woff2) format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/jetbrains-mono-latin-600.woff2) format("woff2")}` : ''}
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: ${background};
  color: ${color};
  font-family: Inter, system-ui, sans-serif;
}

</style>
<style id="c3d-code">${s.css}</style>
${stage ? `<style>html,body{width:100%;height:100%;min-height:0}body{display:block;position:relative}#c3d-scene{position:absolute;inset:0;display:grid;place-items:center;transform-style:preserve-3d;translate:0px 0px}:root[data-paused] *, :root[data-paused] *::before, :root[data-paused] *::after{animation-play-state:paused!important}:root[data-c3d-resizing] *, :root[data-c3d-resizing] *::before, :root[data-c3d-resizing] *::after{transition:none!important}</style><style id="c3d-held"></style><script>${RESIZE_SNAP}</script>` : ''}
</head>
<body>

${stage ? `<div id="c3d-scene">${s.html}</div>` : s.html}
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

export function printDoc(title: string, s: Snippet, _size = 1, url = '', look: PrintLook = { bg: '#0b0d18', light: false }, clock: number | null = null, setup: PrintSetup = { paper: 'landscape', fill: 2 / 3 }): string {
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
  font-family: Inter, system-ui, sans-serif;
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
  font: 600 7pt/1 Inter, system-ui, sans-serif;
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
