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
  a dialog on the home page: a larger live stage, a step-by-step explanation, and HTML / CSS / JS
  tabs with the **minimal standalone snippet** (plain CSS, no build step) — the build fails if a
  model has none. The GitHub button opens that snippet in the repository.
- **The snippet is the model.** Every surface — card, dialog, model page, edited version,
  recording, snapshot — runs the model's own snippet in a frame (`src/preview.ts`) that fills
  its stage. That frame is the model's canvas: `1vmin` is a hundredth of its short side, and every
  model sizes and places itself in those units by the rules in
  [docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md). Nothing outside a model sizes or moves it.
  There is no second implementation: the site's stylesheet (`src/styles/`) is only the site's
  own chrome, and a model's CSS reaches the page only inside its frame. The page's JavaScript
  still carries every snippet (the gallery, the editors and "Copy" need them), so it is the
  heaviest thing a page loads.
- The code windows are live editors: a CSS edit is applied to the running frame without
  remounting it (the animation keeps its pose), HTML or JS edits rebuild the frame. Edits are saved
  per model in `localStorage` (`c3d-edit:<id>`) and can be reset. "Copy" and "Copy as one HTML
  file" buttons.
- **View zoom** (`src/view-zoom.ts`): under the large stage (model page, home dialog) and along
  its bottom at full screen, the export dialog's Model size slider for looking: how much of the
  frame the model fills, from 25% (70% is its own size) up to the most it can fill and still clear
  every canvas edge by 4vmin, measured per model and canvas (`src/fill-limit.ts`, the export
  slider's own top end too; the hint names it). It only scales how the frame is shown, so
  the code, Copy, recordings and snapshots are unchanged; it keeps its value into and out of full
  screen, is not saved, and a new model starts at 70%.
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
| `media` | `scripts/generate-media.mjs` | After a build: the social preview image of every model into `dist/media/`. Runs in the deploy workflow. How a shot is taken (the page, the size, the moment it is stopped at) is `scripts/og-shot.mjs`, shared with `check-media`. |
| `icons` | `scripts/generate-icons.mjs` | Redraws the brand mark and every app icon into `public/` (outputs are committed). |
| `export` | `server/dev.mjs` | The local render service on `127.0.0.1:8787`, for recording and snapshots in dev. |
| `check-models` | `scripts/check-models.mjs` | Judges every model (or the ids given) against the view contract on a card, by painted pixels, and fails one whose snippet does not set its base unit `--u` in vmin. |
| `check-access` | `scripts/check-access.mjs` | Every model (or the ids given) on a card. Paused as the site pauses it, with reduced motion emulated, its picture must not change over 4 seconds (a script's timer included), and a model that moved must move again un-paused. Every rendered control has an accessible name (Chromium's own, over CDP). Tab reaches everything a mouse can use (controls, what the script listens to, `:hover` targets, which also need a `:focus` rule; check-motion reads those targets the same way, through `scripts/css-heads.mjs`), and focus changes the picture. `pass` or `FAILS` per model with its problems, exit 1 on any; about 9 minutes for all 135. `--try <file.mjs>` runs it on a model outside the gallery. Record it for the ledger with `npm run capture -- access`. |
| `check-media` | `scripts/check-media.mjs` | After `build` and `media`: each model's share preview. The image is the 2400 × 1260 JPEG its tags say, og:title, og:description and the image alt are the model's own, the headline drawn in the image is its title and fits, and the picture is the model as the built site renders it now (compared with a fresh render), loaded, finished, centred and full-sized. Record it for the ledger with `npm run capture -- media <ids>`. |
| `qa` | `scripts/qa.mjs` | After a build: page errors, clipping, and whether the interaction a model's badge promises changes anything. |
| `check-seo` | `scripts/check-seo.mjs` | After a build: reads every page in `dist/` as a search engine would. Titles and descriptions fit a search result and are unique (the limits and their sources are in `scripts/seo-limits.mjs`), one canonical on the sitemap's host, one h1 and no skipped heading level, JSON-LD that parses with its dates and image, og and twitter tags present, noindex on embeds and utility pages only, the sitemap and robots.txt right, no dead internal links or orphan pages, each model's title, description and steps in the HTML without JS, and the JS and CSS a model page and the home page load within a gzip budget. One `FAIL` line per problem, exit 1 on any. A finding waiting on a decision prints as `WAIVED` and a model text too long in its own words as `OWN-TEXT`; neither fails unless `--strict`. |
| `compare` | `scripts/compare-capture.mjs` | Does a snapshot from the render service match the screen? Starts its own service on 8787, so that port must be free. Sheet in `qa/capture-diff.png`. |
| `capture` | `scripts/capture-check.mjs` | Runs `check-models`, `check-stages`, `check-motion`, `check-exports`, `check-media`, `check-access`, `check-boxsizing`, `check-contrast`, `check-perf` or `check-app` (the list is `scripts/checks-registry.mjs`, which the ledger and its page read too) unchanged and records each model's result in `docs/checks/<check>.json` for the ledger: `npm run capture -- models cube dice`. The per-model export proof is `npm run capture -- exports --defaults <all 135 ids>`. Each result records its check's `ruleVersion` (in the registry, bumped whenever a rule's meaning changes), and a result judged under an older one is stale, "rule changed (vN → vM)". |
| `ledger` | `scripts/ledger.mjs` | Writes `docs/ledger.json`: per model, its stage (To check, Awaiting review or Approved), its commits, check results and reviews. `--u` in vmin is part of the contract check, not a stage of its own. `docs/ledger.html` shows it. A result or review is stale only when something it judged has changed since, and the ledger says what and at which commit: the resolved snippet (shared constants such as `CUBE_FACES` filled in), how the model is played (`interaction.ts`), its text, or a file on that check's render path (the model frame, the export code, the share-image layout). A contract, stage or motion result does not go stale on a text-only change; a text review does not go stale on a change to the frame. The rules are in `scripts/fingerprint.mjs`; results and reviews that recorded only a commit are judged by the model as it was at that commit, rebuilt from git and cached in `.cache/` (the first build after new commits takes a few minutes). |
| `ledger:watch` | `scripts/ledger-watch.mjs` | Rebuilds `docs/ledger.json` whenever HEAD, a check result, a review, the queue or a model file changes. |
| `queue` | `scripts/queue.mjs` | Records running and finished work in `docs/ledger-queue.json`: `npm run queue -- start "<name>" "<brief>" <model...>`, `-- done "<name>"`, `-- list`. |

### Checks and tools run with `node`

| Command | What it is for |
| --- | --- |
| `node scripts/check-stages.mjs [id...]` | The same model on every surface (card, viewer, page, editor states, large, full screen, every export shape) must measure the same in vmin. |
| `node scripts/check-exports.mjs --defaults [id...]` | The per-model export proof: drives the real export dialog at its default settings only (image 1:1 at 1600 px PNG, video 9:16 at 1080p and its loop) and checks the file's size, picture, drift and format against the dialog's canvas. About 1 to 2 minutes a model; run over all 135 through `npm run capture -- exports --defaults <ids>`, which records the verdict the ledger reads. The settings are listed once, in `scripts/export-defaults.mjs`. |
| `node scripts/check-exports.mjs [id...]` | The full matrix: every image shape × size, every video shape × quality, the slider and every format. About 11 minutes a model, so it runs on its built-in sample of 8 models; it proves the pipeline, not each model. |
| `node scripts/check-boxsizing.mjs [id...]` | No reliance on outside CSS: each model's standalone file, paused at one moment, at rest and with `:hover` forced, must draw the same with and without a page rule making every box border-box (within 0.25% of the canvas over its own noise). A model says which box its numbers mean in its own CSS; a `boxSizing: 'content-box by design: <why>'` mark in its gallery entry passes one that cannot, and is printed on its line. `--try <file.mjs>` runs it on a model outside the gallery. Record it with `npm run capture -- boxsizing`. |
| `node scripts/check-contrast.mjs [id...]` | Text readable on both stages: every text a model shows, at rest, with `:hover` forced, with the pointer on it and after each of its controls is clicked, against the pixels actually behind its letters, on the dark stage and the light one, at a card's size. WCAG AA: 4.5:1, or 3:1 for large text; text in a disabled control is exempt and listed. `--try <file.mjs>` for a model outside the gallery. Record it with `npm run capture -- contrast`. |
| `node scripts/check-perf.mjs [id...]` | What a model costs to run, at the card's own 340 × 280: how many elements it draws, its frame time at the 95th over two seconds of running, how fast its main interaction answers a real pointer, and whether thirty of that interaction pile elements up (the confetti-freeze class of bug). Every budget, and where its number comes from, is at the top of the file. `--try <file.mjs>` runs it on a model outside the gallery, which is how it is proved on deliberately heavy and leaky copies. Record it with `npm run capture -- perf`. |
| `node scripts/check-app.mjs` | What the gallery costs to use: the built site served from `dist/`, loaded at 1280 × 900 and scrolled to the bottom of all 135 models and back. First load, frame times over the trip, long tasks, memory and documents held after a forced collection, how many model frames stay mounted at the bottom, whether a card moves a pixel, and whether a card scrolled back to is running again. A site-wide check, so it gates no model; record it with `npm run capture -- app`. |
| `node scripts/check-motion.mjs [id...]` | Films every animation and interaction frame by frame and flags flicker, pops and dead or unreachable controls, with a strip per model in `.media-tmp/motion/`. Hints for a human, not verdicts. |
| `node scripts/fingerprint.mjs <id> [--kind visual\|text]` | Prints what a result or review of the model depends on now (the resolved snippet, how it is played, its text and the render-path files), as the `fingerprints` a reviewer adds to a `docs/reviews/` entry. `npm run capture` records the same with every check result. |
| `node scripts/contact-sheet.mjs [id...]` | After a build: photographs models into sheets in `.media-tmp/` for a review by eye. |
| `node scripts/snippet-check.mjs <id...>` | Renders each snippet's standalone page (what "Copy as one HTML file" gives) and reports script errors or empty pages; sheet in `.media-tmp/snippets.jpg`. |
| `node scripts/preview-check.mjs` | On `/models/cube/`: a CSS edit, a colour edit, reset and opening the export dialog must not remount the frame, move it or lose the animation's pose. |
| `node scripts/diag-record.mjs [id] [quality]` | Records a model the way the dialog does and reports the frames of the file that came out. Starts its own service on 8787. |
| `node scripts/diag-video.mjs [id] [frames]` | Pulls frames through the render service and reports repeats (stutter). Starts its own service on 8787. |

Every script says how to run it in the comment at its top.

**When the browser breaks.** Every browser-driven check (`check-models`, `check-stages`, `check-motion`, `check-access`, `check-media`, `check-exports`, `check-boxsizing`, `check-contrast`, `check-perf` and `qa`) runs its models through `scripts/browser-guard.mjs`, so one bad moment costs at most one model, not the rest of the run:

- A model whose run hits a browser-level error (a protocol error, "Unable to capture screenshot", a `goto` or `setContent` timeout, a crashed or closed target, a disconnected browser) runs again, once, in a fresh browser, and its result says `retried after a browser failure`. Only a second failure makes it fail or `BROKE`, and the next model starts in a fresh browser too.
- The browser is replaced every 20 models (`C3D_RELAUNCH_EVERY`), so its memory cannot creep up over a long run.
- Before each model, free memory is read. Under 1.5 GB (`C3D_MIN_FREE_GB`) the check waits, logging `waiting for memory: X GB free` every 10 s, for up to 3 minutes (`C3D_MEM_WAIT_S`). If memory is still low, the model runs anyway and its result says `ran under memory pressure`. Nothing else is ever killed.
- A crash inside Playwright ends the run with `CRASHED` on stderr and exit 3, not silently. Results printed before the crash are kept: `capture-check` records each model as its line arrives, `check-stages` prints its report for the finished models under a `PARTIAL` line, and `check-motion` and `check-access` write their `report.json` so far.

The notes go on each model's own line, where `capture-check` records them with the result. For `check-stages` and `check-exports` they go on a `note:` line under the model instead, and for `qa` on a `note:` line after the problems. Those lines show in the log, but `capture-check` does not record them. Messages about the browser itself go to stderr, prefixed `browser-guard:`. The checks' output is otherwise unchanged, so `capture-check` reads it as before. To test the guard, `C3D_FAULT=kill-after:N` kills the browser once after the Nth model, `kill-during:N` kills it 3 s into a model, and `crash-after:N` throws an unhandled rejection.

## Add a model

See [docs/ADDING-MODELS.md](docs/ADDING-MODELS.md) — the snippet is the model, written to
[docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md) — and the rules learned from real bugs.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. Before a push, go
through [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md).

## Media, sharing and embeds

- `npm run media` (after `npm run build`) screenshots every model in a headless browser into
  `dist/media/<id>.jpg`: the social preview image (og:image) of each model page. It runs in the
  deploy workflow. Each model is shot in its resting pose, the first moment of its loop, with every
  animation stopped there and the picture left to settle, so the same code always gives the same
  image. `npm run check-media` then proves each image and its tags (see the scripts table).
- Every model has an embeddable page at `/embed/<id>/`, plus Share and Embed buttons.

## License

Two licences — see [LICENSE](LICENSE):

- **The snippets** (the HTML, CSS and JavaScript of each model, as the Copy and Download buttons
  hand them out) are [MIT](LICENSES/MIT-snippets.txt): free to use in any project, commercial or not.
- **Everything else** (the site, the render service, the checks, the ledger, the docs) is
  [PolyForm Noncommercial 1.0.0](LICENSES/PolyForm-Noncommercial-1.0.0.md): read it, run it and
  learn from it, but commercial use needs permission.

Versions up to b1d49c2 (2026-09-19) were published under MIT alone and stay under MIT.
