# CSS 3D Lab

A learning gallery of 3D effects built with SCSS — live demos, "how it works" notes and
copy-paste snippets.

**Live:** https://css3dlab.edgarasneverdauskas.com/

100 demos, split into two honest categories:

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
  rendering cost follows what is on screen, not the total count (at most 8 mounted at any scroll position when measured with 50 demos; the number depends on the viewport, not the total).
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

See [docs/ADDING-MODELS.md](docs/ADDING-MODELS.md): the three parts of a demo, the size limits and the
rules learned from real bugs. `node scripts/contact-sheet.mjs <id...>` (after a build) photographs
demos into one image for a quick visual review.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## License

MIT — see [LICENSE](LICENSE). Every snippet is free to use in your own projects.

## Media, sharing and embeds

- `npm run media` (after `npm run build`) screenshots every demo in a headless browser into
  `dist/media/<id>.jpg`: the social preview image (og:image) of each demo page. It runs in the
  deploy workflow.
- Every demo has an embeddable page at `/embed/<id>/`, plus Share and Embed buttons.
- The code windows are small live editors: edits re-run the demo, are saved per demo in
  `localStorage`, and can be reset. Any demo can be viewed full screen.
- `npm run reels -- <id...>` (or `--all`, after `npm run build`) films demos as 4K, 60 fps MP4s
  into `reels/` (not committed, not deployed): `--ratio 9:16` (default, 2160 × 3840 for Reels /
  Shorts / TikTok), `--ratio 16:9` (3840 × 2160 for YouTube) or `--ratio both`. Frames are
  rendered one by one with time stepped by hand, so motion is perfectly smooth; the page is laid
  out at 4K (not upscaled), so 3D layers stay sharp. Quality is visually lossless (CRF 10);
  `--mbps 60` pins a bitrate instead. Needs ffmpeg on PATH or `npm i --no-save ffmpeg-static`.
- Download buttons: `npm run reels -- --all --scale 2 --crf 18 --jobs 3` (1080 × 1920), then
  `node scripts/publish-reels.mjs --all` uploads them to the `reels` GitHub release and records
  their sizes in `src/reels.json`; commit that file. The buttons link straight to the release
  (its downloads do not count toward GitHub Pages bandwidth); the deploy fails if a listed file
  is missing or a different size, so a button always has its file. Videos are never in git.
