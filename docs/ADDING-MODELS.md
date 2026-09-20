# Adding demos

Every demo is three things with the same `id` (lowercase letters/digits only):

| What | Where | Notes |
| --- | --- | --- |
| The demo | a `Demo` object (`src/models/types.ts`) in a file under `src/models/` | markup + optional `init` |
| Its styles | `src/styles/models/_<id>.scss` | all classes prefixed `d-<id>`, keyframes prefixed `d-<id>-` |
| Its copy-paste snippet | a `Snippet` (`src/models/snippet-utils.ts`) keyed by the same id | plain HTML + CSS (+ JS), no Sass |

Then it is wired in: `src/models/index.ts` (demo list; `FEATURED` there decides what the gallery
opens with), `src/models/snippets.ts` (snippet map), `src/styles/main.scss` (`@use 'models/<id>'`),
`src/models/groups.ts` (`MEMBERS`).

Read these first, they are the reference for style and quality: `src/models/pure.ts`,
`src/models/interactive2.ts`, `src/models/snippets.ts` (first 150 lines), `src/styles/_mixins.scss`,
`src/styles/models/_cube.scss`, `_dice.scss`, `_rollbutton.scss`, `_bars.scss`.

## The Demo object

- `category: 'css'` means **zero JavaScript** — state comes from `:hover`, `:focus-within`,
  `:checked` (radio/checkbox + label), `@keyframes`. `category: 'js'` has an `init(scene, stage)`
  that returns a cleanup function removing every listener / timer / rAF it created.
- JS demos: **JS supplies values, CSS renders them** (set custom properties or classes; let
  `transition` / `animation` do the motion). No perpetual `requestAnimationFrame` loop; an rAF used
  for inertia must stop when idle. Listen on `stage` or `scene`, never on `window`/`document`
  unless removed in cleanup. Use Pointer Events. Must work with touch.
- `html` is a template string. Use `{{uid}}` in every `id`/`name`/`for` of form controls (it is
  replaced per mount, the same demo is mounted several times on one page).
- `tags`: short lowercase search words. Use `'loop'` for self-running, `'hover'` for hover-driven,
  `'sass-loop'` when the SCSS uses `@for`/`@each`, plus subject words (`'product'`, `'text'`...).
- `technique`: 3–4 short strings naming the key properties/tricks.
- `description`: one or two plain sentences saying what it is and the trick behind it.
- `fill: true` only when the demo needs the whole stage (scenes, things with a control bar).
  Then the scene is `position:absolute; inset:0`, so size things in `%`, not assuming a size.

## Sizes

The demo sits in a stage with `perspective: 800px`, centred. A card stage is about 340 × 260 px and
can be as narrow as 300 px; the large stage scales non-fill scenes by 1.45. **A non-fill demo must
fit inside about 220 × 190 px including its motion.** Fill demos must look right from 300 × 260 up
to 700 × 380.

## Consistency rules (the site checks these; follow them from the start)

- **Size and centring are automatic.** Design the demo at a card's size (340 × 260); do not
  hand-tune its size or offset. After the build, `scripts/measure-models.mjs` measures every
  demo over its animation and after it is played with, and records a size and an offset in
  `src/models/sizes.json` so all demos look equally big and visually centred. Do not add
  `translate` / `scale` hacks to the root to move it.
- **The camera is the site's.** The stage's scene already has `perspective: 800px`, and it
  scales with the stage, so a demo looks the same in a card, the dialog and full screen. A demo
  may set its own `perspective` on an inner wrapper when it needs a different one.
- **Controls live in the dock.** A demo with controls (buttons, swatches, sliders, arrows, dots)
  is `fill: true` and uses the dock layout: root `display: grid; grid-template-rows:
  minmax(0, 1fr) auto; width: 100%; height: 100%; padding: 10px 14px 14px;`, the model centred in
  the first row, the controls centred in the last row. A status text (`<output>`) or a slider's
  label goes **above** the controls, centred, never beside them. See `_dice.scss`,
  `_turntable.scss`, `_cubenav.scss`, `_shapeshift.scss`.
- **Hover demos**: the hover target never moves (rule 2), coplanar containers get
  `pointer-events: none` (rule 3). A demo with nothing to play with just animates.

## Styles (SCSS)

- Start with `@use '../mixins' as *;` when you use `cube-faces($size)`, `face($color, $alpha)` or
  `solid-core($inset, $color)`. Use `@use 'sass:math';` / `'sass:list'` for maths (no global
  `nth()`, no `/` division). Percent from a number: `#{$x * 1%}`.
- Colours come from the theme tokens so the demo works in light and dark: `var(--accent)` violet,
  `var(--accent-2)` teal, `var(--hot)` pink, `var(--warm)` amber, `var(--text)`, `var(--muted)`,
  `var(--bg)`, `var(--surface-solid)`, `var(--border)`, `var(--border-strong)`. Mix with
  `color-mix(in srgb, var(--accent) 30%, transparent)`.
- Put declarations before nested rules (Sass warns otherwise).

## Rules learned the hard way (these were all real bugs)

1. **Animate only `transform` and `opacity`.** Never `width/height/top/left/box-shadow/filter`.
   Need a growing bar? `scaleY` with `transform-origin`.
2. **The hovered / pressed element must not be the one that moves.** Put `:hover` on a static
   wrapper and move a child that has `pointer-events: none`, otherwise it flickers at the edges.
3. **Coplanar elements have no stable hit-test order in 3D.** For a grid of hoverable tiles give
   the container `pointer-events: none` and the tiles `pointer-events: auto`.
4. Every ancestor between the perspective and a 3D child needs `transform-style: preserve-3d`.
   `overflow: hidden`, `filter`, `opacity < 1`, `mask`, `clip-path` on such an ancestor FLATTEN it.
5. Never move anything to `translateZ` ≥ the perspective (800px): stop around 200px and fade out.
6. Rounded faces on a closed box show daylight at the corners: use the `solid-core` mixin.
7. `backface-visibility: hidden` on faces that must not show mirrored from behind (text!).
8. Keep it light: at most ~60 elements, no big blurs, no `filter` on animated elements.
9. Loops must be seamless (end state == start state) and use `linear` or symmetrical easing.
10. Keyboard: hover-only demos get `tabindex="0"` and the same effect on `:focus-visible` /
    `:focus-within`. Real `<button>`/`<input>` for controls.
11. Honour reduced motion only by not being aggressive; the site has its own pause switch that
    sets `animation-play-state: paused` on everything in a stage.

## The snippet

`{ how: string[], html, css, js? }` — what visitors copy. It runs on a page whose body is a dark
centred grid (`#0b0d18`, text `#eceefb`), so:

- Plain CSS only, hard-coded colours (violet `#8b6cff`, teal `#2ee6d6`, pink `#ff4d9d`, amber
  `#ffb547`), generic class names (`.scene`, `.cube`...), a `.scene { perspective: 800px; }`
  wrapper. It must reproduce the demo faithfully when pasted into an empty HTML file — expand any
  Sass loop by hand or, better, drive it with `style="--i:3"` + `calc()` so the CSS stays short.
- `how`: 3–5 steps teaching the trick, may contain `<code>` and `<b>`. Explain *why*, not just what.
- Comment the non-obvious lines. `CUBE_FACES` from `snippet-utils.ts` can be interpolated for cubes.
- `js` (JS demos only): plain browser JS, no imports, no TypeScript.

## Checks

`npx tsc --noEmit` and `npx sass src/styles/models/_<id>.scss > /dev/null` must pass.
`npm run build` regenerates every static page and must pass before committing.

## Its video

Nothing to do: the "Video" button makes the clip in the visitor's browser from the model on the
stage (src/record.ts), so a new demo has one the moment it is live, and it can never show an old
version of the model.
