# CSS 3D Lab

A learning gallery of 3D effects built with SCSS — live demos, "how it works" notes and
copy-paste snippets.

**Live:** https://evirtual.github.io/css-3d-lab/

Demos are split into two honest categories:

- **Pure CSS** — markup + SCSS only, zero JavaScript (cube, flip card, ring carousel, extruded
  text, exploded layers, push button, folding map, atom orbits, 3D bar chart, opening book,
  radio-button cube, synthwave floor, DNA helix, tile wave).
- **CSS + JS** — JavaScript only feeds values in (pointer position, time, generated DOM); CSS
  still does all the rendering (pointer tilt card, drag-to-rotate cube, coverflow, perspective
  playground, pointer-lit text, point sphere, flip clock).

## Features

- Search, category tabs and tag filters. Counts always reflect what you would actually see, and
  the URL keeps the filter state so it can be shared.
- Detail view per demo: larger live stage, step-by-step explanation, and tabs with
  - a **minimal standalone HTML / CSS / JS snippet** (no Sass, no build step),
  - **▶ Run snippet** — the snippet running on its own in a sandboxed iframe,
  - the **real SCSS source** used on the page (imported with `?raw`, so it cannot drift).
- "Copy" and "Copy as one HTML file" buttons.
- Pause-all-animations switch (on by default when the OS asks for reduced motion), off-screen
  demos pause automatically, light / dark theme.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Add a demo

1. Add an entry to `src/demos/pure.ts` or `src/demos/interactive.ts`.
2. Create `src/styles/demos/_<id>.scss` and `@use` it in `src/styles/main.scss`.
3. Add the standalone snippet + explanation under the same id in `src/demos/snippets.ts`.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
