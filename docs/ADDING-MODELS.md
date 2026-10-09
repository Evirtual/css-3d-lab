# Adding models

**The snippet is the model.** The site renders nothing else: every card, the viewer, the model's
page, an edited version, a recording and a snapshot run the model's copy-paste snippet in a frame
of its own (`src/preview.ts`), and that frame is the canvas. What a visitor copies is exactly what
they saw.

Every model is written to [VIEW-CONTRACT.md](VIEW-CONTRACT.md): one base unit tied to the canvas,
one band every model lands in, controls that are the same object everywhere. Read it before you
write a line. Nothing outside the model sizes it, moves it or corrects it, so a model that looks
wrong is a model whose own code is wrong.

**The contract fixes outcomes, not designs** (VIEW-CONTRACT.md, [Outcomes, not
designs](VIEW-CONTRACT.md#outcomes-not-designs)): centred, within the size band, text readable on
both stages, finished at rest, the same on every surface, no reliance on outside CSS. How a model
gets there is free, so invent. It declares its shape class (normal, `'wide'`, `'expands'`,
full-canvas), and when a good design does not fit any class, add a class, with its reason, its
check, a broken copy that proves the check and the docs, rather than bending the model into a worse
design. Whether its 3D is right and its motion reads as the thing is for a person to judge, in a
close-up review.

## What a model is

| What | Where | What it is for |
| --- | --- | --- |
| **The snippet** | a `Snippet` (`src/models/snippet-utils.ts`) keyed by the id, in one of the maps `src/models/snippets.ts` merges | `{ how, html, css, js? }`: the only thing drawn, and what visitors copy |
| **The gallery entry** | a `Demo` object (`src/models/types.ts`) in an array under `src/models/`, listed in `src/models/index.ts` | metadata only: `id`, `title`, `added`, `description`, `category`, `tags`, `technique` |
| **Its group** | `MEMBERS` in `src/models/groups.ts` | where it sits in the gallery; an unassigned id throws |

The `id` is lowercase letters and digits. The JSON-driven charts keep both halves in one file,
`src/models/charts/<id>.ts`, exporting `demo` and `snippet`: `src/models/batch-l.ts` imports each
chart's `demo` by name for the gallery, and `src/models/snippets-batch-l.ts` its `snippet` for the map.

**Keep snippets out of what the browser loads.** The gallery entries (`src/models/index.ts` and
everything it imports) are in every page's JavaScript. A snippet reaches the browser only through
its own chunk, fetched when its model mounts (`scripts/snippet-chunks.mjs`), as long as nothing on
the gallery side refers to it. So a batch file that the gallery imports lists gallery entries
only: build its snippet map in a separate `snippets-*.ts` that only `src/models/snippets.ts`
imports, and import a two-halves file by name (`import { demo as x }`), never as a whole
(`import * as x`). Batch L and batch M once built their snippet maps beside their gallery entries,
and fifteen models' entire code rode along on every page, downloaded a second time when they
mounted: about 49 KB of the home page's 141 (measured 2026-10-02). `npm run check-seo` weighs
every page against its budget, so a regression shows there.

`src/models/index.ts` also holds `FEATURED`, which decides what the gallery opens with.

**The old implementation is gone** (2026-09-22). `Demo` no longer has `html`, `fill` or `init`,
there are no `src/styles/models/_<id>.scss` files and no "Sass source" tab: a model is its
snippet and its gallery entry, nothing else. `src/styles/` is the site's own chrome only; never
add a model's CSS there.

Read these first, as the reference for style: `docs/VIEW-CONTRACT.md`, the `cube` snippet at the
top of `src/models/snippets.ts`, and one chart under `src/models/charts/`.

## The gallery entry

- `category: 'css'` means **zero JavaScript** in the snippet — state comes from `:hover`,
  `:focus-within`, `:checked` (radio/checkbox + label), `@keyframes`. `category: 'js'` means the
  snippet has `js`.
- `tags`: short lowercase search words. They also decide the badge and how the checks play with
  the model (`src/models/interaction.ts`): `'hover'`, `'pointer'` (follows the pointer), `'drag'`,
  `'controls'` or `'form-hack'` (clicked), plus `'loop'` for self-running and subject words
  (`'product'`, `'text'`...). A few ids are overridden in `interaction.ts`.
  `'expands'` marks a model that IS a small control opening into something (a menu button, a
  fold-down menu, a disclosure): it rests at the control's natural size, and the 40vmin floor is
  asked of its open state instead (VIEW-CONTRACT.md, "A control that opens rests small"). Its rest
  is still centred, and its share image is shot open. Only a control gets it: a box, a book or a
  card that opens keeps the floor at rest. Used by `radial` and `dropdown`.
  `'wide'` marks a model whose own design is a long, low line (a clock of three pairs): it is
  sized by its width, at least 80vmin and at most 92, centred as usual, with no 40vmin height
  floor (VIEW-CONTRACT.md, "A wide model is sized by its width"). Used by `clock`.
- `technique`: 3–4 short strings naming the key properties/tricks (the ingredient chips).
- `added`: the day the model joined, `'YYYY-MM-DD'`. The gallery's **Oldest** order sorts by it,
  and models that joined on the same day by their place in the file; **Newest** is exactly that
  order reversed, so a model added at the end of a file today is the first card. `npm run generate`
  refuses a model whose day is missing, malformed or after today.
- `boxSizing` (rarely): `'content-box by design: <why>'`, for a model that draws differently when a
  page makes every box border-box and cannot say which box it means in its own CSS. Say it in the
  CSS first (`box-sizing: content-box` or `border-box` on the boxes whose numbers need it):
  check-boxsizing fails a model that differs without either, and fails the mark on a model that
  draws the same.
- `description`: one or two plain sentences saying what it is and the trick behind it.

## The snippet

`{ how: string[], html, css, js? }`.

- It runs in a frame whose body is the whole canvas (`standaloneDoc` in `snippet-utils.ts`):
  no margin, `overflow: hidden`, and the model's HTML inside `#c3d-scene`, which is
  `position: absolute; inset: 0; display: grid; place-items: center`. `1vmin` is a hundredth of
  the canvas's short side.
- The backdrop and the text colour are the site's (light or dark stage). A model in the band
  paints no backdrop and inherits its text colour. A full-canvas scene paints its own background,
  since the background is the scene (VIEW-CONTRACT.md, rule 8). Pasted into an empty file, the snippet gets a dark page
  (`#0b0d18`, text `#eceefb`).
- **Any text names a family the export carries: `Inter` or `JetBrains Mono`.** Write
  `font: 600 4vmin Inter, system-ui, sans-serif`, never `system-ui, sans-serif` on its own. The
  export sends the scene to a render service to be drawn, and only those two faces travel with it;
  anything else is drawn in whatever that machine has installed, which is not what you saw. The
  service is a Worker on Linux, so `system-ui` there is neither Segoe UI nor San Francisco. Seven
  charts got this wrong and their labels came back up to 7.8% out of place, one of them drawn off
  the edge of the picture — and nothing on this laptop could see it, because here the dialog and
  the render service share a font folder. `npm run check-parity` is what catches it now.
- **Symbols are drawn, not typed.** A character the two faces do not have (★ ♠ ♥ ♦ ♣ ✓, arrows,
  most emoji) falls back to whatever font each machine finds, even under `font: … Inter`, so the
  export's star is not the screen's star — and each visitor's own device picks its own too. That
  includes → and ▾ and fractions like ⅓; the punctuation · — • ° – ‹ › − is fine. Draw the shape
  with CSS or an inline SVG, or write it in words. `node scripts/check-glyphs.mjs` asks the fonts
  about every character every model shows, and the renderer comparison runs it at every release,
  so a release cannot ship one: coin, cardfan, vinyl, dropdown, funnel, rollbutton and waterfall
  were found and fixed that way (2026-10-07/08).
- **Keep glows under about 128 px at export size.** The render service draws soft glows weaker
  (`blur()` keeps about three quarters at large radii) and cuts a very large `box-shadow` (256 px)
  off in a rectangle. The comparison allows for glows that differ (scripts/parity-judge.mjs); it
  cannot make a clipped one look right.
- Plain CSS only (no Sass), hard-coded accent colours (violet `#8b6cff`, teal `#2ee6d6`, pink
  `#ff4d9d`, amber `#ffb547`), generic class names (`.scene`, `.cube`...). Expand any loop by hand
  or, better, drive it with `style="--i:3"` + `calc()` so the CSS stays short.
- `how`: 3–5 steps teaching the trick, may contain `<code>` and `<b>`. Explain *why*, not just what.
- Comment the non-obvious lines. `CUBE_FACES` from `snippet-utils.ts` can be interpolated for cubes.
- `js` (CSS + JS models only): plain browser JS, no imports, no TypeScript. **JS supplies values,
  CSS renders them**: set custom properties or classes and let `transition` / `animation` do the
  motion. No perpetual `requestAnimationFrame` loop; an rAF used for inertia stops when idle. Use
  Pointer Events; it must work with touch. The frame is the model's own page, so scroll and drag
  belong to it (VIEW-CONTRACT.md, rule 10).
- A CSS edit in the editor is applied to the running frame without remounting it, so the
  animation keeps its pose; an HTML or JS edit rebuilds the frame.

## Size and place: the contract, not a measurement

There is no measuring run, no placement file and no override: set the model's base unit `--u` in
`vmin` and every length as a multiple of it (VIEW-CONTRACT.md, rules 1–10). Then check it:

```bash
node scripts/check-models.mjs --pass <id>   # sets --u in vmin, lands in the band, clears the corners, in every state
node scripts/check-contrast.mjs --pass <id> # every text readable on the dark stage and the light one
node scripts/check-boxsizing.mjs --pass <id> # draws the same whatever box-sizing the page sets
node scripts/check-access.mjs <id>          # stops when paused, names its controls, reachable by keyboard
node scripts/snippet-check.mjs <id>         # the standalone file runs with no script error
node scripts/check-stages.mjs <id>          # the same size on every surface and export shape
node scripts/check-motion.mjs <id>          # no flicker or pop through its animation and interactions
```

**Read the numbers with `--pass`.** A model that holds prints only a dot without it; with it,
`check-models` prints the line you size by: `holds gear 82 × 52 vmin; at rest 82 × 52 vmin, off -0, -0`.
The union of every state first, then the resting pose, then how far the drawn stack's middle sits
from the canvas middle, in vmin: **positive is right and down**, negative left and up. A failing
model prints its failure and not its size, so run with `--pass` from the start and keep the margin
in view. `check-contrast` and `check-boxsizing` take the same flag; `snippet-check` prints
`checked N` and nothing else on a pass (exit 0 is the verdict). A text reading you do not believe:
`C3D_DEBUG=1 node scripts/check-contrast.mjs <id>` prints every reading, with the text's rects,
whether it sits on a face that can turn away, and both passes (with every fill hidden, then its
own fill alone), and says when a still moved between its shots and was shot again.

**A model works the moment its id exists.** The browser checks open `/embed/<id>/`, which the
build writes; the dev server the checks start renders that page on demand for any model in
`src/models`, so nothing has to be generated first. (`npm run generate` still writes the pages,
the sitemap and `src/generated/model-ids.json` for the build, and the site's pages get their entry
then.)

**Except `check-stages`, which also measures the model's own page.** `/models/<id>/` is not
rendered on demand: it is the page `npm run generate` wrote, with the code that was there when it
ran. Before it exists the check times out on that page; after the model changes it reports "the
page listing is not the current snippet — run npm run generate". So run `npm run generate` once
the model's code has stopped changing, then `check-stages`. Batch N's writers (2026-10-04) all hit
this: every surface agreed except the stale page.

**Writing several models at once.** Give each model its own pair of files (`batch-<x>-<id>.ts` for
the gallery entry, `snippets-batch-<x>-<id>.ts` for the snippet) and create every pair as a small
placeholder before anyone starts, wired into the batch's two gatherer files: then every id exists,
every check runs on it, and each writer touches only its own two files. Every check loads every
model, so a writer always saves a complete, valid file, and runs one browser check at a time. `snippet-check` writes into `.media-tmp/` and does not create it: `mkdir .media-tmp` once (it is gitignored).

**Look at it.** The checks measure; none of them shows you the model, and whether its 3D is right is
yours to judge (VIEW-CONTRACT.md, "What no check can judge is left to a person"). Two models that
passed every check on 2026-09-30 were wrong to the eye: a cradle whose balls swung inward over
their neighbours, and a knob whose cap hid its own far ticks.

```bash
node scripts/shot.mjs <id>                 # .media-tmp/shots/<id>-{dark,light}-{0,1200}ms[-hover].png, with the ink box in vmin
node scripts/shot.mjs <id> --at 0,800,1600  # the moments you want, ms into its own timeline
```

`snippet-check` also leaves `.media-tmp/snippets.jpg`, one sheet for everything it checked last; it
is overwritten by the next run, so with several people checking at once it is somebody else's.

`check-models` judges a model on a card, by the pixels it actually paints; it never adjusts it.

## Rules learned the hard way (these were all real bugs)

1. **Animate only `transform` and `opacity`.** Never `width/height/top/left/box-shadow/filter`.
   Need a growing bar? `scaleY` with `transform-origin`.
   And a blurred `box-shadow` on many elements of a turning model is redrawn every frame: stairs
   had one on each of its 140 side strips and took 33–42ms a frame, over the perf budget. The same
   glow on its 14 treads costs nothing measurable. Put a glow on the few big pieces, not the many.
2. **The hovered / pressed element must not be the one that moves.** Put `:hover` on a static
   wrapper and move a child that has `pointer-events: none`, otherwise it flickers at the edges.
3. **Coplanar elements have no stable hit-test order in 3D.** For a grid of hoverable tiles give
   the container `pointer-events: none` and the tiles `pointer-events: auto`.
4. Every ancestor between the perspective and a 3D child needs `transform-style: preserve-3d`.
   `overflow: hidden`, `filter`, `opacity < 1`, `mask`, `clip-path` on such an ancestor FLATTEN it.
5. Never move anything to `translateZ` ≥ the perspective (`calc(800 * var(--u))` in most
   models): stop well short and fade out.
6. Rounded faces on a closed box show daylight at the corners: plug them with an inner core
   (the dice's plate is one).
7. `backface-visibility: hidden` on faces that must not show mirrored from behind (text!).
8. Keep it light: at most ~60 elements, no big blurs, no `filter` on animated elements.
9. Loops must be seamless (end state == start state) and use `linear` or symmetrical easing.
10. Keyboard: hover-only models get `tabindex="0"` and the same effect on `:focus-visible` /
    `:focus-within`. Real `<button>`/`<input>` for controls. A control that has to be ARIA (a
    `role="slider"` knob) is clicked by the checks like a native one, so it is operated, not only
    found.
11. Honour reduced motion only by not being aggressive; the site has its own pause switch that
    sets `animation-play-state: paused` on everything in a stage. It pauses CSS only, so JS that
    moves the model on a timer or a `requestAnimationFrame` loop reads the frame's
    `<html data-paused>` on every step and also honours `prefers-reduced-motion` (the clock
    snippet shows how; docs/VIEW-CONTRACT.md, "A paused model stops its script too").
    `npm run check-access` proves it, with names and keyboard reach.
12. **A negative length is `calc(-N * var(--u))`, never `-calc(...)`.** `-calc(...)` is invalid
    CSS, so the whole declaration is dropped: the candlestick chart lost the `translateY` that
    lifted its wicks off the floor, and the dice's corner plate sat flush with the faces.
13. **JS that writes a length writes a plain number, and CSS multiplies it by `--u`.** A script
    that writes `px` (`el.style.setProperty('--h', h + 'px')`) sizes that part in pixels while
    the rest of the model scales with the canvas. Seven charts had this bug. Write
    `--h: 42` from JS and `height: calc(var(--h) * var(--u))` in CSS.
14. **The painted-pixel ruler is the judge, not element boxes.** `check-models` photographs the
    frame and measures every pixel with ink in it. A circle fills a square box and a ring turning
    in the screen plane sweeps one, so an element box reads up to a third bigger than what is
    drawn; a `box-shadow` is ink no box contains. Size a model by what the check reports.
15. **A wide single line is too short for the height floor.** A line at a width that fits the
    canvas is well under 40vmin tall, and making it taller makes it too wide. When the line IS
    the design, keep it and mark the model `'wide'`: it is then sized by its width, 80 to
    92vmin, centred, with no height floor (the flip clock stands on one line this way). Restack
    only when two lines are a layout the model would have anyway; the extruded headline, the
    pointer-lit text, the letter wave and the layered text (GO over DEEP) stand on two lines.
16. **A caption or a row of controls gets no centring allowance.** The control zone is as tall as
    what it holds (a caption alone is one 5.4vmin line), never a fixed 16vmin reserve, and the
    whole drawn stack, model box, 4vmin gap and zone, is centred. check-models holds every model,
    with controls or without, to 4vmin off the middle both ways, measured on the solid ink of the
    model and its zone together. It once allowed 11vmin vertically with a control zone, and models
    with a caption sat visibly high on their cards and passed. A model that lays its own caption
    out (the toggle's "Dark mode" under its track) centres the whole of it, caption included.

## How long the checks take, and which ones you actually have to run

**Checking one new model is about a minute of work, not an afternoon.** The hours you will see
quoted anywhere in this repository are for re-running all 135 at once, which only happens when a
file every model shares has changed. Adding a model changes only that model.

Measured on one laptop, over all 135 models, on 2026-09-25:

| check | all 135 | which is, per model |
| --- | --- | --- |
| contract (`models`) | 7m22s | ~3 s |
| qa | 1m05s | under a second |
| same on every surface (`stages`) | 26m57s | ~12 s |
| share preview (`media`) | 2m28s | ~1 s |
| access | 9m12s | ~4 s |
| **exports, at the dialog's defaults** | **70m48s** | **~31 s** |

So the nine per-model checks on **one** model come to roughly a minute of measuring, plus a few
seconds for each browser to start. Run them on your model's id and nothing else:

```bash
npm run capture -- models <id>
npm run capture -- stages <id>
npm run capture -- exports --defaults <id>      # the render service must be up: npm run export
```

### The export matrix is NOT one of these, and nothing makes you run it

This is the part that confuses people, so: **the matrix is not a separate check.** It is the same
`check-exports` run in a deeper mode, and the flag is the whole difference.

| | what it makes | how long | does it gate a model? |
| --- | --- | --- | --- |
| `check-exports --defaults <id>` | the dialog's default settings: a 1:1 1600 px PNG, a 9:16 1080p video, one drift take | **~31 s a model** | **Yes.** This is the verdict the ledger counts |
| `check-exports <id>` (no flag) | *every* shape × size × quality × format, and every stop of the Model size slider | **~6.5 min a model**, twelve times more | **No.** It is no model's verdict; the release checklist runs it on the sample before a push |

The matrix proves **the export dialog**, not your model. Its job is to catch a bug in the pipeline —
a format that writes the wrong header, a slider stop that puts the model off centre — and those are
the same for all 135 models, so it runs on a built-in sample of eight and that is enough. If you
have added a model and not touched `src/video.ts`, `src/record.ts` or `src/capture-scene.ts`, you
never need to run it.

The ledger says this too, in the check's own title: **"Export at default settings"**, with step 5 of
what it covers reading *"the rest of the settings matrix … run on a sample of models, and never part
of a model's verdict."*

For the record, running it over all 135 was tried on 2026-09-25 and stopped after seven models. It
found two things, and both were worth knowing and neither was a release blocker: `flaptext` drifts
2.4% at 3200 px because its script keeps flapping while a 4.7-second render runs, and `city`'s 9:16
480p first frame came back unreadable, as `candles`'s had, while the drift pass read that identical
clip perfectly moments later. That was the check, not the encode. On 2026-10-01 the same "frame 0
none" stopped two releases' matrix runs (`coverflow`, then `browser`), and a saved file showed the
model in frame 0 on every read but the first: the check had drawn the video before it had a picture.
An MP4 cannot be see-through, so `check-exports` now reads a frame that came back with no pixels
again, at most five times, and its log line says so ("read again 1 time").

## Checks before committing

- `npm run check-models -- <id>` holds; `node scripts/check-stages.mjs <id>` and
  `node scripts/check-motion.mjs <id>` for anything that moves or is played with. Run them through
  `npm run capture -- models <id>` (or `stages`, `motion`) to record the result for the ledger.
- `node scripts/check-contrast.mjs <id>` and `node scripts/check-boxsizing.mjs <id>`, recorded with
  `npm run capture -- contrast <id>` and `-- boxsizing <id>`. A text in a fixed colour on the bare
  stage cannot reach 4.5:1 on both stages: inherit the stage's ink (softened with opacity, as the
  caption is), or put it on a surface of the model's own.
- `node scripts/snippet-check.mjs <id>`: the standalone page has no script error.
- `npm run build` regenerates every static page, runs `tsc`, and must pass.
- Commit `src/sitemap-dates.json` if the build changed it.

## Where you watch it get in

The ledger is where a new model becomes a finished one, and it is a local page: `npm run board`, then
the address it prints (<http://127.0.0.1:5178/ledger.html>). The README
section "Running the ledger" has the whole of it; this is only what your model does.

The moment its id exists, the count goes up and your model appears under **To check**, every mark
reading "not run yet". Nothing is assumed about it. Then:

1. **To check** — until every automated check above has a pass recorded on the code as it is now.
   The row says which check is missing, and a check you ran without `npm run capture` records
   nothing: the ledger only reads what was captured.
2. **Approved** — every check has a pass recorded on the code as it is now. Nothing else: no
   sign-off, no record of anyone having looked.

There used to be a third stage between these, Awaiting review, and a model reached Approved only
once a visual review and a text review were recorded against it in `docs/reviews/`. That is gone.
This ledger holds what a machine can measure and confirm by itself, and whether a model is any
good is not that: it is a person watching the real thing, which happens on what is shipped. Two
items on the release checklist wait for a person — that the article has been read, and that the
word has been given to push — and they are the only two.

Edit the model afterwards and its ticks go grey, naming what changed and at which commit: the
resolved snippet, the files that draw it, its own words, or the rule a check was judged under. Run
the checks it names again. That loop is the whole system, and it is the same loop whether the model
was written by a person or handed to an agent.
## Its video and picture

Nothing to do: the Video and Image buttons send the live model to the render service (see the
README, "Recording, snapshots and print"), so a new model has both the moment it is live, and they
can never show an old version of it.
