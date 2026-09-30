/**
 * Paste-anywhere version of the ribbontext model: plain HTML + CSS, no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

const LINES = ['WAVING', 'RIBBON'];

export const snippetsRibbontext: Record<string, Snippet> = {
  ribbontext: {
    how: [
      'Each letter is a slat of the ribbon: a <code>&lt;span&gt;</code> with <code>display: inline-block</code> (a plain inline box ignores transforms) and a coloured panel of its own, so the letter always has a solid surface behind it whatever the stage.',
      'Every slat runs the <b>same</b> keyframe animation, tilting about the ribbon’s long axis with <code>rotateX</code> and rising and falling a little. <code>animation-delay: calc(var(--i) * -0.375s)</code> puts each slat a step further along the loop: eight steps make one wavelength, so neighbouring slats lean a little more than each other and the row reads as one ribbon twisting in a wind.',
      'The delays are <b>negative</b>, so the ribbon is already mid-wave on its first frame: a paused card shows a finished twist, not a flat row waiting to start.',
      'The twist stops at 60°, so the shortest a slat ever draws is half its height and every letter stays readable at every moment. A slat still has two sides, like a real ribbon: its own text, with <code>backface-visibility: hidden</code>, is the violet front, and a <code>::after</code> with <code>content: attr(data-c)</code>, turned <code>rotateX(180deg)</code> and hidden from behind too, is the pink back. At this twist the back stays out of sight; it is there so that a slat turned further (edit the 60° and see) shows its letter the right way round on either side, never mirrored.',
      'The two lines are one sequence: <code>--i</code> carries on from WAVING into RIBBON, so the same wave rolls through both. Every length is a multiple of one base unit, <code>--u</code>, so the banner is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="ribbon" role="img" aria-label="${LINES.join(' ')}">
${LINES.map(
  (word, l) => `    <span class="line">
${[...word].map((c, i) => `      <span class="slat" style="--i:${l * word.length + i}" data-c="${c}" aria-hidden="true">${c}</span>`).join('\n')}
    </span>`,
).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the banner is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.42vmin;
  perspective: calc(800 * var(--u));
}

/* two lines of six slats: 192 units wide, 134 tall before any slat tilts. Six letters on one line
   would be over three times wider than tall, well under the band's 40vmin floor at any width the
   band allows; a banner with two lines is a layout it would have anyway */
.ribbon {
  display: grid;
  gap: calc(6 * var(--u));
  transform-style: preserve-3d;
}

.ribbon .line {
  display: flex;
  transform-style: preserve-3d;
}

/* a slat is a panel with the letter on it: 32 units wide, 64 tall. Slats butt together with no
   gap, so a line reads as one ribbon rather than a row of cards */
.ribbon .slat {
  position: relative;
  display: inline-block;
  box-sizing: border-box;
  width: calc(32 * var(--u));
  height: calc(64 * var(--u));
  font: 700 calc(32 * var(--u)) / calc(64 * var(--u)) Inter, system-ui, sans-serif;
  text-align: center;
  color: #fff;
  background: #6a45f5;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  animation: twist 3s ease-in-out infinite;
  /* a step of one eighth of the loop per slat: eight slats to a wavelength. Negative, so the
     first frame is already a wave */
  animation-delay: calc(var(--i) * -0.375s);
}

/* the back of the ribbon: the same letter, turned to face away, in the ribbon's other colour, so
   a slat that tilts far enough to show its back still shows a readable letter. White on both
   sides: the contrast check reads a turned-away face against the pixels in front of it, and white
   is 5:1 or more on either panel */
.ribbon .slat::after {
  content: attr(data-c);
  position: absolute;
  inset: 0;
  color: #fff;
  background: #d1206f;
  backface-visibility: hidden;
  transform: rotateX(180deg);
}

/* a twist about the ribbon's long axis, and a small rise a quarter-wave behind it, so the slats
   lean into the crest the way a ribbon does. Symmetrical easing, and the end is the start: no seam */
@keyframes twist {
  0%   { transform: translateY(0)                     rotateX(60deg); }
  25%  { transform: translateY(calc(5 * var(--u)))    rotateX(0deg); }
  50%  { transform: translateY(0)                     rotateX(-60deg); }
  75%  { transform: translateY(calc(-5 * var(--u)))   rotateX(0deg); }
  100% { transform: translateY(0)                     rotateX(60deg); }
}`,
  },
};
