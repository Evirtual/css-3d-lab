# CSS 3D Lab

A free gallery of 3D models built with CSS — each one live, with a step-by-step "how it works"
and copy-paste code you can edit in the page.

**Live:** https://css3dlab.edgarasneverdauskas.com/

135 models in eight groups (shapes & solids, products & branding, text effects, buttons & forms,
cards & galleries, loaders & patterns, scenes & objects, data & tools), in two honest categories:

- **Pure CSS (93)** — markup and CSS only, zero JavaScript: solids, product mockups, text
  effects, loaders, hover pieces and form-state tricks (radio-button cube, rocker switch, no-JS
  tilt).
- **CSS + JS (42)** — JavaScript only feeds values in (pointer position, time, random numbers,
  generated DOM); CSS still does all the rendering: tilt card, drag cube, coverflow, dice, card
  stack, parallax, confetti, scroll-linked spin, the JSON-driven charts and more.

## Features

- Search, category tabs, groups and tag filters. Counts always reflect what you would actually
  see, and the URL keeps the filter state so it can be shared.
- A page per model (`/models/<id>/`) and per group (`/groups/<group>/`), and the same detail in
  a dialog on the home page: a larger live stage, a step-by-step explanation, and tabs with
  - the **minimal standalone HTML / CSS / JS snippet** (no Sass, no build step) — the build fails
    if a model has none,
  - a **Sass source** tab, showing `src/styles/models/_<id>.scss`. The site no longer draws any
    model from that Sass: it is the older implementation, kept until it is removed (see
    [docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md), "What goes with this").
- **The snippet is the model.** Every surface — card, dialog, model page, edited version,
  recording, snapshot — runs the model's own snippet in a frame (`src/preview.ts`) that fills
  its stage. That frame is the model's canvas: `1vmin` is a hundredth of its short side, and every
  model sizes and places itself in those units by the rules in
  [docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md). Nothing outside a model sizes or moves it.
- The code windows are live editors: a CSS edit is applied to the running frame without
  remounting it (the animation keeps its pose), HTML or JS edits rebuild the frame. Edits are saved
  per model in `localStorage` (`c3d-edit:<id>`) and can be reset. "Copy" and "Copy as one HTML
  file" buttons.
- **Lazy mounting** (`src/lazy-mount.ts`): a model is mounted only within 600px of the viewport
  and only runs while on screen, so rendering cost follows what is on screen, not the total count.
- Pause-all-animations switch (on by default when the OS asks for reduced motion), light / dark
  theme, installable as an app (`public/sw.js`, `public/manifest.webmanifest`).

## Recording, snapshots and print

The Video / Image / Print dialog (`src/video.ts`) needs the **render service**. The browser does
not paint the video frames or the picture itself:

1. `src/capture-scene.ts` writes the model's live DOM out with every computed style and its
   animation timings (hover, JS state and edits included).
2. `src/capture-client.ts` POSTs that scene to the service, which opens it in Chromium
   (`server/render.mjs`), winds the animations to each frame's moment and streams the frames back
   as PNGs (newline-delimited JSON). No files, sessions or images are kept on the service.
3. `src/record.ts` encodes the frames in the visitor's browser with WebCodecs into MP4 or WebM
   (`mp4-muxer`, `webm-muxer`), or saves the picture as PNG / JPEG.

Print uses the service too: it makes a snapshot at the A4 sheet's shape and prints that picture
from a hidden frame (`src/print.ts`), so the browser's own print dialog opens over the page.

Where the service is:

| | Endpoint |
| --- | --- |
| `npm run dev` | `http://127.0.0.1:8787/capture`, served by `npm run export` (`server/dev.mjs`), which only answers pages on `localhost` / `127.0.0.1` |
| a production build | `VITE_CAPTURE_URL`, read at build time (see [.env.example](.env.example)). Without it the dialog says "Export service is not configured yet." |

The production service is the Cloudflare Worker in [worker/](worker/) (`worker/src/index.ts`,
config in `worker/wrangler.jsonc`): the same `server/render.mjs` running on Cloudflare Browser
Rendering, answering only the origins in `ALLOWED_ORIGINS`, 120 exports a minute per address.
It is deployed with Wrangler from `worker/`, separately from the site. The Pages workflow
(`.github/workflows/deploy.yml`) must pass `VITE_CAPTURE_URL` to `npm run build`; see
[docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md).

## Develop

```bash
npm install
npm run dev          # generates the static pages, then starts Vite
npm run export       # in a second terminal: the local render service on 127.0.0.1:8787
```

```bash
npm run build        # generate + tsc + vite build into dist/
npm run preview      # serve dist/
```

Without `npm run export` running, everything works in dev except making a video or a picture.

### npm scripts

| Script | What it runs | What it is for |
| --- | --- | --- |
| `generate` | `scripts/generate-pages.mjs` | One static page per model and per group, the embeds, `sitemap.xml`, `robots.txt`, `src/generated/*`. Updates `src/sitemap-dates.json` (commit it). Runs before `dev` and `build`. |
| `dev` | generate + `vite` | Local development. |
| `build` | generate + `tsc` + `vite build` | The site in `dist/`. |
| `preview` | `vite preview` | Serve the built `dist/`. |
| `media` | `scripts/generate-media.mjs` | After a build: the social preview image of every model into `dist/media/`. Runs in the deploy workflow. |
| `icons` | `scripts/generate-icons.mjs` | Redraws the brand mark and every app icon into `public/` (outputs are committed). |
| `export` | `server/dev.mjs` | The local render service on `127.0.0.1:8787`, for recording and snapshots in dev. |
| `check-models` | `scripts/check-models.mjs` | Judges every model (or the ids given) against the view contract on a card, by painted pixels. |
| `qa` | `scripts/qa.mjs` | After a build: page errors, clipping, and whether the interaction a model's badge promises changes anything. |
| `compare` | `scripts/compare-capture.mjs` | Does a snapshot from the render service match the screen? Starts its own service on 8787, so that port must be free. Sheet in `qa/capture-diff.png`. |
| `capture` | `scripts/capture-check.mjs` | Runs `check-models`, `check-stages`, `check-motion` or `check-exports` unchanged and records each model's result in `docs/checks/<check>.json` for the ledger: `npm run capture -- models cube dice`. The per-model export proof is `npm run capture -- exports --defaults <all 135 ids>`. |
| `ledger` | `scripts/ledger.mjs` | Writes `docs/ledger.json`: per model, converted to the contract or not, its commits, check results and reviews, and whether it is approved. `docs/ledger.html` shows it. |
| `ledger:watch` | `scripts/ledger-watch.mjs` | Rebuilds `docs/ledger.json` whenever HEAD, a check result, a review, the queue or a model file changes. |
| `queue` | `scripts/queue.mjs` | Records running and finished work in `docs/ledger-queue.json`: `npm run queue -- start "<name>" "<brief>" <model...>`, `-- done "<name>"`, `-- list`. |

### Checks and tools run with `node`

| Command | What it is for |
| --- | --- |
| `node scripts/check-stages.mjs [id...]` | The same model on every surface (card, viewer, page, editor states, large, full screen, every export shape) must measure the same in vmin. |
| `node scripts/check-exports.mjs --defaults [id...]` | The per-model export proof: drives the real export dialog at its default settings only (image 1:1 at 1600 px PNG, video 9:16 at 1080p and its loop) and checks the file's size, picture, drift and format against the dialog's canvas. About 1 to 2 minutes a model; run over all 135 through `npm run capture -- exports --defaults <ids>`, which records the verdict the ledger reads. The settings are listed once, in `scripts/export-defaults.mjs`. |
| `node scripts/check-exports.mjs [id...]` | The full matrix: every image shape × size, every video shape × quality, the slider and every format. About 11 minutes a model, so it runs on its built-in sample of 8 models; it proves the pipeline, not each model. |
| `node scripts/check-motion.mjs [id...]` | Films every animation and interaction frame by frame and flags flicker, pops and dead or unreachable controls, with a strip per model in `.media-tmp/motion/`. Hints for a human, not verdicts. |
| `node scripts/contact-sheet.mjs [id...]` | After a build: photographs models into sheets in `.media-tmp/` for a review by eye. |
| `node scripts/snippet-check.mjs <id...>` | Renders each snippet's standalone page (what "Copy as one HTML file" gives) and reports script errors or empty pages; sheet in `.media-tmp/snippets.jpg`. |
| `node scripts/preview-check.mjs` | On `/models/cube/`: a CSS edit, a colour edit, reset and opening the export dialog must not remount the frame, move it or lose the animation's pose. |
| `node scripts/diag-record.mjs [id] [quality]` | Records a model the way the dialog does and reports the frames of the file that came out. Starts its own service on 8787. |
| `node scripts/diag-video.mjs [id] [frames]` | Pulls frames through the render service and reports repeats (stutter). Starts its own service on 8787. |

Every script says how to run it in the comment at its top.

## Add a model

See [docs/ADDING-MODELS.md](docs/ADDING-MODELS.md) — the snippet is the model, written to
[docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md) — and the rules learned from real bugs.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. Before a push, go
through [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md).

## Media, sharing and embeds

- `npm run media` (after `npm run build`) screenshots every model in a headless browser into
  `dist/media/<id>.jpg`: the social preview image (og:image) of each model page. It runs in the
  deploy workflow.
- Every model has an embeddable page at `/embed/<id>/`, plus Share and Embed buttons.

## License

Two licences — see [LICENSE](LICENSE):

- **The snippets** (the HTML, CSS and JavaScript of each model, as the Copy and Download buttons
  hand them out) are [MIT](LICENSES/MIT-snippets.txt): free to use in any project, commercial or not.
- **Everything else** (the site, the render service, the checks, the ledger, the docs) is
  [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.md): read it, run it and
  learn from it, but commercial use needs permission.

Versions up to b1d49c2 (2026-09-19) were published under MIT alone and stay under MIT.
