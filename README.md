# CSS 3D Lab

A learning gallery of 3D effects built with SCSS — live demos, "how it works" notes and
copy-paste snippets.

**Live:** https://css3dlab.edgarasneverdauskas.com/

50 demos, split into two honest categories:

- **Pure CSS (35)** — markup + SCSS only, zero JavaScript: solids (cube, pyramid, cylinder, coin,
  globe), text effects, loaders, a tunnel and starfield, hover pieces (door, tiles, rolling
  button, fold-down menu) and form-state tricks (radio-button cube, rocker switch, no-JS tilt).
- **CSS + JS (15)** — JavaScript only feeds values in (pointer position, time, random numbers,
  generated DOM); CSS still does all the rendering: tilt card, drag cube, coverflow, dice,
  card stack, parallax, box slideshow, confetti, scroll-linked spin and more.

## Features

- Search, category tabs and tag filters. Counts always reflect what you would actually see, and
  the URL keeps the filter state so it can be shared.
- Detail view per demo: larger live stage, step-by-step explanation, and tabs with
  - a **minimal standalone HTML / CSS / JS snippet** (no Sass, no build step),
  - **▶ Run snippet** — the snippet running on its own in a sandboxed iframe,
  - the **real SCSS source** used on the page (imported with `?raw`, so it cannot drift).
- "Copy" and "Copy as one HTML file" buttons.
- **Lazy mounting**: a demo only exists in the DOM while its card is near the viewport, so
  rendering cost follows what is on screen, not the total count (about 8 of 50 mounted at a time).
- Pause-all-animations switch (on by default when the OS asks for reduced motion), light / dark
  theme.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Add a demo

1. Add an entry to one of the `src/demos/pure*.ts` / `src/demos/interactive*.ts` files.
2. Create `src/styles/demos/_<id>.scss` and `@use` it in `src/styles/main.scss`.
3. Add the standalone snippet + explanation under the same id in `src/demos/snippets2.ts`.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## License

MIT — see [LICENSE](LICENSE). Every snippet is free to use in your own projects.

## Media, sharing and embeds

- `npm run media` (after `npm run build`) films every demo in a headless browser and writes a
  social preview PNG, an MP4 and a GIF per demo into `dist/media/`. It runs in the deploy
  workflow; MP4/GIF need `ffmpeg`, so locally without it only the PNGs are produced.
- Every demo has an embeddable page at `/embed/<id>/` and a share row (link, embed code,
  Edit on CodePen, MP4/GIF download). Download buttons only appear when the file really exists.
