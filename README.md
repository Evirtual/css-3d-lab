# CSS 3D Lab

A free gallery of 3D models built with CSS — each one live, with a step-by-step "how it works"
and copy-paste code you can edit in the page.

**Live:** https://css3dlab.edgarasneverdauskas.com/

135 models in eight groups (shapes, products, text, buttons & forms, cards & galleries, loaders,
scenes, data), in two honest categories:

- **Pure CSS (93)** — markup and Sass only, zero JavaScript: solids, product mockups, text
  effects, loaders, hover pieces and form-state tricks (radio-button cube, rocker switch, no-JS
  tilt).
- **CSS + JS (32)** — JavaScript only feeds values in (pointer position, time, random numbers,
  generated DOM); CSS still does all the rendering: tilt card, drag cube, coverflow, dice, card
  stack, parallax, confetti, scroll-linked spin and more.

## Features

- Search, category tabs, groups and tag filters. Counts always reflect what you would actually
  see, and the URL keeps the filter state so it can be shared.
- A page per model (`/models/<id>/`) and per group (`/groups/<group>/`), and the same detail in
  a dialog on the home page: a larger live stage, a step-by-step explanation, and tabs with
  - a **minimal standalone HTML / CSS / JS snippet** (no Sass, no build step) — the build fails
    if a model has none,
  - the **real Sass source** used on the site (imported with `?raw`, so it cannot drift).
- The code windows are live editors: edits re-run the model, are saved per model in
  `localStorage`, and can be reset. "Copy" and "Copy as one HTML file" buttons.
- Every model looks the same in a card, the dialog, its page and full screen: the camera
  (perspective) sits inside the zoomed scene. Sizes and centring are measured from the pixels
  each model actually draws (`scripts/measure-models.mjs`).
- **Lazy mounting**: a model only exists in the DOM while its card is near the viewport, so
  rendering cost follows what is on screen, not the total count.
- Pause-all-animations switch (on by default when the OS asks for reduced motion), light / dark
  theme, installable as an app.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Add a model

See [docs/ADDING-MODELS.md](docs/ADDING-MODELS.md): the three parts of a model, the size limits and
the rules learned from real bugs. After a build, `node scripts/qa.mjs` plays every model the way
its badge promises and reports any that do not react or spill out of their card, and
`node scripts/contact-sheet.mjs <id...>` photographs models into one image for a visual review.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## License

MIT — see [LICENSE](LICENSE). Every snippet is free to use in your own projects.

## Media, sharing and embeds

- `npm run media` (after `npm run build`) screenshots every model in a headless browser into
  `dist/media/<id>.jpg`: the social preview image (og:image) of each model page. It runs in the
  deploy workflow.
- Every model has an embeddable page at `/embed/<id>/`, plus Share and Embed buttons.
- `npm run reels -- <id...>` (or `--all`, after `npm run build`) films models as 4K, 60 fps MP4s
  into `reels/` (not committed, not deployed): `--ratio 9:16` (default, 2160 × 3840 for Reels /
  Shorts / TikTok), `--ratio 16:9` (3840 × 2160 for YouTube) or `--ratio both`. Frames are
  rendered one by one with time stepped by hand, so motion is perfectly smooth; the page is laid
  out at 4K (not upscaled), so 3D layers stay sharp. Quality is visually lossless (CRF 10);
  `--mbps 60` pins a bitrate instead. Needs ffmpeg on PATH or `npm i --no-save ffmpeg-static`.
- Download buttons: `npm run reels -- --all --clean --scale 2 --crf 18 --jobs 3` (1080 × 1920, just
  the model and a small corner mark), then
  `node scripts/publish-reels.mjs --all` uploads them to the `reels` GitHub release and records
  their sizes in `src/reels.json`; commit that file. The buttons link straight to the release
  (its downloads do not count toward GitHub Pages bandwidth); the deploy fails if a listed file
  is missing or a different size, so a button always has its file. Videos are never in git.
