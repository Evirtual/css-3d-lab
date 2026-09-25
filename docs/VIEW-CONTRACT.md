# The view contract

Every model is written to this. Nothing outside a model adjusts it: there is no per-model size or
offset anywhere in the app, no measuring run and no override file. A model that looks wrong is a
model whose own code is wrong.

This is what makes a model look identical on a gallery card, in the viewer, on its own page, in
the editor, in a recording and in a snapshot. There is nothing to recalculate, so nothing can
shift between those states.

## Outcomes, not designs

The contract fixes what a visitor can measure, never how a model is built. What every model is held
to is these outcomes, and each has a check that measures it:

| Outcome | Checked by |
| --- | --- |
| Centred: the drawn stack within 4vmin of the middle, both ways, at rest and in every state | `check-models` |
| Within the size band: 40 to 70vmin tall (or its shape class's own band), at most 92% wide, clear of the edges and the top corners | `check-models` |
| Text readable on both stages: WCAG AA against the pixels behind it, dark and light | `check-contrast` |
| Finished at rest: the paused first moment is a whole pose, and a paused model stops | `check-models` (the resting pose), `check-access` |
| The same on every surface: card, viewer, page, editor, export, the copied file | `check-stages`, `check-exports`, `check-media` |
| No reliance on outside CSS: the model draws the same whatever the page around it sets | `check-boxsizing`, and `check-models`' `--u` in vmin |

How a model gets there is free. Claude, who writes the models, must stay free to invent new ones:
a new idea may need a layout, a unit, a trick or a structure no model has used yet, and nothing here
forbids it so long as the outcomes hold. The band's numbers (the 50vmin model box, the 4vmin gap)
and the control block below are the way most models get there, and the way to start, not rules of
their own: a model that reaches the same outcomes another way is as right as one that copies them.

**Every model declares its shape class.** `wide` and `expands` are never inferred, so every
exception is visible in the model's gallery entry and reviewable; full-canvas is declared by the
model's own CSS, and the checks know it by what it paints (a drawing that covers the canvas):

| Class | How it says so | What it is held to |
| --- | --- | --- |
| normal | nothing | the band: 40 to 70vmin tall on solid ink, at rest and in every state |
| `wide` | the tag `'wide'` | a width floor instead of the height floor: at least 80vmin wide at rest and in every state |
| `expands` | the tag `'expands'` | no floor at rest (the control at its natural size); its open state must reach 40vmin |
| full-canvas | its own CSS: the scene `inset: 0`, sized in percentages | covering the canvas, at least 98% both ways, at every moment |

**When a good design does not fit, add or adjust a class; do not bend the model.** If a model's
own design is right and a rule makes it worse (a flip clock restacked onto two lines to reach a
height floor, a dropdown grown to 40vmin at rest), that is a missing class, not a bad model. Adding
one takes five things, all in the same change:

1. **The mark** in the model's gallery entry: a tag in `tags`, or a field on `Demo`
   (`src/models/types.ts`), read by one function (`src/models/interaction.ts`, as `wide()` and
   `expands()` are). Never inferred.
2. **The rule**, with its reason: what the class is held to instead, in this file, in a table like
   the ones above, and why the normal rule is wrong for it.
3. **The check**: the checker reads the mark, holds the model to the class's rule, and says the
   class on the model's line, pass or fail, so every use shows in every run. Where the check can
   tell, a mark on a model that does not need it fails, so the mark cannot outlive its design
   (check-boxsizing does this for `boxSizing`).
4. **The broken copy that proves it**: a copy of a model that breaks the class's rule, in
   `.media-tmp/<check>/`, which the check fails, next to the real model it passes (`--try` where the
   check has it).
5. **The docs**: this file, `docs/ADDING-MODELS.md` if it changes how a model is written, and the
   check's `ruleVersion` in `scripts/checks-registry.mjs` bumped, since its rule's meaning changed.

**What no check can judge is left to a person.** Whether the 3D is correct (faces meet, nothing
shows through that should not, the light comes from one side), and whether the motion reads as the
thing it is meant to be (a book that opens like a book, a coin that spins like a coin), are judged
in a close-up visual review, recorded in `docs/reviews/` or a `Reviewed-by:` commit. The checks
prove the outcomes above; they do not prove a model is good.

## The canvas is the body

A model runs in its own frame, and that frame IS the canvas. Inside the snippet it behaves exactly
like `body` on a page written properly:

- it is the container, so scrolling, dragging and pointer tracking belong to it;
- it is the whole width and height available, whatever shape the stage is;
- `1vmin` is one hundredth of its short side, and that is the unit everything is written in.

Because everything is in `vmin`, a model keeps the same proportions on a 340 × 280 card, on a
full screen, and in a 9:16 or 16:9 recording canvas. The canvas is a scale and nothing more.

## The band

One band, the same height in every model, centred in the canvas.

| | Height |
| --- | --- |
| The band | 70vmin |
| Control zone, when there is one | what it holds, and no more: a caption line (4.5vmin text, 5.4vmin with its line height), an 8vmin row, 2vmin between them when it has both. At most 16vmin |
| Gap between the model and the control zone | 4vmin |
| Model box, with controls | 50vmin |
| Model box, with no controls | 70vmin |

So a model with a row of buttons under it is automatically a little smaller than one without, and
both take up the same area.

**The zone is sized by its content, and the drawn stack is centred.** The zone is never a fixed
reserve: a zone that holds only a caption is one line tall, one that holds a row is the row. The
model box, the gap and the zone stand in one stack, and that whole stack is centred in the canvas.
For a model with controls the stack is at most 50 + 4 + 16 = 70vmin, the band. A fixed 16vmin
reserve under a caption-only zone left about 10vmin of empty space at the bottom of the stack, so
the drawn model and its caption sat 4vmin above the middle of the card (the heatmap), higher than every
model around it.

**Height is what is held; width is free.** The box is not a square and a model does not have to be
one. What everything the model draws must satisfy, in every state, is:

| | |
| --- | --- |
| At most, tall | the model box above: 70vmin, or 50vmin with controls |
| At least, tall | 40vmin, so nothing reads as a speck in the middle |
| At most, wide | 92% of the canvas width, so nothing touches the sides |

A wide, short model is wide. A tall model is tall. They are the same height as each other, which
is what makes them read as equally prominent, and they are all centred.

The stack is centred, which puts the model box above the middle of the canvas when there is a
control zone under it, by half of the gap and the zone, and exactly in the middle when there is not.
What is drawn, the model and its zone together, is centred either way.

## Controls

A control is anything you operate, or anything that reports state: buttons, arrows, dots, sliders,
swatches, and captions like "Click roll", "01 · Dawn", "174 commits in 4 weeks".

A model whose subject IS a control — the 3D button, the switch, the radial menu, the rating stars,
the keycaps — has no control zone. The control is the model, it fills the 70vmin box, and it is
centred like any other model.

Controls live in the snippet's own HTML and CSS, so they stay editable and copyable, but their
size and placement are the same numbers everywhere:

| | |
| --- | --- |
| Control height | 8vmin, pill radius, 3vmin side padding |
| Control text | 4vmin |
| Gap between controls | 2vmin |
| Caption | 4.5vmin, muted, on its own line 2vmin above the row |

The zone is centred horizontally. It is flat: no perspective, no 3D transform, no shadow that
belongs to the scene, so it reads as chrome rather than as part of the model.

## Full-canvas models

A model meant to cover the canvas says so in its own code: the scene is `inset: 0` and its
contents are sized in percentages. Starfield, snow, the synthwave grid, the room and the tunnel
are these. They ignore the band, reach the edges, and the stage clips whatever hangs over.

Nothing marks them from outside. Their own CSS is the marking, and the check recognises one by
what it paints: a drawing that covers the canvas.

## Interaction

The canvas is the container, so a scroll-driven model scrolls the canvas, and a drag-driven one
tracks the pointer across it. The native scrollbar is hidden: the badge in the corner of the stage
already says "Scroll", and a bar against the canvas edge reads as a broken page.

Hit areas may be larger than what is drawn, but they stay invisible and stay inside the canvas.

## What must hold, in every state

At rest, through the whole animation, while hovered, while open, while dragged and while
scrolled:

- everything drawn is inside the model box, or inside the canvas for a full-canvas model;
- the model box is where the band says it is, and has not moved or resized;
- nothing but a full-canvas model touches the canvas edge.

These checks judge it, and the ones after them what else the outcomes need; none adjusts anything.

`npm run check-models` (`scripts/check-models.mjs`) opens every model on a card (a 360 × 300
page, each model in a fresh browser context), drives it through those states as its tags say —
12 moments of its loop, plus the moments between them where a quick pass over up to 480 moments
finds its parts reaching furthest, and the same with `:hover` forced, up to six of its controls
clicked, a drag, a pointer sweep to the corners and sides of the canvas, a scroll down and back —
and measures the box around the pixels it
paints, in vmin, with two thresholds for two jobs:

- **Position and size are judged on solid ink, alpha 128/255 and over.** The eye reads where a
  model is and how big it is from its solid body. A soft shadow, a glow, steam or a translucent
  floor hanging off one side would otherwise pull the measured middle away from the body a person
  sees, so the model looks off centre while the check passes.
- **Edges are judged on all ink, alpha over 24/255.** A leak is a leak however faint: a glow that
  runs off the canvas or under the site's badge still fails.

What it holds, exactly:

| | Ink | |
| --- | --- | --- |
| Tallest | solid | 70vmin for everything drawn, **the control zone included**. The 50vmin model box inside the band is not measured on its own: the stack in rule 5 is what holds it |
| Shortest | solid | 40vmin |
| Widest | solid | 92% of the canvas width |
| Centred | solid | within 4vmin, sideways and vertically, for every model: a control zone gets no more (see below) |
| Canvas edge | all | nothing drawn reaches the canvas edge, unless the model is full-canvas |
| Top corners | all | nothing drawn within 14vmin of either top corner |
| Full canvas | all | a drawing that covers at least 95% of the canvas both ways is judged as full-canvas, and must cover 98% |
| Base unit | (the CSS) | the snippet sets `--u` in `vmin` (ground rule 1); a model without it fails whatever it draws |

**One centring limit for everyone.** The vertical limit used to be 11vmin for a model with a
control zone, because the zone was a fixed reserve and the band's centre was not the drawing's.
With the zone sized by its content and the drawn stack centred, a model with controls has no
reason to sit further off than any other, and the allowance only let models with a caption sit
visibly high and pass (the heatmap at rest 4vmin high, the toggle 4). The limit is measured on the
drawn stack, the model and its zone together, in solid ink, like every other model.

Every row above is measured on the union of every state. **The resting pose is judged on its own
as well.** A union can be big and centred while the model at rest is small or off to one side (a
closed book beside the open one, a card folded shut on a hinge at the middle), and the resting
pose is exactly what a paused card and every card parked offscreen shows (ground rule 9). So the
first moment of the loop, with no pointer and nothing clicked, must by itself be:

| At rest | Ink | |
| --- | --- | --- |
| Shortest | solid | 40vmin |
| Centred | solid | within 4vmin, sideways and vertically, as for every model |

A model whose open and closed states sit in different places balances them: the resting pose is
centred and the open pose still inside the band. One that cannot do both changes its motion (hinge
from the middle, fold symmetrically), not the rule.

**A control that opens rests small.** One exception, and a narrow one. A model that IS a small
control which opens into something (a menu button, a fold-down menu, a disclosure) rests at the
control's natural size: at rest it is only the control, as it would be on a real page, and it
opens on its interaction. Growing the control to 40vmin, or leaving what it opens half out at
rest, makes it a thing no page has ("normally there would not be a dropdown like that in the real
world"). Such a model says so with the tag `'expands'` in its gallery entry
(`src/models/interaction.ts`, `expands()`); nothing is inferred, so every use is visible and
reviewable. For a marked model:

| Marked `'expands'` | Ink | |
| --- | --- | --- |
| At rest, shortest | solid | no floor: the control at its natural size |
| At rest, centred | solid | as for any model: within 4vmin, sideways and vertically |
| Open, shortest | solid | 40vmin: the union of every look after its interaction (its clicks, or the pointer sweep, each with `:hover` forced) |
| Open, tallest and centred | solid | 70vmin, and centred within the usual limits |

Every union check above still holds as for any model. `check-models` says "rests small by
design (expands)" on the model's line with its rest and open sizes, and fails a marked model that
nothing opens. Its share image is shot open (`scripts/og-shot.mjs`), since a lone button is a poor
preview, and `check-media` judges that open pose. A box, a book, a card or a greeting card is
not a control: it opens, but it is the object, not a button for one, and it keeps the floor at
rest. The models that use it: `radial` (the radial action menu: only the + button at rest) and
`dropdown` (the fold-down menu: only its Menu bar at rest).

**A wide model is sized by its width.** The second exception. Some models are, by their own
design, a long and low shape: a flip clock's three pairs stand on one line. At the widest the
band allows, such a shape is well under 40vmin tall, and restacking it onto two lines only to
reach the floor gives it a layout it would not otherwise have. So a model marked with the tag
`'wide'` in its gallery entry (`src/models/interaction.ts`, `wide()`; never inferred) is sized
by its width instead of its height:

| Marked `'wide'` | Ink | |
| --- | --- | --- |
| Shortest | solid | no floor, at rest or in any state |
| Narrowest | solid | 80vmin, at rest and in the union of every state |
| Widest | solid | 92, as for any model |
| Centred | solid | as for any model, at rest and in every state |

80vmin is the narrowest the gallery's wide models already are (the keycaps 80, the rating and the
chart panel 81, the wide text models 86 to 91): under it a model reads as small, not as wide by
design. `check-models` says "sized by width (wide)" on its line with its sizes, and
`check-media` holds its share image to the same width floor. A model that is merely short is not
wide: only one whose design is a line gets the mark. The model that uses it: `clock` (the flip
clock, `HH : MM : SS` on one line).

What the frame clips, the picture cannot show: a model drawn past the canvas edge is measured up
to the edge, so its numbers are a floor.

`node scripts/check-stages.mjs` measures the same model on every surface — card, viewer, page,
the editor's live, reset and saved states, a large page, full screen, the export dialog's
canvas at every shape, and the file a visitor takes away ("Copy as one HTML file", "Open in new
tab": the standalone document on its own at 1280 × 800 and 400 × 400, which must also run with no
page error) — and reports any whose width, height or offset in vmin disagree.
A full-canvas model has no fixed size to compare, so it is judged on filling the canvas at every
moment, and on showing the same scene: at 12 instants of its animation, what is in view is
compared thing by thing on one mapping for the whole scene. Each axis is measured in shares of the
canvas, or in vmin from the scene's vanishing point. A scene that mixes the two (flakes falling in
vmin from the top past trees placed in percentages) is a different scene on another shape.

**No reliance on outside CSS.** `node scripts/check-boxsizing.mjs` opens every model's standalone
file (what "Copy as one HTML file" hands over) at 400 × 400, paused at one moment (a seeded
`Math.random`, a paused clock, every animation at the start of its timeline), at rest and with
`:hover` forced, as it is and with `*, *::before, *::after { box-sizing: border-box }` ahead of its
CSS, as the site's stylesheet once had it. A pixel differs when a channel is more than 24/255
apart; a model fails when over 0.25% of the canvas differs beyond its own noise (two openings of the
same file, since Chromium rasters one paused 3D scene one of two ways). The fix is in the model: it
says which box its numbers mean, `box-sizing: border-box` where they are outside sizes (the card of
the tilt, the photos of the polaroid), `content-box` where they are the inside (a ring whose width
is its hole, a floor with a hairline edge round it: the gyro, the rings, the tunnel, the door and
the fold among them). A model that cannot say so in its CSS may carry `boxSizing: 'content-box by
design: <why>'` in its gallery entry: the check passes it, prints the reason and the difference on
its line, and fails that mark on a model that draws the same either way.

**Text readable on both stages.** `node scripts/check-contrast.mjs` runs every model the way the
site's frame does, on a card's 360 × 300 canvas, on the dark stage (`#07080f`, ink `#eceefb`) and
on the light one (`#f3f4fc`, ink `#14172b`), at rest, with `:hover` forced, with the pointer on the
middle and after each of up to six controls is clicked. Every text it shows (text nodes, `::before`
and `::after` content, SVG text) is shot with and without its glyph fill: the pixels behind its
letters are its background, the model's own panel, glow or 3D face included, and its colour is its
CSS colour laid over them at its opacity (or the drawn pixels, for gradient or filtered text). It
must reach WCAG AA, 4.5:1, or 3:1 for text at least 24px, or bold and 18.66px, at that canvas size.
Text in a disabled control is exempt, and listed as exempt on the model's line. A word drawn as a
stack of copies (the layers of an extruded headline) is read from its front copy: a back layer
lying on a readable copy of the same text is counted and named on the line, not failed. A model's text that
is a fixed colour on the bare stage cannot reach 4.5:1 on both stages: it inherits the stage's ink
(softened with opacity, as the caption is), or sits on a surface of the model's own.

**One base unit, in vmin, is part of the contract.** `check-models` also fails a model whose
snippet CSS does not set `--u` to a value in `vmin` (ground rule 1), and says which unit it has
when it is set in another. It used to be the ledger's "Not converted" stage; the ledger now has
three stages, To check, Awaiting review and Approved, and a model without `--u` in vmin is held by
the contract check like any other failure.

**A stricter rule makes old results stale.** Every check in `scripts/checks-registry.mjs` has a
`ruleVersion` and the history behind it. Bump it whenever a rule's meaning changes (a limit, a new
thing judged, a state or a surface added or dropped); a change that only reports differently is not
a new version. `npm run capture` records the version with every result, and the ledger marks a
result judged under another version stale, "rule changed (vN → vM)", so a pass under the old rule
never counts under the new one. `check-models` is at v3: v2 is this file's 4vmin centring for every
model (69cae52), v3 adds `--u` in vmin.

## The rest of the rules, decided up front

These are the things that would otherwise be found one model at a time.

- **The corners belong to the site.** The stage lays its own badge over the top left and its
  preview menu over the top right. A model keeps the top corners clear: nothing it draws, in any
  state, comes within 14vmin of the top two corners. The band leaves room for this already; a wide
  model has to check it.
- **A paused model must look finished.** The site can pause every animation, and a model parked
  offscreen is paused too. The pose a model holds at the start of its animation is the pose it is
  judged on, so it cannot be mid-blur, mid-fade or halfway through a turn.
- **A paused model stops its script too.** The site tells a frame it is paused with one signal:
  `data-paused` on the frame's own `<html>` (`src/preview.ts` sets it while the Pause switch is
  on, which it is from the start when the visitor's system asks for reduced motion, while the stage
  is frozen, and while a card is parked offscreen, and takes it off again). CSS animations stop by
  themselves: the frame pauses every one while the attribute is there. A script that moves the model
  on its own, on a timer or a `requestAnimationFrame` loop, reads the same attribute on every step
  (`document.documentElement.hasAttribute('data-paused')`), does nothing while it is set and carries
  on when it goes. A copied snippet has no site round it, so such a script also honours
  `matchMedia('(prefers-reduced-motion: reduce)')`: it stops, or, where the motion is the point (a
  clock), it changes without animating. What the visitor does (a click, a drag) still answers while
  paused. `npm run check-access` proves it for every model: paused, with reduced motion emulated,
  the picture must not change over 4 seconds, and un-paused, a model that moved must move again.
- **Every control has a name, and the keyboard reaches it.** A button with only an icon gets an
  `aria-label`; a hover-only part gets `tabindex="0"`, a name (`role="img"` with an `aria-label`
  when it is a picture) and the same effect on `:focus-visible`; a hidden input is hidden visually
  (opacity, clip), never with `display: none`, so Tab still reaches it through its label. Focus
  must show. `npm run check-access` checks all of it.
- **Controls are usable by a finger.** 8vmin is about 22px on a card and about 30px in the viewer.
  A control that is smaller than 24px anywhere a visitor can tap it is too small, so the height is
  a floor, not a target.
- **A caption may not move anything.** The control zone is the height of what it holds, so a
  caption whose text changes as the model is used keeps its one line: it is never emptied (it says
  an idle line, such as the total, when nothing is pointed at), it does not wrap
  (`white-space: nowrap` when its text changes), and it fades with `opacity`, never
  `display: none`. Then it never reflows the model above it.
- **A full-canvas model may still have controls.** The zone sits in the same place, over the
  model, at the same size: where the centred stack would put it, its top at
  `calc(50% + 27vmin - Z / 2)` for a zone Z tall (a caption alone: `calc(50% + 24.3vmin)`). Being full-canvas changes what is behind the controls, not where they
  are.
- **Printing follows the same band.** The dialog's Print makes a snapshot through the render
  service at the sheet's own shape and prints that picture edge to edge (`src/video.ts`,
  `src/print.ts`), so a printed model is laid out like any other snapshot. The older sheet that
  measures element boxes and fits the model itself (`printDoc` in `src/models/snippet-utils.ts`)
  is still in the code, used only when `printModel` is given no picture; no current caller does
  that.
- **The export slider is the visitor's, not the model's.** In the Video / Image dialog the model
  fills 70% by default, which is the canvas exactly as the contract lays it out. Another setting
  writes `--zoom` (the setting ÷ 0.7) on the stage and the frame's scene is zoomed by it, the same
  for every model (`src/video.ts`, `src/preview.ts`). It is now the **only** zoom on the site: the
  page had a View zoom of its own until 2026-09-25, and it was taken out because a percentage a
  visitor set while editing changed what they saw without changing what they would get — which is
  the single thing this contract exists to prevent. A setting that moves the model now sits beside
  the file it is about to make, where its effect is visible in the same dialog.
- **A model in the band paints no backdrop.** The stage's colour, its dots and its theme are the
  site's. Its text colour is inherited, so it reads on a light stage and a dark one, and a
  see-through export has nothing of the model's own behind it.
- **A full-canvas scene paints its own background, because the background is the scene.** The
  starfield's night sky, the room's walls, the snow's winter dusk and the text crawl's deep space
  are the model, not a backdrop laid under one. Such a model covers the whole canvas, so the
  stage's colour and dots never show, and a see-through export of it is the scene itself. It still
  takes nothing from the site: no dots, no theme colours, and any text it draws on its own
  background sets its own colour rather than inheriting one meant for the stage.

## What goes with this

Every model used to carry a second implementation from before the snippet became the only thing
the site renders: its gallery markup (`html`, `fill`, and `init` for CSS + JS models, on the
`Demo` object) and its per-model Sass (135 files, 16,728 lines in `src/styles/models/`, imported
by `src/styles/main.scss` and shown in a "Sass source" tab). Nothing drew them any more. They were
deleted on 2026-09-22, so there is one version of each model and no way for two to drift: a
`Demo` is metadata only, `src/styles/` is the site's own chrome, and the code tabs show the
snippet's HTML, CSS and JS.

## Ground rules for writing a model

Be as inventive as you like with what the model IS. These rules are only about how it sits in the
canvas, and they are what keep 135 unrelated ideas looking like one library.

**1. One base unit, and every length is a multiple of it.** Put it on the model's root and tie it
to the canvas. Never write a bare pixel length anywhere else.

```css
.scene {
  --u: 0.3vmin;              /* the whole model scales with this one number */
  perspective: calc(800 * var(--u));
}
.thing {
  width: calc(180 * var(--u));
  height: calc(100 * var(--u));
  border-radius: calc(8 * var(--u));
  font: 700 calc(12 * var(--u)) / 1.2 system-ui, sans-serif;
}
```

Design in whatever numbers you like — 180 and 100 above are just the proportions you drew — then
set `--u` so the model lands in the band. Nothing else has to change afterwards.

**2. Land in the band.** 70vmin tall with no controls, 50vmin with them, never under 40vmin, never
over 92% of the canvas wide, centred within 4vmin both ways, with or without a control zone (the
zone is sized by what it holds and the whole drawn stack is centred, so there is no allowance). Check, do not guess:
`npm run check-models <id>`.

**3. Hold the whole model still.** The band is for everything the model draws at any moment: the
far end of its animation, its hover state, its open state, the widest a drag or a scroll takes it.
A model that only fits at rest is not finished.

**4. Keep the top corners clear.** The site's badge sits over the top left and its preview menu
over the top right. Stay 14vmin from both.

**5. Controls are the same object in every model.** Copy this block unchanged into any model that
has a caption or a row of controls, and change only what is inside the row. It is written in plain
vmin, not in the model's own unit, because it is the same size in every model whatever the model
is sized to:

```css
/* The model box and the zone stand in one stack, so the zone is the same distance below the
   model in every model and the pair is centred as the band says. The zone is as tall as what it
   holds: no fixed height, so a caption alone is one line and the stack stays centred. Do NOT position the zone from
   the canvas middle: a model's drawing can overflow its layout box, and the row lands on it. */
.band { display: grid; justify-items: center; gap: 4vmin; }
.view { height: 50vmin; display: grid; place-items: center; }   /* the model box */

.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}
.controls .caption { font: 500 4.5vmin/1.2 system-ui, sans-serif; opacity: 0.7; }
.controls .row { display: flex; gap: 2vmin; }
.controls button,
.controls label {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  box-sizing: border-box; /* a label is content-box, so min-width would add to its padding */
  border: 0;
  border-radius: 999px;
  /* see-through, so the pill sits on the stage, and its word is the stage's own ink at full
     strength: no colour of the model's, which would vanish on one of the two stages */
  background: rgb(140 150 220 / 0.2);
  color: inherit;
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.35s;
}

.controls button:hover,
.controls label:hover {
  background-color: rgb(140 150 220 / 0.34);
}

.controls :focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}

/* the selected pill: the brand gradient, deep enough that white text on it passes */
.controls [aria-pressed='true'] {
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  color: #fff;
}

/* a slider, inside its pill: track and thumb in vmin, never the browser's own px, so it is the
   same share of every canvas. The empty track is the unselected tint and the filled part the
   selected gradient; the thumb is the stage's ink in a gradient ring, because the gradient alone
   is under 3:1 on the pill's tint on the dark stage. Chrome has no filled part of its own: the
   model's JS writes --pos (0 to 1) on the input as it moves, and the fill ends under the thumb */
.controls input[type='range'] {
  --thumb: 4.5vmin;
  appearance: none;
  width: 28vmin;
  height: var(--thumb);
  margin: 0; /* the browser's is 2px */
  background: none;
  color: inherit; /* the thumb is the stage's ink: a form control does not inherit it by itself */
  cursor: pointer;
}
.controls input[type='range']::-webkit-slider-runnable-track {
  height: 1.2vmin;
  border-radius: 999px;
  background:
    linear-gradient(90deg, #6a45f5, #d1206f) 0 0 / calc(var(--thumb) / 2 + var(--pos, 0) * (100% - var(--thumb))) 100% no-repeat,
    rgb(140 150 220 / 0.2);
}
.controls input[type='range']::-webkit-slider-thumb {
  appearance: none;
  box-sizing: border-box;
  width: var(--thumb);
  height: var(--thumb);
  margin-top: calc((1.2vmin - var(--thumb)) / 2);
  border: 0.8vmin solid transparent;
  border-radius: 50%;
  background:
    linear-gradient(currentColor, currentColor) padding-box,
    linear-gradient(135deg, #6a45f5, #d1206f) border-box;
}
.controls input[type='range']::-moz-range-track {
  height: 1.2vmin;
  border-radius: 999px;
  background: rgb(140 150 220 / 0.2);
}
.controls input[type='range']::-moz-range-progress {
  height: 1.2vmin;
  border-radius: 999px;
  background: linear-gradient(90deg, #6a45f5, #d1206f);
}
.controls input[type='range']::-moz-range-thumb {
  box-sizing: border-box;
  width: var(--thumb);
  height: var(--thumb);
  border: 0.8vmin solid transparent;
  border-radius: 50%;
  background:
    linear-gradient(currentColor, currentColor) padding-box,
    linear-gradient(135deg, #6a45f5, #d1206f) border-box;
}
/* focused from the keyboard, the ring goes round the whole pill, out on the stage like every
   other control's: round the thumb it would sit on the tint, where #6a45f5 is under 3:1 */
.controls input[type='range']:focus-visible {
  outline: 0;
}
.controls label:has(input[type='range']:focus-visible) {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}
```

A slider's JS writes one number as it moves, for Chrome's filled part (Firefox draws its own with
`::-moz-range-progress`):

```js
const pos = (input) => input.style.setProperty('--pos', (input.value - input.min) / (input.max - input.min));
```

A model with several sliders in a narrow row may set a shorter `width` after the block; the track
and thumb stay as they are.

The colours are part of the block, and they hold on both stages (dark `#07080f`, light `#f3f4fc`,
and the cards' 70% mixes of them), at the 4.5:1 that 4vmin text needs:

| State | Text on it | Dark stage | Light stage |
| --- | --- | --- | --- |
| Unselected | the stage's ink on the 20% tint | 12.6:1 | 13.7:1 |
| Hover | the stage's ink on the 34% tint | 9.4:1 | 12.1:1 |
| Focus ring (not text: 3:1) | `#6a45f5` against the stage | 3.5:1 | 5.1:1 |
| Selected | `#fff` on `#6a45f5` → `#d1206f` | 5.1:1 at the worst end | the same: the pill is opaque |
| Caption | the stage's ink at 0.7 opacity | 8.5:1 | 6.3:1 |
| Slider thumb (not text: 3:1) | the stage's ink on the pill's tint, hover the worst | 9.4:1 | 12.1:1 |
| Slider focus ring (3:1) | `#6a45f5` round the pill, on the stage | 3.5:1 | 5.1:1 |
| Slider fill | the gradient on the pill's tint | 1.8:1 hovered, 2.5:1 at rest | 3.5:1 |

The thumb marks a slider's value; the fill and the empty track do not, so they are not held to
3:1. The fill is under it on the dark stage and must stay a second mark, never the only one, and
the empty track (the tint on the pill's tint, 1.1 to 1.4:1) only hints at the travel. That is also
why the thumb is the ink in a gradient ring rather than the gradient itself: the gradient on the
tint would be the fill's 2.5:1.

Measured in the running models, the worst of the solid stage and a card's (`#0a0c16`, `#f6f7fd`).
The slider rows are worked out from the block's colours over those same four stages, because the
thumb and track are pseudo-elements the page cannot read a style from.

The ink is inherited, never mixed: `color-mix(in srgb, currentColor …)` for a softened word looked
right at load, but Chrome kept the old theme's value on a live theme switch. A model whose own
controls mean something (a swatch's colour, a series' colour) may restyle the selected pill's
background after the block, so long as its text still reaches 4.5:1 on both stages.

The row is flat: no perspective, no 3D transform, no shadow belonging to the scene. It is chrome,
and it should read as chrome.

**6. A model that is itself a control has no row.** A switch, a 3D button, a rating, a radial
menu: the control IS the model, it fills the 70vmin box, and it is centred like anything else.

**7. A model that fills the canvas says so itself.** `inset: 0` on the scene and percentages
inside it. Do not mark it from outside, and do not give it a band.

**8. Nothing of the site belongs to the model.** No dots, no theme colours. A model in the band
paints no backdrop and inherits the text colour: the stage paints behind it. A full-canvas scene
is the exception, and only for its background: the sky, the room or the space it happens in IS
the model, so it paints it, edge to edge, and sets the colour of any text it draws on it.

**9. Start on a good pose.** The site can pause every animation, so the first frame of the loop is
what a paused card shows. It cannot be mid-turn or mid-fade.

**10. Scroll and drag belong to the canvas.** It is the model's body. Hide the native scrollbar.
