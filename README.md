# CSS 3D Lab

A free gallery of 3D models built with CSS — each one live, with a step-by-step "how it works"
and copy-paste code you can edit in the page.

**Live:** https://css3dlab.edgarasneverdauskas.com/

143 models in eight groups (shapes & solids, products & branding, text effects, buttons & forms,
cards & galleries, loaders & patterns, scenes & objects, data & tools), in two honest categories:

- **Pure CSS (99)** — markup and CSS only, zero JavaScript: solids, product mockups, text
  effects, loaders, hover pieces and form-state tricks (radio-button cube, rocker switch, no-JS
  tilt).
- **CSS + JS (44)** — JavaScript only feeds values in (pointer position, time, random numbers,
  generated DOM); CSS still does all the rendering: tilt card, drag cube, coverflow, dice, card
  stack, parallax, confetti, scroll-linked spin, the JSON-driven charts and more.

## Features

- Search, category tabs, groups and tag filters, and an order: Newest (the default, by the day a
  model joined), Oldest or A–Z, never random. Counts always reflect what you would actually
  see, and the URL keeps the filter state and the order so it can be shared.
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
  own chrome, and a model's CSS reaches the page only inside its frame. A page fetches only the
  snippets it shows, each as its own file (`vite.config.ts`, `snippetChunks`): a model page its
  one, the gallery a card's as the card comes into view.
- The code windows are live editors: a CSS edit is applied to the running frame without
  remounting it (the animation keeps its pose), HTML or JS edits rebuild the frame. Edits are saved
  per model in `localStorage` (`c3d-edit:<id>`) and can be reset. "Copy" and "Copy as one HTML
  file" buttons.
- **Model size**, in the export dialog (`src/video.ts`): how much of the frame the model fills in
  the file you take away, from 25% (70% is its own size) up to the most it can fill and still clear
  every canvas edge by 4vmin, measured per model and canvas (`src/fill-limit.ts`; the hint names
  it). The page itself has no zoom: it had one until 2026-09-25, and
  [docs/VIEW-CONTRACT.md](docs/VIEW-CONTRACT.md) says why it went.
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

### Scripts

<!-- scripts:start (written by scripts/generate-readme.mjs from each file's opening comment: edit the comment, not this table) -->

71 rows: the 31 npm scripts in `package.json`, then every other file in `scripts/` and `server/`.
Each file says how to run it, and why it exists, in the comment at its top.

| Run it with | What runs | What it is for |
| --- | --- | --- |
| `npm run prepare` | `scripts/install-hooks.mjs` | Points git at the hooks this repository carries. Run by `npm install` (the prepare script). |
| `npm run doctor` | `scripts/doctor.mjs` | CAN THIS MACHINE RUN THE CHECKS, AND IF NOT, WHY NOT? |
| `npm run readme` | `scripts/generate-readme.mjs` | Writes the README's list of scripts from the scripts themselves. |
| `npm run generate` | `node scripts/generate-capture-fonts.mjs && node scripts/generate-pages.mjs` | A command line, not a script of this project: the column to the left is all of it. |
| `npm run media` | `scripts/generate-media.mjs` | Takes the social preview image for every demo from the BUILT site (dist/). |
| `npm run qa` | `scripts/qa.mjs` | QA for every demo, on the BUILT site (run `npm run build` first). |
| `npm run compare` | `scripts/compare-capture.mjs` | Does the export draw what the screen shows? For every demo (or the ids given), the real stage is screenshotted by the browser and the same stage is captured through captureImage — the exact code the Video / Image / Print dialog runs — and the two pictures are compared pixel by pixel. Demos that differ beyond the threshold are listed, and a sheet of [screen \| capture \| diff] strips for them is written to qa/capture-diff.png so the difference can be looked at. |
| `npm run looks` | `scripts/three-looks.mjs` | The three release-checklist items that can only be answered by opening the dialog and looking. Run on an idle machine, on /models/cube/, against the source (its own vite, like the checks). |
| `npm run icons` | `scripts/generate-icons.mjs` | Draws the brand mark and renders every icon the platforms ask for into public/. Run once, or again after changing the mark: npm run icons (the outputs are committed; the build does not depend on this script). |
| `npm run dev` | `npm run generate && vite` | A command line, not a script of this project: the column to the left is all of it. |
| `npm run build` | `npm run generate && tsc && vite build` | A command line, not a script of this project: the column to the left is all of it. |
| `npm run typecheck:ledger` | `tsc --noEmit -p tsconfig.ledger.json` | A command line, not a script of this project: the column to the left is all of it. |
| `npm run preview` | `vite preview` | A command line, not a script of this project: the column to the left is all of it. |
| `npm run export` | `server/dev.mjs` | The render service for development: recordings, snapshots and prints are drawn here when the site runs under `npm run dev` (src/capture-client.ts falls back to this address when VITE_CAPTURE_URL is not set). |
| `npm run check-models` | `scripts/check-models.mjs` | Judges every model against docs/VIEW-CONTRACT.md. It does not adjust anything: a model that fails here is a model whose own code has to change. |
| `npm run check-access` | `scripts/check-access.mjs` | Pause and access: every model stops when the site pauses it, every control has a name, and the keyboard reaches everything a mouse can use. |
| `npm run check-seo` | `scripts/check-seo.mjs` | The SEO check: reads every HTML page of the BUILT site in dist/ and judges what a search engine reads there. Run it after `npm run build`; it needs no browser and no server. |
| `npm run check-media` | `scripts/check-media.mjs` | Checks every model's social preview: the picture and the words a chat app or social site shows when a model page is shared. Run it on the BUILT site, after the images are made. |
| `npm run verify` | `scripts/verify.mjs` | One runner: every check, one at a time, recorded where the ledger reads it. |
| `npm run ledger` | `scripts/ledger.mjs` | The view-contract rewrite ledger: writes docs/ledger.json, which docs/ledger.html shows. |
| `npm run ledger:watch` | `scripts/ledger-watch.mjs` | The board: serves the ledger's page with its buttons, and keeps everything the page shows current while it runs -- docs/ledger.json, the page itself, and the README's list of scripts. |
| `npm run capture` | `scripts/capture-check.mjs` | Runs one of the model checks exactly as it is, shows its output as it comes, and keeps what it said per model in docs/checks/<check>.json for scripts/ledger.mjs to read. |
| `npm run now` | `scripts/now.mjs` | What is running, right now, MEASURED. |
| `npm run signoff` | `scripts/signoff.mjs` | The item on the release checklist that waits for a person, said from the command line, and said again for each new commit that goes out. |
| `npm run check-live` | `scripts/check-live.mjs` | The site AS SERVED, after a deploy — not the dist/ it was built from. |
| `npm run capture-payload` | `scripts/capture-payload.cjs` | Catches one real capture payload from the page, so the same bytes can be replayed to BOTH renderers. Without this the comparison is two different requests and proves nothing. |
| `npm run check-renderers` | `scripts/check-renderers.cjs` | SUPERSEDED as a gate by `npm run check-parity` (scripts/check-worker-parity.mjs), which drives the dialog itself over chosen models and judges on the PICTURE. Keep this one for looking at a single payload by hand. Its bar -- same pixel size, within 10% of PNG bytes -- turned out to be inverted, because a compressed size measures entropy and not position. |
| `npm run check-parity` | `scripts/check-worker-parity.mjs` | The same captured scene, drawn by BOTH renderers, and the two pictures compared. |
| `npm run board` | `scripts/ledger-watch.mjs` | The board: serves the ledger's page with its buttons, and keeps everything the page shows current while it runs -- docs/ledger.json, the page itself, and the README's list of scripts. |
| `npm run build:ledger` | `scripts/build-board.mjs` | Builds the board's page from its source, so nobody has to remember to. |
| `npm run board:dev` | `scripts/board-dev.mjs` | The board, with the page served from source instead of from the build. |
| imported, not run | `scripts/browser-guard.mjs` | Keeps a long browser-driven check going when its browser breaks. Used by check-models, check-stages, check-motion, check-access, check-media, check-exports and qa. Not run on its own. |
| `node scripts/browser.mjs` | `scripts/browser.mjs` | How every check opens a browser: one place, so the answer to "which Chromium do the checks run on" is written once -- and, since 2026-09-29, so that every result can say which one it was. |
| `node scripts/check-app.mjs` | `scripts/check-app.mjs` | What the site itself costs: the gallery, built and served as it is deployed, loaded once and scrolled to the bottom of all 135 models and back. |
| `node scripts/check-boxsizing.mjs` | `scripts/check-boxsizing.mjs` | No reliance on outside CSS: a model must draw the same whether or not the page around it makes every box border-box. The site's own stylesheet once did (`*, *::before, *::after { box-sizing: border-box }`), and models were written and sized against it; in the model's own frame, and in the file a visitor copies, nothing sets it, so a card with padding and a border drew bigger than its numbers (tilt 320 × 216 for a 280 × 176 card, the hovercards 9 units off their slots). The sweep that found those eight (tilt, hovercards, pricing, polaroid, accordion, magnet, shapeshift, cone) is this check, kept. |
| `node scripts/check-contrast.mjs` | `scripts/check-contrast.mjs` | Text readable on both stages: every piece of text a model shows reaches WCAG AA contrast against the pixels actually behind it, on the dark stage and on the light one, at rest and in its main interaction states. |
| `node scripts/check-exports.mjs` | `scripts/check-exports.mjs` | Does the export dialog make what it says, and what the canvas shows? |
| `node scripts/check-motion.mjs` | `scripts/check-motion.mjs` | Watches every model MOVE, not just where it ends up. check-models.mjs measures size and position; this films each model through its animation and through its hover or interaction, and looks for frames that draw wrong on the way. |
| `node scripts/check-perf.mjs` | `scripts/check-perf.mjs` | What a model costs to run: how much it draws, how long its frames take, how fast it answers the pointer, and whether playing with it over and over makes it grow. |
| `node scripts/check-remote.mjs` | `scripts/check-remote.mjs` | The release-checklist lines that need a network, asked and written down: whether the remote has anything main lacks, whether the Worker answers the site and refuses a stranger, whether the build variable is set, and whether the Worker was deployed after its code last changed. |
| `node scripts/check-signoff.mjs` | `scripts/check-signoff.mjs` | The deploy, refused unless the person publishing said to push THIS commit. |
| `node scripts/check-stages.mjs` | `scripts/check-stages.mjs` | Judges the OTHER half of docs/VIEW-CONTRACT.md: not "does the model fit the band" (that is scripts/check-models.mjs) but "is it the same model everywhere". A model is measured in vmin of its own canvas on every surface the site shows it on, and the numbers have to agree. |
| `node scripts/checklist-proofs.mjs` | `scripts/checklist-proofs.mjs` | Runs the proofs of docs/RELEASE-CHECKLIST.md that are cheap, local and read-only, for scripts/ledger.mjs. Each item gets one of. |
| imported, not run | `scripts/checks-registry.mjs` | The one list of checks the ledger knows. scripts/capture-check.mjs runs and records them, scripts/ledger.mjs gates "checked" on the per-model ones and writes this list into docs/ledger.json, and docs/ledger.html draws every check from it: its progress bar, its column in the model table, its part in "checked" and its row in the definitions dialog. Adding a check here (and a parser for its output in capture-check.mjs) is all it takes for it to show up. Not run on its own. |
| `node scripts/contact-sheet.mjs` | `scripts/contact-sheet.mjs` | Review tool: photographs demos from the BUILT site into contact sheets, two moments per demo, so a batch of new demos can be checked by eye in one look. |
| imported, not run | `scripts/css-heads.mjs` | The hover and focus targets a model's CSS names: for every selector with :hover, or with :focus, :focus-visible or :focus-within, the part in front of it. check-access and check-motion both read targets this way, so they agree on what a model's hover and focus targets are. Not run on its own. |
| `node scripts/diag-record.mjs` | `scripts/diag-record.mjs` | Records a model exactly as the maker does, then plays the file back frame by frame and reports what actually came out: how many frames the player saw, how evenly they are spaced, how many are repeats of the one before, and whether the end meets the beginning again. |
| `node scripts/diag-video.mjs` | `scripts/diag-video.mjs` | Is the video capture producing steady motion? |
| imported, not run | `scripts/embed-page.mjs` | The embed page of one model: the page the checks photograph and the share image is shot from. |
| `node scripts/export-defaults.mjs` | `scripts/export-defaults.mjs` | The export dialog's DEFAULT settings, in one place for the two scripts that must agree on them: scripts/check-exports.mjs makes exactly these under --defaults, and scripts/capture-check.mjs counts a model's export as checked only on its mismatches about these (isDefault). |
| `node scripts/fingerprint.mjs` | `scripts/fingerprint.mjs` | What a check result or a review judged, as fingerprints, so the ledger can tell whether it still describes the model as it is now. Each result depends on exactly what it judged. |
| `node scripts/gate-paths.mjs` | `scripts/gate-paths.mjs` | WHAT EACH GATE STEP'S RESULT DEPENDS ON. |
| `node scripts/generate-capture-fonts.mjs` | `scripts/generate-capture-fonts.mjs` | Puts the capture fonts where the site can serve them, and writes the small module that fetches them when someone actually exports. |
| `node scripts/generate-pages.mjs` | `scripts/generate-pages.mjs` | Generates one real HTML page per demo and per group, plus sitemap.xml, robots.txt and the "all demos" link list for the home page. Runs before `vite` / `vite build`. |
| `node scripts/jobs.mjs` | `scripts/jobs.mjs` | EVERY PROCESS THIS PROJECT HAS, IN ONE LIST, SO THE BOARD CAN OFFER THEM. |
| `node scripts/ledger-server.mjs` | `scripts/ledger-server.mjs` | Serves the ledger page, and runs the checks when the page asks. |
| imported, not run | `scripts/model-sources.mjs` | Where each model's own source text lives, read straight from the files. Shared by scripts/ledger.mjs (what is converted, which commits touched what) and scripts/capture-check.mjs (a fingerprint of each model's source at the moment a check ran). |
| imported, not run | `scripts/og-shot.mjs` | How a social preview image is shot: shared by scripts/generate-media.mjs, which makes dist/media/<id>.jpg, and scripts/check-media.mjs, which renders the same page again to prove the file is what the site draws now. Not run on its own. |
| imported, not run | `scripts/pixels.mjs` | Reading screenshots: Chromium's PNGs decoded to RGBA, averaged into cells, and compared. Shared by scripts/check-motion.mjs (which films models move) and scripts/check-access.mjs (which checks they stop when paused, and that focus shows), so both judge a picture the same way. |
| `node scripts/pre-push.mjs` | `scripts/pre-push.mjs` | The push, refused while the release checklist is open. Run by git, from scripts/hooks/pre-push. |
| `node scripts/preview-check.mjs` | `scripts/preview-check.mjs` | Does editing a model leave its live frame alone? On /models/cube/ (served from source by Vite, no build needed) it pauses the animations at 1137 ms, then asserts that the frame's document, the cube's box, the scene's zoom and the animation clocks are unchanged after: a whitespace-only CSS edit, a colour edit, "Reset to original", and opening the Image dialog (whose live view must keep the same document). Exits non-zero on the first difference or any page error. |
| imported, not run | `scripts/push-gate.mjs` | What stands between this code and a push, decided once and read the same way by everyone. |
| `node scripts/release-after.mjs` | `scripts/release-after.mjs` | After the push: the deploy, then the site as served. |
| `node scripts/release-prepare.mjs` | `scripts/release-prepare.mjs` | Prepare the release: everything the push is waiting for that a machine can do, then stop at the sign-off, which is a person's. |
| `node scripts/release-snapshot.mjs` | `scripts/release-snapshot.mjs` | The release snapshot: the one file about check results that is COMMITTED. |
| `node scripts/running.mjs` | `scripts/running.mjs` | The one answer to "is a check running, and how far has it got". |
| imported, not run | `scripts/seo-limits.mjs` | How long a page's <title> and meta description may be, shared by scripts/generate-pages.mjs (which fits each page's fixed wording to them) and scripts/check-seo.mjs (which fails a page over them). Not run on its own. |
| `node scripts/shot.mjs` | `scripts/shot.mjs` | A picture of a model, so a person can look at it. |
| `node scripts/snippet-check.mjs` | `scripts/snippet-check.mjs` | Review tool: renders each snippet's standalone page (what "Copy as one HTML file" gives) with no build, reports script errors or empty pages, and photographs them all into .media-tmp/snippets.jpg. |
| `node scripts/snippet-chunks.mjs` | `scripts/snippet-chunks.mjs` | The Vite plugin that gives every snippet its own chunk, fetched when its model is mounted. |
| imported, not run | `server/render.mjs` | Shared by the Cloudflare Worker and local Playwright service. No files, sessions or images are persisted. A stream owns exactly one isolated browser context and disposes it on cancel. Not run on its own: imported by server/dev.mjs (npm run export) and worker/src/index.ts. validateCapture / readCapture check a posted scene (at most 8 MB, 900 frames, 30 fps, 8192 px a side, MAX_PIXELS device pixels a frame); renderCapture draws it and streams one `{ index, png }` (or `{ index, webp }`, when asked for) JSON line per frame. |

<!-- scripts:end -->

### What the checks write

Not scripts: files a run leaves behind, which the board and the release checklist read.

| Record | File | What it holds |
| --- | --- | --- |
| `check-live` records | `docs/checks/live.json` | What the site AS SERVED answered, so the four "after the push" checklist lines are answered by a run rather than by memory. Judged by commit rather than by fingerprint, deliberately: they are claims about what is served, so a commit that has not been deployed SHOULD retire them. The served pages are compared with `dist/` with the build stamp and every carriage return set aside: a Windows checkout writes CR LF into the generator and one CR into the HTML, and the deployed build from Linux has none. |
| the matrix records | `docs/checks/matrix.json` | A FULL `check-exports` run — the sample at every shape, size, quality and slider stop. `--defaults` is the gate's half of that line and is already per model in `exports.json`; `--quick` is neither and records nothing. |
| a run in flight | `docs/checks/gate-progress.json` | Written by `verify` at every step boundary and cleared when it ends, so the board can say "step 9 of 18" instead of going quiet for the seven steps that record nothing per model. Carries the pid, so a runner killed without clearing it is reported as stopped rather than believed. |
| `check-parity` extras | `docs/checks/parity.json` | A `--render` run writes what it drew, on which renderer and whether the pictures agreed, so the release-checklist line it answers is answered by a run rather than by memory. The scan alone records nothing: it proves the precondition, not the picture. |

Every script says how to run it in the comment at its top.

**Scratch output goes under `.media-tmp/`, never in the repository root.** Screenshots, contact
sheets, frame dumps, throwaway scripts and anything else a check or a working session produces
belong in `.media-tmp/` (gitignored) or in that session's own scratch directory outside the repo.
Two folders of screenshots, `current/` and `lead/`, were once left at the root by agent sessions
and had to be moved to `.media-tmp/shots/`: anything at the root turns up in `git status` and is
one `git add` away from being committed. `git status --short --untracked-files=all` should print
nothing but what is deliberately ignored.

**Shared by the scripts above, not run on their own.** `scripts/browser.mjs` is the one place a
check opens a browser, so "which Chromium do the checks run on" is answered once.
`scripts/pixels.mjs` decodes Chromium's PNGs and compares them, so `check-motion` and
`check-access` judge a picture the same way. `scripts/model-sources.mjs` says where each model's
own source text lives, for the ledger's fingerprints. `scripts/checks-registry.mjs` is the one list
of checks the ledger knows. `scripts/gate-paths.mjs` says what each gate step depends on, the way `scripts/fingerprint.mjs` says what each model result depends on: a step's recorded pass dies when a file on **its** path changes, not when any commit happens. Before that, a typo in this file retired a four-hour record and six checklist lines with it. `scripts/checklist-proofs.mjs` runs the cheap, local, read-only proofs
of [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) for the ledger, marking every other item
"not evaluated here" with the reason. A proof answers one of three ways, and the ledger acts on
each differently: `true` ticks the item whatever the file said, `false` unticks it, and
`not-evaluated` leaves the tick alone — a proof that could not RUN is not a verdict, and the tick
is then the only evidence there is. The two items under **Yours** are never moved by a proof. The
counts on the board are taken after that rule has moved the ticks, not from the file: they were
taken before it until 2026-09-28, which is why the bar and the heading could disagree. `scripts/seo-limits.mjs`, `scripts/export-defaults.mjs`,
`scripts/og-shot.mjs`, `scripts/css-heads.mjs`, `scripts/fingerprint.mjs` and
`scripts/browser-guard.mjs` are described where the check that uses them is.

**When the browser breaks.** Every browser-driven check (`check-models`, `check-stages`, `check-motion`, `check-access`, `check-media`, `check-exports`, `check-boxsizing`, `check-contrast`, `check-perf` and `qa`) runs its models through `scripts/browser-guard.mjs`, so one bad moment costs at most one model, not the rest of the run:

- A model whose run hits a browser-level error (a protocol error, "Unable to capture screenshot", a `goto` or `setContent` timeout, a crashed or closed target, a disconnected browser) runs again, once, in a fresh browser, and its result says `retried after a browser failure`. Only a second failure makes it fail or `BROKE`, and the next model starts in a fresh browser too.
- The browser is replaced every 20 models (`C3D_RELAUNCH_EVERY`), so its memory cannot creep up over a long run.
- **One check at a time, one browser stream.** `npm run verify` finishes each check before it starts the next, and the check itself holds at most `C3D_MAX_BROWSERS` browsers (default 2, in `scripts/browser-guard.mjs`). Running two checks side by side halved the wall-clock and cost 87% of memory, 100% of the processor and a laptop nobody could use, so it does not.
- Before each model, free memory is read. Under 1.5 GB (`C3D_MIN_FREE_GB`) the check waits, logging `waiting for memory: X GB free` every 10 s, for up to 3 minutes (`C3D_MEM_WAIT_S`). If memory is still low, the model runs anyway and its result says `ran under memory pressure`. Nothing else is ever killed.
- A crash inside Playwright ends the run with `CRASHED` on stderr and exit 3, not silently. Results printed before the crash are kept: `capture-check` records each model as its line arrives, `check-stages` prints its report for the finished models under a `PARTIAL` line, and `check-motion` and `check-access` write their `report.json` so far.

The notes go on each model's own line, where `capture-check` records them with the result. For `check-stages` and `check-exports` they go on a `note:` line under the model instead, and for `qa` on a `note:` line after the problems. Those lines show in the log, but `capture-check` does not record them. Messages about the browser itself go to stderr, prefixed `browser-guard:`. The checks' output is otherwise unchanged, so `capture-check` reads it as before. To test the guard, `C3D_FAULT=kill-after:N` kills the browser once after the Nth model, `kill-during:N` kills it 3 s into a model, and `crash-after:N` throws an unhandled rejection.

## Running the ledger

The ledger is a **local tool**. Nothing about it is hosted: the page is `docs/ledger.html` in this
repository, served by your own dev server, and the numbers on it are whatever your machine has
measured. There is no account, no service and no shared database.

```bash
npm install
npm run dev                          # Vite, on the port it prints
npm run capture -- contrast          # run a check and record it (add ids for a few models)
npm run ledger                       # rebuild docs/ledger.json from what has been recorded
npm run ledger:watch                 # or: rebuild it whenever something it reads changes
npm run now -- --watch               # a second terminal: what is running, MEASURED
```

`npm run now` measures rather than reports: it looks at the processes on this machine and at what
each check has written, and when it cannot look it says so instead of saying "nothing is running".
Those are opposite facts. It answers `ALIVE`, `STOPPED`, `PAUSED` or `UNKNOWN`, with an exit code
for each.

It is a terminal tool on purpose. A watcher that needed a browser would be driving one while the
checks drive theirs, and that changes their answers: `stackbars` and `candles` have failed stage
checks under exactly that load and passed clean on an idle machine.

Then open the ledger. There are two ways to serve it and they have different addresses:

| started with | address | runs checks from the page |
| --- | --- | --- |
| `npm run board` | <http://127.0.0.1:5178/ledger.html> (it prints it) | yes |
| `npm run dev` | <http://localhost:5183/docs/ledger.html> | no: it only shows what was recorded |

`npm run board` is the one to use. The second address answers only while `npm run dev` is running,
and a person who had started the board and opened it found nothing there.

What you will see on a fresh clone:

- **Every bar reads "not run yet", and all 143 models sit under "To check".** That is correct, not
  a fault. The raw run records (`docs/checks/`) are gitignored — they are megabytes of one
  machine's workings, and someone else's run is not your result. Bars fill in as you capture
  checks, one at a time.
- **Beside each of those bars, a dashed pill: "at the last release".** That is
  `docs/release-snapshot.json`, which *is* committed: one line per model per check — status, the
  rule version it was judged under and when it ran — from the release it was taken at. A notice
  above the bars names the commit and says whether the snapshot still describes the code you have.
  It is never counted as a run of yours: it moves no bar and approves no model. Write a new one
  with `node scripts/release-snapshot.mjs`, and check it still fits HEAD with `--check`.
- **Two checks need something extra.** `npm run capture -- exports` needs the render service, so
  start `npm run export` in a second terminal first. Every browser-driven check needs Playwright's
  Chromium: `npx playwright install chromium` if you have not got it.
- **In PowerShell, use `npm.cmd` or call node directly.** npm ships three launchers and PowerShell
  picks `npm.ps1`, which a `Restricted` execution policy refuses to load at all —
  `npm run now -- --watch` then fails with "cannot be loaded because running scripts is disabled on
  this system", and so would every other `npm run` in this file. `npm.cmd run now -- --watch` skips
  the `.ps1`, and `node scripts/now.mjs --watch` skips npm. Git Bash and cmd are unaffected, as are
  macOS and Linux. Nothing here needs the execution policy changed. `scripts/signoff.mjs` prints
  its own instructions in whichever form works on the shell it is running on, because the first
  version answered a blocked `npm run` by printing the same blocked `npm run` back.
- **It runs the same on macOS, Linux and Windows.** Node 22 and the commands above are all it
  needs. The checks shell out to exactly two programs: `git`, and `taskkill` on Windows only —
  there a check's Chromium is a grandchild that outlives killing Node, so `scripts/verify.mjs`
  kills the tree; everywhere else it sends SIGKILL. Every path is built with `join`/`resolve`, so
  nothing assumes a separator, and every relative import matches its file character for character,
  which is what a case-sensitive filesystem needs. The deploy builds on `ubuntu-24.04`.

A full `npm run verify` is the gate before a push, not a thing to run while working: see the
`verify` row above, and run it on an idle machine.

## The Ledger

See [docs/LEDGER.md](docs/LEDGER.md) — what the board is, what a fresh clone has to run before it
shows anything, how a line is judged, when a result stops being true, and what each check costs.
Start with `npm run doctor`: it asks every question the checks assume and says what, where and why
when one fails. The board asks it for you on a first visit, from its **Start here** panel, and a
six-stop tour there walks the page itself.

Nothing needs a terminal. **Run** in the header offers every process this project has — the gate
step by step, each check, each job — greys out what this machine cannot do and says why, and adds
up what a choice of gate steps will cost before you start it.

Each gate step records a fingerprint of the files it judges ([`scripts/gate-paths.mjs`](scripts/gate-paths.mjs)),
so the board can say which of four things is true of its last result:

| state | meaning |
| --- | --- |
| **current** | the files it judges are unchanged since it ran |
| **stale** | those files changed — and it names the ones that moved |
| **failed** | it failed the last time it ran |
| **not known** | it cannot be shown to be about this code (no fingerprint, or the rule for what it depends on was redefined) |

"Not known" is deliberately not "current", which is why there is more than one button. **What the
push needs** is chosen when the dialog opens: the steps that close a line of the release checklist
that is open now, and nothing else. **Only what is stale** takes the steps the board can show need
running, and **Anything not proved current** takes those plus everything it cannot vouch for. They
usually differ by hours.

### What keeps itself up to date

While `npm run board` is running, nobody has to remember any of these:

| what | kept current by |
| --- | --- |
| the board's page, `docs/ledger.html` | built from `src/ledger/` at start and when that source changes; not committed |
| the list of scripts in this README | written from the comment at the top of each script when one changes; commit the result |
| each line of the release checklist | its proof, run when the ledger is built; nobody ticks the list |
| whether a push is allowed | one verdict, written by the ledger and read by the page, `signoff` and the pre-push hook |
| which checks a change needs | each open line names the step or job that closes it |

What stays with a person: saying to push, reading a document to judge whether it is right, and
looking at the models the motion check flags.

A check that was *refused* — an HTTP 4xx or 5xx, a browser that would not start — records no verdict
at all and leaves the previous measurement standing, because a run that could not ask has learned
nothing. `check-remote` carries no fingerprint on purpose: it asks GitHub and Cloudflare, and no file
here decides those answers.

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
