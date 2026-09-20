import type { Group } from './groups';
import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

/** The gamepad's body: one silhouette (centre + two grips) repeated in Z to give it thickness. */
const padLayer = (i: number): string =>
  `<div class="d-gamepad__layer${i === 0 ? ' d-gamepad__layer--top' : ''}" style="--i:${i}">
          <i class="d-gamepad__part d-gamepad__part--body"></i>
          <i class="d-gamepad__part d-gamepad__part--grip d-gamepad__part--left"></i>
          <i class="d-gamepad__part d-gamepad__part--grip d-gamepad__part--right"></i>
        </div>`;

/** One half of the ticket: four paper slabs, a printed front and a plain back. */
const ticketPaper = (face: string): string =>
  `${rep(4, (i) => `<i class="d-ticket__slab" style="--i:${i}"></i>`)}
        <i class="d-ticket__back"></i>
        <div class="d-ticket__front">${face}</div>`;

/** Batch N: new demos. Each one also lists its group below. */
export const demosN: Demo[] = [
  {
    id: 'gamepad',
    title: 'Game controller',
    description:
      'A controller seen from above at an angle, with a body you can see the thickness of. Hover or focus one of the four buttons and its cap presses down into its socket.',
    category: 'css',
    tags: ['hover', 'product', 'device', 'game', 'buttons'],
    technique: ['silhouette stacked in Z as an extrusion', 'one sheen ellipse lights the whole face', 'caps press with translateZ', 'static hit area, cap ignores the pointer'],
    html: `<div class="d-gamepad" role="group" aria-label="Game controller, hover a button to press it">
      <div class="d-gamepad__pad">
        <i class="d-gamepad__shadow"></i>
        ${rep(6, (i) => padLayer(5 - i))}
        <div class="d-gamepad__deck">
          <i class="d-gamepad__sheen"></i>
          <i class="d-gamepad__well" style="top:30px;left:58px"></i>
          <i class="d-gamepad__well" style="top:74px;left:69px"></i>
          <i class="d-gamepad__well" style="top:74px;left:117px"></i>
          <div class="d-gamepad__dpad" style="top:30px;left:58px"></div>
          <div class="d-gamepad__stick" style="top:74px;left:69px"><i></i><i></i><i></i></div>
          <div class="d-gamepad__stick" style="top:74px;left:117px"><i></i><i></i><i></i></div>
          <i class="d-gamepad__mark" style="top:14px;left:93px"></i>
          <button type="button" class="d-gamepad__btn" style="top:9px;left:128px" aria-label="Button Y"><i class="d-gamepad__cap" style="--c:var(--warm)"></i></button>
          <button type="button" class="d-gamepad__btn" style="top:30px;left:149px" aria-label="Button B"><i class="d-gamepad__cap" style="--c:var(--hot)"></i></button>
          <button type="button" class="d-gamepad__btn" style="top:51px;left:128px" aria-label="Button A"><i class="d-gamepad__cap" style="--c:var(--accent-2)"></i></button>
          <button type="button" class="d-gamepad__btn" style="top:30px;left:107px" aria-label="Button X"><i class="d-gamepad__cap" style="--c:var(--accent)"></i></button>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'ticket',
    title: 'Event ticket',
    description:
      'A ticket printed on real card stock. Hover or focus and the stub tears open on the perforation and lifts, with the light running across the fold as it turns.',
    category: 'css',
    tags: ['hover', 'product', 'paper', 'event', 'fold'],
    technique: ['four slabs per half = a visible paper edge', 'stub hinged on the perforation line', 'perforation from a repeating gradient', 'the sheen only changes opacity'],
    html: `<div class="d-ticket" tabindex="0" role="group" aria-label="Event ticket, hover or focus to tear the stub">
      <div class="d-ticket__float">
        <i class="d-ticket__shadow"></i>
        <div class="d-ticket__main">
          ${ticketPaper('<strong>LUMEN<br>LIVE</strong><small>Sat 12 Jul · 20:00</small><b></b>')}
          <i class="d-ticket__perf"></i>
          <i class="d-ticket__glow"></i>
        </div>
        <div class="d-ticket__stub">
          ${ticketPaper('<em>ADMIT ONE</em><i>24</i>')}
          <i class="d-ticket__perf"></i>
          <i class="d-ticket__sheen"></i>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'shoppingbag',
    title: 'Shopping bag',
    description:
      'A paper carrier bag hanging from its handles: five panels make the box, the top edge is folded over, and the whole thing swings from a pivot above it like a bag on a wrist.',
    category: 'css',
    tags: ['loop', 'product', 'paper', 'retail', 'box'],
    technique: ['five panels: front, back, two sides, bottom', 'handles = a rounded box with only its top border', 'folded rim hinged on the bag edge', 'pendulum swing outside the 3D pose'],
    html: `<div class="d-shoppingbag">
      <div class="d-shoppingbag__swing">
        <div class="d-shoppingbag__bag">
          <i class="d-shoppingbag__shadow"></i>
          <i class="d-shoppingbag__panel d-shoppingbag__panel--back"></i>
          <i class="d-shoppingbag__panel d-shoppingbag__panel--side d-shoppingbag__panel--left"></i>
          <i class="d-shoppingbag__panel d-shoppingbag__panel--side d-shoppingbag__panel--right"></i>
          <i class="d-shoppingbag__panel d-shoppingbag__panel--bottom"></i>
          <i class="d-shoppingbag__handle d-shoppingbag__handle--back"></i>
          <div class="d-shoppingbag__panel d-shoppingbag__panel--front">
            <i class="d-shoppingbag__mark"></i><span class="d-shoppingbag__name">LUMEN</span>
          </div>
          <i class="d-shoppingbag__lip d-shoppingbag__lip--back"></i>
          <i class="d-shoppingbag__lip d-shoppingbag__lip--front"></i>
          <i class="d-shoppingbag__handle d-shoppingbag__handle--front"></i>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'lamp',
    title: 'Desk lamp',
    description:
      'A desk lamp whose shade is a real cone of fourteen panels. The bulb warms up and cools again on a slow loop — two sets of lights, warm and cool, cross-fading on opacity.',
    category: 'css',
    tags: ['loop', 'product', 'cone', 'light', 'scene'],
    technique: ['truncated cone from leaning trapezoids', 'discs laid flat with rotateX(90deg)', 'rods = two planes crossing', 'colour change by cross-fading two lights'],
    html: `<div class="d-lamp">
      <div class="d-lamp__world">
        <i class="d-lamp__desk"></i>
        <i class="d-lamp__pool d-lamp__pool--warm"></i>
        <i class="d-lamp__pool d-lamp__pool--cool"></i>
        ${rep(3, (i) => `<i class="d-lamp__base" style="--i:${i}"></i>`)}
        <i class="d-lamp__rod d-lamp__rod--post"></i>
        <i class="d-lamp__rod d-lamp__rod--arm"></i>
        <i class="d-lamp__joint"></i>
        <i class="d-lamp__beam d-lamp__beam--warm"></i>
        <i class="d-lamp__beam d-lamp__beam--cool"></i>
        <div class="d-lamp__shade">
          ${rep(14, (i) => `<i class="d-lamp__strip" style="--i:${i}"></i>`)}
          <i class="d-lamp__cap"></i>
          <i class="d-lamp__mouth d-lamp__mouth--warm"></i>
          <i class="d-lamp__mouth d-lamp__mouth--cool"></i>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'wallet',
    title: 'Card wallet',
    description:
      'Four cards in a leather pocket. Hover or focus and they ride up and fan out, each one a little further than the one behind it; the pocket itself never moves.',
    category: 'css',
    tags: ['hover', 'cards', 'product', 'fan', 'wallet'],
    technique: ['the front slab hides the cards by depth, not by clipping', 'fan from a transform-origin below the wallet', 'staggered transition-delay', 'leather thickness from stacked slabs'],
    html: `<div class="d-wallet" tabindex="0" role="group" aria-label="Card wallet, hover or focus to fan the cards out">
      <div class="d-wallet__float">
        <i class="d-wallet__shadow"></i>
        ${rep(2, (i) => `<i class="d-wallet__back" style="--i:${i}"></i>`)}
        ${['var(--accent-2)', 'var(--warm)', 'var(--hot)', 'var(--accent)']
          .map((c, i) => `<i class="d-wallet__card" style="--i:${i};--c:${c}"><b></b><i></i></i>`)
          .join('')}
        ${rep(3, (i) => `<i class="d-wallet__front" style="--i:${i}"></i>`)}
        <div class="d-wallet__detail"><i class="d-wallet__stitch"></i><i class="d-wallet__mark"></i></div>
      </div>
    </div>`,
  },
];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsN: Partial<Record<Group, string[]>> = {
  product: ['gamepad', 'ticket', 'shoppingbag', 'lamp'],
  cards: ['wallet'],
};
