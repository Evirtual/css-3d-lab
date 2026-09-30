import type { Snippet } from './snippet-utils';

export const snippetsWallet: Record<string, Snippet> = {
  wallet: {
    how: [
      'The wallet is two leather slabs a little apart in depth: the back panel at <code>translateZ(0)</code>, the front pocket at 18 units, and the four cards stacked in the gap between them, each at its own <code>translateZ</code> so they never fight over the same plane. The stitching is a <code>repeating-linear-gradient</code> laid along the four edges of one <code>::after</code> box, which is how a dashed line is drawn without a border.',
      'Each card carries its index in <code>style="--i:N"</code> and one <code>calc()</code> does the rest: at rest it is lifted <code>36 + 12·i</code> units, so the back cards peek highest and every card shows its top strip; hovered, the lift grows and <code>rotateZ((i − 1.5) × 10deg)</code> fans them from a pivot 70 units below the card, so they spread symmetrically about the middle. A wider step swung the front card\'s lower corner out past the side of the wallet.',
      'The hover is taken by the static wrapper, and everything it moves is a child with <code>pointer-events: none</code>: a card that rotated out from under the pointer would drop the hover and snap back. <code>:focus-within</code> gives the keyboard the same fan, and <code>role="img"</code> with an <code>aria-label</code> names it.',
      'The rig holding both slabs and the cards leans back 22° at rest, so the camera looks into the slot, and stands up to 6° as the cards rise. Standing up brings the fan toward the camera instead of away, and the rig also drops a few units, so the fan grows upward and the wallet gives way downward and the whole drawing stays centred in both poses.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the wallet is the same share of a gallery card, the editor and a recording canvas. Only <code>transform</code> is transitioned, each card 60 ms after the one in front, which is what makes the fan open in sequence.',
    ],
    html: `<div class="scene">
  <div class="wallet" tabindex="0" role="img" aria-label="Leather card wallet: four payment cards fan out on hover or focus">
    <div class="rig">
      <div class="back"></div>
      <i class="card" style="--i:3; --c:#ffb547"><b></b><span>3D LAB</span><em>•••• 8104</em></i>
      <i class="card" style="--i:2; --c:#ff4d9d"><b></b><span>3D LAB</span><em>•••• 2277</em></i>
      <i class="card" style="--i:1; --c:#2ee6d6"><b></b><span>3D LAB</span><em>•••• 5930</em></i>
      <i class="card" style="--i:0; --c:#8b6cff"><b></b><span>3D LAB</span><em>•••• 4421</em></i>
      <div class="front"></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the wallet is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.23vmin;
  display: grid;
  place-items: center;
  perspective: calc(900 * var(--u));
}

/* the wrapper takes the hover and never moves: its hit box is the wallet's own footprint */
.wallet {
  position: relative;
  box-sizing: border-box;
  width: calc(230 * var(--u));
  height: calc(150 * var(--u));
  border-radius: calc(14 * var(--u));
  cursor: pointer;
  transform-style: preserve-3d;
}

.wallet:focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 1vmin;
}

/* everything that moves takes no pointer events, so a card fanning out from under the pointer
   cannot drop the hover and snap back */
.wallet * {
  box-sizing: border-box;
  pointer-events: none;
}

/* the rig holds both slabs and the cards. Leaning back at rest shows the slot between the
   panels; it stands up as the cards rise, so the fan comes toward the camera. It also drops a
   little then: the fan grows upward and the wallet gives way downward, so the drawing is centred
   at rest and fanned alike */
.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  /* the cards peek above the slab, so the drawing's middle is above the slab's: the rig sits
     30 units low to put the drawing in the middle */
  transform: translateY(calc(30 * var(--u))) rotateX(22deg);
  transition: transform 0.8s cubic-bezier(0.3, 1.2, 0.5, 1);
}

.wallet:hover .rig,
.wallet:focus-within .rig {
  transform: translateY(calc(47 * var(--u))) rotateX(6deg);
}

/* the two leather slabs: the back panel behind the cards, the front pocket 18 units nearer,
   its top edge lower so the slot between them shows */
.back,
.front {
  position: absolute;
  inset: 0;
  border-radius: calc(14 * var(--u));
  background:
    radial-gradient(ellipse at 30% 20%, rgb(255 255 255 / 0.12), transparent 55%),
    linear-gradient(160deg, #6e4a30, #3b2314);
  box-shadow: inset 0 calc(1 * var(--u)) 0 rgb(255 255 255 / 0.16);
}

.front {
  top: calc(18 * var(--u));
  transform: translateZ(calc(18 * var(--u)));
  box-shadow:
    inset 0 calc(1 * var(--u)) 0 rgb(255 255 255 / 0.16),
    0 calc(10 * var(--u)) calc(18 * var(--u)) calc(-8 * var(--u)) rgb(0 0 0 / 0.55);
}

/* the stitching: a dashed line along each edge, drawn as four repeating gradients on one box
   set in from the slab's edge, so the dashes follow the edge without a border */
.back::after,
.front::after {
  content: '';
  position: absolute;
  inset: calc(7 * var(--u));
  border-radius: calc(9 * var(--u));
  --stitch: #d9b37c 0 calc(5 * var(--u)), transparent calc(5 * var(--u)) calc(9 * var(--u));
  background:
    repeating-linear-gradient(90deg, var(--stitch)) top left / 100% calc(1.2 * var(--u)) no-repeat,
    repeating-linear-gradient(90deg, var(--stitch)) bottom left / 100% calc(1.2 * var(--u)) no-repeat,
    repeating-linear-gradient(180deg, var(--stitch)) top left / calc(1.2 * var(--u)) 100% no-repeat,
    repeating-linear-gradient(180deg, var(--stitch)) top right / calc(1.2 * var(--u)) 100% no-repeat;
  opacity: 0.85;
}

/* --i is the card's place in the stack, 0 in front: the back cards sit deeper and peek higher,
   so every card shows its top strip at rest. The pivot is 70 units below the card, so
   rotateZ swings it along an arc, like a hand of cards */
.card {
  position: absolute;
  top: calc(12 * var(--u));
  left: calc(35 * var(--u));
  width: calc(160 * var(--u));
  height: calc(100 * var(--u));
  border-radius: calc(8 * var(--u));
  background:
    linear-gradient(160deg, rgb(255 255 255 / 0.36), rgb(255 255 255 / 0.12) 65%, rgb(255 255 255 / 0.12)),
    var(--c);
  color: #14172b;
  font: 700 calc(8 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(0.6 * var(--u));
  box-shadow: 0 calc(3 * var(--u)) calc(8 * var(--u)) calc(-3 * var(--u)) rgb(0 0 0 / 0.5);
  transform-origin: 50% 170%;
  backface-visibility: hidden;
  /* the same list of functions in both states, so each one interpolates on its own */
  transform:
    translateY(calc((-36 - var(--i) * 12) * var(--u)))
    translateZ(calc((14 - var(--i) * 3) * var(--u)))
    rotateZ(0deg);
  transition: transform 0.8s cubic-bezier(0.3, 1.2, 0.5, 1) calc(var(--i) * 0.06s);
}

.wallet:hover .card,
.wallet:focus-within .card {
  transform:
    translateY(calc((-72 - var(--i) * 6) * var(--u)))
    translateZ(calc((14 - var(--i) * 3) * var(--u)))
    rotateZ(calc((var(--i) - 1.5) * 10deg));
}

/* the chip, the issuer word and the number, all on the card's own surface */
.card b {
  position: absolute;
  top: calc(26 * var(--u));
  left: calc(14 * var(--u));
  width: calc(22 * var(--u));
  height: calc(16 * var(--u));
  border-radius: calc(3 * var(--u));
  background:
    linear-gradient(90deg, transparent calc(9 * var(--u)), rgb(0 0 0 / 0.25) calc(9 * var(--u)) calc(10 * var(--u)), transparent calc(10 * var(--u))),
    linear-gradient(180deg, transparent calc(7 * var(--u)), rgb(0 0 0 / 0.25) calc(7 * var(--u)) calc(8 * var(--u)), transparent calc(8 * var(--u))),
    linear-gradient(135deg, #f3d98a, #c89b3c);
}

.card span {
  position: absolute;
  top: calc(5 * var(--u));
  left: calc(14 * var(--u));
}

/* the number sits under the chip, in the top half: the bottom half of a card never leaves the
   pocket, so anything written there would never be seen */
.card em {
  position: absolute;
  top: calc(47 * var(--u));
  left: calc(14 * var(--u));
  font-style: normal;
  font-size: calc(9 * var(--u));
}`,
  },
};
