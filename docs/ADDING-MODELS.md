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
| **The gallery entry** | a `Demo` object (`src/models/types.ts`) in an array under `src/models/`, listed in `src/models/index.ts` | metadata only: `id`, `title`, `description`, `category`, `tags`, `technique` |
| **Its group** | `MEMBERS` in `src/models/groups.ts` | where it sits in the gallery; an unassigned id throws |

The `id` is lowercase letters and digits. The JSON-driven charts keep both halves in one file,
`src/models/charts/<id>.ts`, exporting `demo` and `snippet`, collected by `src/models/batch-l.ts`.

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
npm run check-models -- <id>       # sets --u in vmin, lands in the band, clears the corners, in every state
node scripts/check-contrast.mjs <id>  # every text readable on the dark stage and the light one
node scripts/check-boxsizing.mjs <id> # draws the same whatever box-sizing the page sets
node scripts/check-stages.mjs <id> # the same size on every surface and export shape
node scripts/check-motion.mjs <id> # no flicker or pop through its animation and interactions
```

`check-models` judges a model on a card, by the pixels it actually paints; it never adjusts it.

## Rules learned the hard way (these were all real bugs)

1. **Animate only `transform` and `opacity`.** Never `width/height/top/left/box-shadow/filter`.
   Need a growing bar? `scaleY` with `transform-origin`.
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
    `:focus-within`. Real `<button>`/`<input>` for controls.
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

The ledger is where a new model becomes a finished one, and it is a local page: `npm run ledger:watch`
in one terminal, `npm run dev` in another, then <http://localhost:5183/docs/ledger.html>. The README
section "Running the ledger" has the whole of it; this is only what your model does.

The moment its id exists, the count goes up and your model appears under **To check**, every mark
reading "not run yet". Nothing is assumed about it. Then:

1. **To check** — until every automated check above has a pass recorded on the code as it is now.
   The row says which check is missing, and a check you ran without `npm run capture` records
   nothing: the ledger only reads what was captured.
2. **Awaiting review** — every check is green, and a person has not looked yet. No check decides
   whether the 3D is right or whether the motion reads as the thing it is meant to be; that is why
   this stage exists.
3. **Approved** — the checks are green on the current code *and* a visual review and a text review
   are recorded against it in `docs/reviews/`, each with the name of whoever made the ruling.

Edit the model afterwards and its ticks go grey, naming what changed and at which commit: the
resolved snippet, the files that draw it, its own words, or the rule a check was judged under. Run
the checks it names again. That loop is the whole system, and it is the same loop whether the model
was written by a person or handed to an agent.
## Its video and picture

Nothing to do: the Video and Image buttons send the live model to the render service (see the
README, "Recording, snapshots and print"), so a new model has both the moment it is live, and they
can never show an old version of it.
