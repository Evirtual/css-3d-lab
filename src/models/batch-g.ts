import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

/** One headphone side: slider (two crossed planes), yoke and a cup of 12 strips + 2 discs. */
const headphoneSide = (s: 'l' | 'r'): string =>
  `<i class="d-headphones__slider d-headphones__slider--${s}"></i><i class="d-headphones__slider d-headphones__slider--${s}f"></i>
        <i class="d-headphones__yoke d-headphones__yoke--${s}"></i>
        <div class="d-headphones__cup d-headphones__cup--${s}">${rep(12, (i) => `<i style="--i:${i}"></i>`)}<b class="d-headphones__outer"><em></em></b><b class="d-headphones__cushion"></b></div>`;

/** More product showcases: premium objects with real thickness, the kind a landing page uses. */
export const demosG: Demo[] = [
  {
    id: 'headphones',
    title: 'Headphones',
    description:
      'Over-ear headphones turning on a stand: the band is a ring of tangent strips, each cup a short cylinder laid on its side. Hover or focus and they turn to face you and light up.',
    category: 'css',
    tags: ['hover', 'loop', 'product', 'device', 'music', 'cylinder'],
    technique: ['arc = strips at rotateZ(a) translateY(−r) rotateX(90deg)', 'cylinder built upright, laid down with rotateZ(90deg)', 'shading from sin() / cos() of the strip angle', '@property blend: hover eases --k from 1 to 0'],
    html: `<div class="d-headphones" tabindex="0" role="group" aria-label="Headphones, hover or focus to turn them toward you">
      <div class="d-headphones__rig">
        <i class="d-headphones__shadow"></i>
        <div class="d-headphones__band"><b class="d-headphones__side"></b><b class="d-headphones__side"></b>${rep(12, (i) => `<i style="--i:${i}"></i>`)}</div>
        ${headphoneSide('l')}
        ${headphoneSide('r')}
      </div>
    </div>`,
  },
  {
    id: 'perfume',
    title: 'Perfume bottle',
    description:
      'A faceted glass bottle you can see into: an octagonal prism of glass around a smaller prism of liquid, a fluted gold cap and a label. A glint sweeps across each time it faces you.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'product', 'glass', 'luxury'],
    technique: ['octagonal prism: 8 faces at 45° steps', 'see-through faces drawn from both sides', 'a prism inside a prism for the liquid', 'glint = translated gradient in a clipped face'],
    html: `<div class="d-perfume">
      <i class="d-perfume__shadow"></i>
      <div class="d-perfume__liquid">${rep(8, () => '<i></i>')}<b></b></div>
      <b class="d-perfume__floor"></b>
      <div class="d-perfume__glass"><i><em class="d-perfume__glint"></em></i>${rep(7, () => '<i></i>')}</div>
      <b class="d-perfume__top"></b>
      <span class="d-perfume__label"><b>LUMEN</b><small>EAU DE PARFUM</small></span>
      <div class="d-perfume__neck"><i></i><i></i><i></i><i></i></div>
      <div class="d-perfume__cap"><i><em class="d-perfume__glint"></em></i><i></i><i></i><i></i><i></i></div>
    </div>`,
  },
  {
    id: 'businesscard',
    title: 'Business card',
    description:
      'A thick business card with painted edges. Hover or focus and it flips to show the back; the logo and the text are lifted off the paper with translateZ, so they shift against it as it turns.',
    category: 'css',
    tags: ['hover', 'product', 'card', 'flip', 'branding'],
    technique: ['two faces at ±depth/2, back turned 180deg', 'rounded slabs + walls for the edge', 'embossing = children lifted with translateZ', 'flip and idle sway on separate elements'],
    html: `<div class="d-businesscard" tabindex="0" role="group" aria-label="Business card, hover or focus to flip it">
      <div class="d-businesscard__float">
        <i class="d-businesscard__shadow"></i>
        <div class="d-businesscard__card">
          ${rep(4, (i) => `<i class="d-businesscard__slab" style="--i:${i}"></i>`)}
          <i class="d-businesscard__wall d-businesscard__wall--t"></i><i class="d-businesscard__wall d-businesscard__wall--b"></i>
          <i class="d-businesscard__wall d-businesscard__wall--l"></i><i class="d-businesscard__wall d-businesscard__wall--r"></i>
          <div class="d-businesscard__front">
            <b class="d-businesscard__logo"><i></i><i></i><i></i></b>
            <strong>PRISM</strong><small>DESIGN STUDIO</small>
          </div>
          <div class="d-businesscard__back">
            <b></b>
            <strong>Alex Morgan</strong><small>Creative director</small>
            <span>alex@prism.studio</span><span>+1 555 0142</span><span>prism.studio</span>
          </div>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'camera',
    title: 'Retro camera',
    description:
      'A rangefinder camera rocking on the table: a box body, a lens barrel of sixteen strips around the Z axis and a glass disc whose reflection slides the other way as it turns.',
    category: 'css',
    tags: ['loop', 'product', 'device', 'cylinder', 'photo'],
    technique: ['barrel strips: rotateZ(a) translateY(−r) rotateX(90deg)', 'shading from cos() of the strip angle', 'reflection counter-moves in a clipped disc', 'stacked flat discs for knobs'],
    html: `<div class="d-camera">
      <i class="d-camera__shadow"></i>
      <div class="d-camera__face d-camera__face--front"><i class="d-camera__window"></i><i class="d-camera__window"></i><span class="d-camera__name">OBSCURA</span></div>
      <i class="d-camera__face d-camera__face--back"></i>
      <i class="d-camera__face d-camera__face--left"></i>
      <i class="d-camera__face d-camera__face--right"></i>
      <i class="d-camera__face d-camera__face--top"></i>
      <i class="d-camera__face d-camera__face--bottom"></i>
      <div class="d-camera__lens">
        <i class="d-camera__mount"></i>
        ${rep(16, (i) => `<i class="d-camera__strip" style="--i:${i}"></i>`)}
        <i class="d-camera__glass"><em></em></i>
        <i class="d-camera__ring"></i>
      </div>
      <div class="d-camera__flash"><i></i><i></i><i></i><i></i><i></i></div>
      <i class="d-camera__dial" style="--h:1"></i><i class="d-camera__dial d-camera__dial--top" style="--h:4"></i>
      ${[1, 2.5, 4].map((h) => `<i class="d-camera__knob" style="--h:${h}"></i>`).join('')}<i class="d-camera__knob d-camera__knob--top" style="--h:5.5"></i>
    </div>`,
  },
  {
    id: 'coffeecup',
    title: 'Takeaway coffee',
    description:
      'A paper cup that is wider at the top: twenty trapezoid strips lean out from the base circle. The sleeve and its logo wrap around without a seam, the lid is a stack of discs and the steam keeps rising.',
    category: 'css',
    tags: ['loop', 'product', 'cone', 'packaging', 'label'],
    technique: ['frustum: strips hinged at the base, rotateX(−lean)', 'trapezoids with clip-path', 'one lap-long label, background-position by index', 'steam from the sip slot, counter-turned to face you'],
    html: `<div class="d-coffeecup">
      <div class="d-coffeecup__spin">
        <i class="d-coffeecup__shadow"></i>
        ${rep(20, (i) => `<i class="d-coffeecup__strip" style="--i:${i}"></i>`)}
        ${[-1.5, 0, 1.5, 3].map((y) => `<i class="d-coffeecup__lid" style="--y:${y}"></i>`).join('')}
        <i class="d-coffeecup__lid d-coffeecup__lid--top" style="--y:4.5"></i>
        <i class="d-coffeecup__lid d-coffeecup__lid--spout" style="--y:6.5"></i>
        <i class="d-coffeecup__vent"><i class="d-coffeecup__face">${[-2, 3].map((x, d) => `<i class="d-coffeecup__steam" style="--x:${x};--d:${d}"></i>`).join('')}</i></i>
      </div>
    </div>`,
  },
];
