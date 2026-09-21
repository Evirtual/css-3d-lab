# The view contract

Every model is written to this. Nothing outside a model adjusts it: there is no per-model size or
offset anywhere in the app, no measuring run and no override file. A model that looks wrong is a
model whose own code is wrong.

This is what makes a model look identical on a gallery card, in the viewer, on its own page, in
the editor, in a recording and in a snapshot. There is nothing to recalculate, so nothing can
shift between those states.

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
| Control zone, when there is one | 10vmin |
| Gap between the model and the control zone | 4vmin |
| Model box, with controls | 56vmin |
| Model box, with no controls | 70vmin |

So a model with a row of buttons under it is automatically a little smaller than one without, and
both take up the same area. The model box is square: everything the model draws fits inside it,
in every state. A wide model is 70vmin across and shorter; it is never larger than the box in
either direction.

The band is centred, which puts the model box slightly above the middle of the canvas when there
is a control zone under it, and exactly in the middle when there is not.

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

Nothing marks them from outside. Their own CSS is the marking.

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

`npm run check-models` opens every model, drives it through those states and reports the ones that
break the contract. It judges models; it does not adjust them.
