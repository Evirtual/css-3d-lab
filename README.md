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
| `compare` | `scripts/compare-capture.mjs` | Does a snapshot from the render service match the screen? Every model is screenshotted on the page and captured through the dialog's own code, and the two pictures are compared. A gate step. It uses a service already answering on 8787 if there is one and starts its own otherwise, and prints which — an external service runs the code it was started with, not the working tree, and a pass drawn by a service three days old is not a pass. Sheet of `[screen | capture | diff]` strips in `qa/capture-diff.png`. |
| `looks` | `scripts/three-looks.mjs` | What can only be answered by opening the export dialog and looking, asked once on /models/cube/ against its own Vite: 4K is held back and says why, and every file the dialog hands out is named after its model and its settings (read from the browser's own `download.suggestedFilename()`). Those two are checklist items. A third look — View zoom gone from the page, Model size alive inside the dialog — is kept without one: its item was removed on 2026-09-26 as a migration that had landed, and a migration that landed can come back. It is **not** one of the checks in `scripts/checks-registry.mjs` — it asks a few questions once, on one model, not the same question of all 135 — but the gate does run it, after `compare`, and it writes `docs/checks/looks.json` so the checklist lines it answers are answered by a run rather than by memory. Two of its looks download a real file, so it starts a render service on 8787 if nothing is answering there. It finds its own item numbers by matching each item's words in `docs/RELEASE-CHECKLIST.md`, and an item it cannot find is a failure, never a silent skip. One PASS/FAIL line per thing asked, exit 1 on any failure; about a minute. |
| `capture` | `scripts/capture-check.mjs` | Runs `check-models`, `check-stages`, `check-motion`, `check-exports`, `check-media`, `check-access`, `check-boxsizing`, `check-contrast`, `check-perf` or `check-app` (the list is `scripts/checks-registry.mjs`, which the ledger and its page read too) unchanged and records each model's result in `docs/checks/<check>.json` for the ledger: `npm run capture -- models cube dice`. The per-model export proof is `npm run capture -- exports --defaults <all 135 ids>`. Each result records its check's `ruleVersion` (in the registry, bumped whenever a rule's meaning changes), and a result judged under an older one is stale, "rule changed (vN → vM)". |
| `verify` | `scripts/verify.mjs` | The gate: eighteen steps, one at a time, over every model, about four hours on an idle machine. It builds first (`npm run build`, so `tsc` and `vite build` answer for themselves), then runs the eleven checks in `scripts/checks-registry.mjs` through `scripts/capture-check.mjs`, so their verdicts and their progress land where the ledger reads them and the page shows it going. Seven more steps record nothing per model and say so rather than borrowing another check's green: `check-remote` first, then `qa`, `snippets`, `preview`, `compare` and `looks` after `qa`, and `check-parity` after `exports`. No shards: one check, one browser stream, a machine that stays usable. Run some of it with `-- --step qa,snippets`: each step records a fingerprint of the files it depends on (`scripts/gate-paths.mjs`), so its result stands on its own and a partial run updates those steps and leaves the rest of the record as it was. The eleven checks with per-model results are unaffected either way — the board reads those from `docs/checks/<check>.json`. Ends with `GATE HOLDS` or `GATE FAILS`, and writes `docs/checks/gate.json` — what ran, how each step ended, at which commit — which six release-checklist lines read, because work that nobody wrote down leaves those lines answering "not evaluated" about a run that had just happened. |
| `ledger` | `scripts/ledger.mjs` | Writes `docs/ledger.json`: per model, its stage (To check or Approved), its commits and its check results. `--u` in vmin is part of the contract check, not a stage of its own. `docs/ledger.html` shows it. A result is stale only when something it judged has changed since, and the ledger says what and at which commit: the resolved snippet (shared constants such as `CUBE_FACES` filled in), how the model is played (`interaction.ts`), its text, or a file on that check's render path (the model frame, the export code, the share-image layout). A contract, stage or motion result does not go stale on a text-only change; a text review does not go stale on a change to the frame. The rules are in `scripts/fingerprint.mjs`; results and reviews that recorded only a commit are judged by the model as it was at that commit, rebuilt from git and cached in `.cache/` (the first build after new commits takes a few minutes). |
| `ledger:watch` | `scripts/ledger-watch.mjs` | The same process as `board`: rebuilds `docs/ledger.json` whenever HEAD, a check result or a model file changes, and serves the page. |
| `board` | `scripts/ledger-watch.mjs` | **The ledger, with its buttons.** Serves the page and runs the checks when it asks: run everything or one check, pause, resume, stop. Prints the address to open. This is the whole thing a person who cloned this repository needs. |
| `now` | `scripts/now.mjs` | What is running, **measured**: which check on which model, whether the dev server and the render service answer on their ports, how far a run has got (read from the file the run itself writes) and free memory against the guards' floor. `-- --watch` refreshes every 5s. It only reads. |
| `check-live` | `scripts/check-live.mjs` | The site **as served**, after a deploy — not the `dist/` it was built from. Fetches the real site over HTTPS and asks whether every page in the sitemap is served as HTML, whether what is served is the build in `dist/` (the `?v=` stamps match), whether the `og:image` each page names is really a picture, and whether the served JavaScript carries the capture endpoint. Keeps the download in `.media-tmp/live/`, so `npm run check-seo -- --dist .media-tmp/live` then runs the full SEO check over what is actually served. `-- --base https://…` for somewhere else. Read-only. |
| `signoff` | `scripts/signoff.mjs` | The one item on the release checklist that waits for a person: whether to push. `npm run signoff` shows what is waiting and what still blocks it; `-- push` ticks it in `docs/RELEASE-CHECKLIST.md`, stamped with the date, the commit and the name from `git config user.name`, so the record says who signed; `-- undo push` takes it back. The release article had a second item here until 2026-09-28; it is written and published outside this repository, on its own clock, and a deploy should not wait on a read. It refuses `push` while anything else that can be done before the push is still open, and ignores the "After the push" items, which cannot be true beforehand. Open means neither ticked in the file NOR proven by the ledger: the proofs write nothing back to the markdown, so requiring the tick held the push open on ten items that had just been proven. It pushes nothing and runs no check. |
| `board:dev` | `scripts/board-dev.mjs` | The board with the page served from source instead of from `docs/`, so a change to `src/ledger/` shows without a rebuild. Runs the board and Vite together and prints the address to open. |
| `build:ledger` | `vite build --config vite.ledger.config.ts` | Builds the ledger page itself — `docs/ledger.html` and its hashed `docs/assets/ledger-*.css|js`. `docs/` is not emptied: it also holds `ledger.json`, the per-check results and the written docs, so only this build's own previous output is cleared, by name. |
| `capture-payload` | `scripts/capture-payload.cjs` | Catches one real capture payload from the page so the same bytes can be replayed to both renderers. Without it a comparison is two different requests and proves nothing. Run it, then take a picture in the dialog. |
| `check-renderers` | `scripts/check-renderers.cjs` | Replays the payload `capture-payload` caught against both renderers — the local one and the hosted service — and compares what they draw. Superseded as a gate by `check-parity`, and kept for looking at one payload by hand: it judges on PNG byte size within 10%, which turned out to be inverted (a broken pair differed by 2.3% and a correct one by 6.5%, because a compressed size measures entropy and not position). |
| `check-parity` | `scripts/check-worker-parity.mjs` | The same captured scene drawn by **both** renderers, compared as a picture: the mean difference and where the ink sits in each. A gate step (after `exports` in `verify`), because `check-exports` compares a file against the dialog's canvas and both are drawn on this machine — it cannot see a difference that only exists between machines, which is how a card shipped with its numbers off the edge, and how seven chart models shipped drawn in whatever font the Worker's Linux had. A free scan of every model's source runs first: a font naming no family the scene carries is a risk, and those models are the ones drawn twice. The scan chooses; the drawing judges. `-- <ids>`, `--all`, `--save <dir>`, `--worker <url>`. |
| `check-remote` | `scripts/check-remote.mjs` | The three release-checklist lines that need a network, asked in four seconds: whether the remote has anything `main` lacks (it fetches first), whether the deployed Worker accepts the site's origin and refuses a stranger's (a preflight, so it spends no export quota), and whether the build variable carrying the endpoint is set on the workflow. Writes `docs/checks/remote.json`, which the checklist reads — the proofs run on every board build, several times a minute, and a fetch on that clock is a tax on looking at the page. The first gate step. |
| `doctor` | `scripts/doctor.mjs` | Can this machine run the checks, and if not, why not? Asks every question the checks assume — Node, dependencies, a git repository, **a browser that can actually start**, the ports, and the optional networked parts — and answers a failure in three parts: what failed, where, and why in the words of whatever refused. Writes `docs/checks/machine.json` so the board can say the same thing, with the fixing command beside each item. Changes nothing and installs nothing. |
| `check-parity` extras | `docs/checks/parity.json` | A `--render` run writes what it drew, on which renderer and whether the pictures agreed, so the release-checklist line it answers is answered by a run rather than by memory. The scan alone records nothing: it proves the precondition, not the picture. |

### Checks and tools run with `node`

| Command | What it is for |
| --- | --- |
| `node scripts/check-stages.mjs [id...]` | The same model on every surface (card, viewer, page, editor states, large, full screen, every export shape) must measure the same in vmin. |
| `node scripts/check-exports.mjs --defaults [id...]` | The per-model export proof: drives the real export dialog at its default settings only (image 1:1 at 1600 px PNG, video 9:16 at 1080p and its loop) and checks the file's size, picture, drift and format against the dialog's canvas. About 1 to 2 minutes a model; run over all 135 through `npm run capture -- exports --defaults <ids>`, which records the verdict the ledger reads. The settings are listed once, in `scripts/export-defaults.mjs`. |
| `node scripts/check-exports.mjs [id...]` | The full matrix: every image shape × size, every video shape × quality, the slider and every format. **It gates nothing** — it proves the export dialog, not each model, so it runs on a built-in sample of 8. About 6.5 minutes a model (measured over 7 models, 2026-09-25), against ~31 seconds for the same check at the dialog's defaults, which is the one a model's verdict comes from. See [docs/ADDING-MODELS.md](docs/ADDING-MODELS.md#the-export-matrix-is-not-one-of-these-and-nothing-makes-you-run-it). |
| `node scripts/check-boxsizing.mjs [id...]` | No reliance on outside CSS: each model's standalone file, paused at one moment, at rest and with `:hover` forced, must draw the same with and without a page rule making every box border-box (within 0.25% of the canvas over its own noise). A model says which box its numbers mean in its own CSS; a `boxSizing: 'content-box by design: <why>'` mark in its gallery entry passes one that cannot, and is printed on its line. `--try <file.mjs>` runs it on a model outside the gallery. Record it with `npm run capture -- boxsizing`. |
| `node scripts/check-contrast.mjs [id...]` | Text readable on both stages: every text a model shows, at rest, with `:hover` forced, with the pointer on it and after each of its controls is clicked, against the pixels actually behind its letters, on the dark stage and the light one, at a card's size. WCAG AA: 4.5:1, or 3:1 for large text; text in a disabled control is exempt and listed. `--try <file.mjs>` for a model outside the gallery. Record it with `npm run capture -- contrast`. |
| `node scripts/check-perf.mjs [id...]` | What a model costs to run, at the card's own 340 × 280: how many elements it draws, its frame time at the 95th over two seconds of running, how fast its main interaction answers a real pointer, and whether thirty of that interaction pile elements up (the confetti-freeze class of bug). Every budget, and where its number comes from, is at the top of the file. `--try <file.mjs>` runs it on a model outside the gallery, which is how it is proved on deliberately heavy and leaky copies. Record it with `npm run capture -- perf`. |
| `node scripts/check-app.mjs` | What the gallery costs to use: the built site served from `dist/`, loaded at 1280 × 900 and scrolled to the bottom of all 135 models and back. First load, frame times over the trip, long tasks, memory and documents held after a forced collection, how many model frames stay mounted at the bottom, whether a card moves a pixel, and whether a card scrolled back to is running again. A site-wide check, so it gates no model; record it with `npm run capture -- app`. |
| `node scripts/check-motion.mjs [id...]` | Films every animation and interaction frame by frame and flags flicker, pops and dead or unreachable controls, with a strip per model in `.media-tmp/motion/`. Hints for a human, not verdicts. |
| `node scripts/fingerprint.mjs <id> [--kind visual\|text]` | Prints what a result for the model depends on now (the resolved snippet, how it is played, its text and the render-path files), as the `fingerprints` a reviewer adds to a `docs/reviews/` entry. `npm run capture` records the same with every check result. |
| `node scripts/release-snapshot.mjs` | Writes `docs/release-snapshot.json` from `docs/ledger.json`: one line per model per check (status, `ruleVersion`, when it ran) plus the ledger's counts, about 140 kB. It is the one file about check results that is committed, so a clone can see what the checks said at the last release while its own bars honestly read "not run yet". `--check` says whether the committed snapshot still describes HEAD (exit 0) or which files the checks judge have changed since (exit 1). |
| `node scripts/contact-sheet.mjs [id...]` | After a build: photographs models into sheets in `.media-tmp/` for a review by eye. |
| `node scripts/snippet-check.mjs <id...>` | Renders each snippet's standalone page (what "Copy as one HTML file" gives) and reports script errors or empty pages; sheet in `.media-tmp/snippets.jpg`. |
| `node scripts/preview-check.mjs` | On `/models/cube/`: a CSS edit, a colour edit, reset and opening the export dialog must not remount the frame, move it or lose the animation's pose. |
| `node scripts/diag-record.mjs [id] [quality]` | Records a model the way the dialog does and reports the frames of the file that came out. Starts its own service on 8787. |
| `node scripts/diag-video.mjs [id] [frames]` | Pulls frames through the render service and reports repeats (stutter). Starts its own service on 8787. |
| `node scripts/ledger-server.mjs` | The board itself: serves the ledger page and starts a check when the page asks. It owns the run — it holds the process, refuses a second run of the same check (one check writes one result file), keeps a check that measures speed off a busy machine, and reports what is running, including runs started from a terminal. |
| `node scripts/running.mjs` | The one answer to whether a check is running and how far it has got. A check writes `running: true` and its pid into its own result file; this checks that claim against the machine, so a killed run reads as gone rather than as still going. Imported by the board, the ledger and `now`. |
| `node scripts/board-dev.mjs` | The board and Vite together, for working on the ledger page itself. Also `npm run board:dev`. |
| `node scripts/generate-capture-fonts.mjs` | Copies Inter and JetBrains Mono into `public/fonts/` and writes `src/fonts/capture-fonts.ts`, the module the export dialog uses to fetch them and embed them in the scene it sends to the renderer — so the renderer draws the model’s own lettering rather than whatever it happens to have. Runs as part of `generate`. |

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

There used to be a second record here, kept by hand: `npm run queue` wrote what an agent was
working on into `docs/ledger-queue.json`, and the page showed it under "reported, not measured".
It mattered while fifty-three helpers were running and nothing else could say what they were
doing. It is gone: the agents report in the session running them, and the ledger holds only what
was measured.

It is a terminal tool on purpose. A watcher that needed a browser would be driving one while the
checks drive theirs, and that changes their answers: `stackbars` and `candles` have failed stage
checks under exactly that load and passed clean on an idle machine.

Then open **<http://localhost:5183/docs/ledger.html>** (the port is the one `npm run dev` printed;
`5183` is what this project uses).

What you will see on a fresh clone:

- **Every bar reads "not run yet", and all 135 models sit under "To check".** That is correct, not
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
when one fails.

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
