# Adding demos

Every demo is three things with the same `id` (lowercase letters/digits only):

| What | Where | Notes |
| --- | --- | --- |
| The demo | a `Demo` object (`src/demos/types.ts`) in a file under `src/demos/` | markup + optional `init` |
| Its styles | `src/styles/demos/_<id>.scss` | all classes prefixed `d-<id>`, keyframes prefixed `d-<id>-` |
| Its copy-paste snippet | a `Snippet` (`src/demos/snippet-utils.ts`) keyed by the same id | plain HTML + CSS (+ JS), no Sass |

Then it is wired in: `src/demos/index.ts` (demo list; `FEATURED` there decides what the gallery
opens with), `src/demos/snippets.ts` (snippet map), `src/styles/main.scss` (`@use 'demos/<id>'`),
`src/demos/groups.ts` (`MEMBERS`).

Read these first, they are the reference for style and quality: `src/demos/pure.ts`,
`src/demos/interactive2.ts`, `src/demos/snippets.ts` (first 150 lines), `src/styles/_mixins.scss`,
`src/styles/demos/_cube.scss`, `_dice.scss`, `_rollbutton.scss`, `_bars.scss`.

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

`npx tsc --noEmit` and `npx sass src/styles/demos/_<id>.scss > /dev/null` must pass.
`npm run build` regenerates every static page and must pass before committing.

## Its video (the "Download video" button)

After the demo is live-ready: `npm run build`, then `npm run reels -- <id> --scale 2 --crf 18` and
`node scripts/publish-reels.mjs <id>`, and commit `src/reels.json`. Until then the demo simply has
no video button. Re-run both when a demo's look changes, or its video shows the old version.
