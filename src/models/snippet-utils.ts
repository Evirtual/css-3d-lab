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
    var f = Math.max(0.85, Math.min(6, innerWidth / 340, innerHeight / 260)) * ${size};
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
 * landscape sheet with the model drawn large in the middle, its title above and the address
 * below, which opens the print dialog by itself ("Save as PDF" is one of the printers). The dark
 * background is kept on paper (print-color-adjust: exact), and animations freeze on the frame
 * that is printed. `size` is the model's size factor on the site (models/sizes.json).
 */
export function printDoc(title: string, s: Snippet, size = 1, url = ''): string {
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

body {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 297mm;
  height: 210mm;
  margin: 0 auto;
  padding: 14mm 16mm 11mm;
  overflow: hidden;
  background: #0b0d18;
  color: #eceefb;
  font-family: system-ui, sans-serif;
}

.print-head h1 {
  margin: 0;
  font-size: 24pt;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.print-head p,
.print-foot {
  margin: 3pt 0 0;
  color: #949bc0;
  font-size: 9.5pt;
}

.print-art {
  display: grid;
  place-items: center;
  min-height: 0;
}

/* drawn about 2.3 times its card size: large, and still clear of the edges */
.print-model {
  zoom: ${+(2.3 * size).toFixed(2)};
}

.print-foot {
  display: flex;
  justify-content: space-between;
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
<header class="print-head"><h1>${title}</h1><p>A 3D model made with CSS, live with its code at ${url}</p></header>
<main class="print-art"><div class="print-model">
${s.html}
</div></main>
<footer class="print-foot"><span>CSS 3D Lab</span><span>${url}</span></footer>
${s.js ? `\n<script>\n${s.js}\n</script>\n` : ''}
<script>addEventListener('load', () => setTimeout(() => print(), 800));</script>
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
