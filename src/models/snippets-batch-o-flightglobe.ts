import type { Snippet } from './snippet-utils';

/**
 * Each route is worked out once from its two cities (longitude, latitude): the midpoint on the
 * sphere (--lon, --lat), the turn about it that points the route from one city to the other
 * (--psi), and half the angle between the cities, theta: the arc is a half circle of radius
 * a = R sin(theta) on the chord R cos(theta) out from the centre (--c), so its feet land on both
 * cities and its top rises a + c − R above the ground. R is 100.
 */
const route = (lon: number, lat: number, psi: number, a: number, c: number, lean: number, col: string, t: string, dl: string) =>
  `      <div class="route" style="--lon:${lon};--lat:${lat};--psi:${psi};--a:${a};--c:${c};--lean:${lean};--col:${col};--t:${t};--dl:${dl}"><i class="arc"></i><b class="arm"><i></i><i></i></b></div>`;

export const snippetsFlightglobe: Record<string, Snippet> = {
  flightglobe: {
    how: [
      'The globe\'s body is one flat disc that always faces you, with a lit-from-above <code>radial-gradient</code>, standing at the sphere\'s middle (z = 0). Everything that turns — grid rings, city dots, routes — shares its <code>preserve-3d</code> space, so the browser splits each of them where it crosses the disc: what is in front of the middle is drawn, what is behind is hidden. One element makes a solid sphere.',
      'A flight path is a half circle (a box with a top, left and right border, its top corners rounded by its own height) standing on the straight chord between two cities: the chord sits <code>R·cos θ</code> out from the centre and the radius is <code>R·sin θ</code>, where 2θ is the angle between the cities, so its feet land on both cities and the rest is off the ground. One transform, read right to left, places it: a lean about the chord (the feet stay put), <code>rotateX(-90deg)</code> to stand it up, <code>rotateZ(ψ)</code> to point it from one city to the other, <code>rotateX(lat) rotateY(lon)</code> to carry it to their midpoint. The numbers come from the cities\' coordinates, worked out once.',
      'Why the lean: a flat arc seen edge-on is a broken hairline, and an upright arc is edge-on whenever its route faces you. Each arc is leant (27° to 53°) until its plane lies nearly level with the equator, and the camera looks down on the globe by 28°, more than any arc\'s plane is off level, so no arc ever turns edge-on. The routes are east–west ones, which is what makes that lean possible.',
      'The plane rides an arm pinned at the half circle\'s centre that turns 0° to 180°, so it follows the arc and always points along it. It is the same plane shape twice, crossed at 90°, so it never vanishes edge-on, and it fades in and out with <code>opacity</code> at the two airports.',
      'The globe turns once every 48 s about a tilted axis, so the routes go round the back and come again. The caption under it is flat chrome in the stage\'s own ink. Every length is a multiple of one base unit, <code>--u</code>, so the globe is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="band">
  <div class="view">
    <div class="world" role="img" aria-label="A turning globe with six flight routes arcing between ten cities on five continents, a plane flying each one">
      <div class="ocean"></div>
      <div class="globe">
        <i class="ring lat" style="--r:82;--y:-57"></i>
        <i class="ring lat" style="--r:100;--y:0"></i>
        <i class="ring lat" style="--r:82;--y:57"></i>
        <i class="ring mer" style="--m:0"></i>
        <i class="ring mer" style="--m:60"></i>
        <i class="ring mer" style="--m:120"></i>
        <i class="city" style="--lon:0;--lat:51"></i><!-- London -->
        <i class="city" style="--lon:-74;--lat:41"></i><!-- New York -->
        <i class="city" style="--lon:-118;--lat:34"></i><!-- Los Angeles -->
        <i class="city" style="--lon:140;--lat:36"></i><!-- Tokyo -->
        <i class="city" style="--lon:-47;--lat:-23"></i><!-- São Paulo -->
        <i class="city" style="--lon:28;--lat:-26"></i><!-- Johannesburg -->
        <i class="city" style="--lon:55;--lat:25"></i><!-- Dubai -->
        <i class="city" style="--lon:114;--lat:22"></i><!-- Hong Kong -->
        <i class="city" style="--lon:116;--lat:-32"></i><!-- Perth -->
        <i class="city" style="--lon:151;--lat:-34"></i><!-- Sydney -->
${route(-40.9, 52.3, 166.5, 42.4, 90.6, 53, '#2ee6d6', '5s', '-1.2s')}<!-- London – New York -->
${route(-168.1, 48, -178.1, 63.7, 77.1, 48, '#4cc9ff', '6.6s', '-4.1s')}<!-- Los Angeles – Tokyo -->
${route(-97.1, 39.6, -12, 30.3, 95.3, -40, '#8b6cff', '4s', '-0.6s')}<!-- Los Angeles – New York -->
${route(-10, -29.9, 2.8, 55.4, 83.2, 30, '#7ee787', '6s', '-2.6s')}<!-- São Paulo – Johannesburg -->
${route(84.9, 26.5, 3.4, 45.2, 89.2, -27, '#ffb547', '5.2s', '-3.3s')}<!-- Dubai – Hong Kong -->
${route(133.3, -34.3, 4, 25.3, 96.8, 34, '#ff4d9d', '3.8s', '-1.9s')}<!-- Perth – Sydney -->
      </div>
    </div>
  </div>
  <div class="controls">
    <p class="caption">6 routes · 1,240 flights this week</p>
  </div>
</div>`,
    css: `/* the model box and the caption stand in one stack, centred together */
.band { display: grid; justify-items: center; gap: 4vmin; }
.view {
  /* one base unit: every length below is a multiple of it, so the globe is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  height: 50vmin;
  display: grid;
  place-items: center;
  perspective: calc(1000 * var(--u));
}
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}
.controls .caption {
  margin: 0;
  font: 500 4.5vmin/1.2 Inter, system-ui, sans-serif;
  opacity: 0.7;
}

/* the globe: radius R = 100 */
.world {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
}

/* the body: a disc facing the camera at the sphere's middle. Whatever turns behind z = 0 inside
   its outline is hidden by it, which is all a sphere does */
.ocean {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 28%, #6c95ff, #2b4bd0 34%, #17228a 66%, #0b1150);
  box-shadow:
    inset calc(-10 * var(--u)) calc(-14 * var(--u)) calc(30 * var(--u)) rgb(4 6 30 / 0.55),
    0 0 calc(14 * var(--u)) rgb(76 201 255 / 0.45);
}

.globe {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: spin 48s linear infinite;
}
/* everything on the globe is placed from its centre */
.globe * {
  position: absolute;
  left: 50%;
  top: 50%;
  box-sizing: border-box;
  transform-style: preserve-3d;
}

/* grid: three circles of latitude laid flat, three meridians stood on the axis */
.ring {
  --r: 100;
  width: calc(var(--r) * 2 * var(--u));
  height: calc(var(--r) * 2 * var(--u));
  margin: calc(var(--r) * -1 * var(--u)) 0 0 calc(var(--r) * -1 * var(--u));
  border: calc(1.2 * var(--u)) solid rgb(150 190 255 / 0.4);
  border-radius: 50%;
}
.lat { transform: translateY(calc(var(--y) * var(--u))) rotateX(90deg); }
.mer { transform: rotateY(calc(var(--m) * 1deg)); }

/* a city: a dot on the tangent plane, just off the ground */
.city {
  width: calc(9 * var(--u));
  height: calc(9 * var(--u));
  margin: calc(-4.5 * var(--u)) 0 0 calc(-4.5 * var(--u));
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 calc(2 * var(--u)) rgb(255 255 255 / 0.35);
  transform: rotateY(calc(var(--lon) * 1deg)) rotateX(calc(var(--lat) * 1deg)) translateZ(calc(101 * var(--u)));
}

/* a route: read right to left, lean the half circle about its chord (its feet stay on the
   cities, and leant it is a curve even seen from straight above), stand it up, point it from
   city to city, carry it to the midpoint of the two */
.route {
  transform:
    rotateY(calc(var(--lon) * 1deg)) rotateX(calc(var(--lat) * 1deg)) rotateZ(calc(var(--psi) * 1deg)) rotateX(-90deg)
    translateY(calc(var(--c) * -1 * var(--u))) rotateX(calc(var(--lean) * 1deg)) translateY(calc(var(--c) * var(--u)));
}
/* the half circle: its chord is c out from the centre, its radius a */
.arc {
  left: calc(var(--a) * -1 * var(--u));
  top: calc((var(--c) + var(--a)) * -1 * var(--u));
  width: calc(var(--a) * 2 * var(--u));
  height: calc(var(--a) * var(--u));
  border: calc(2.6 * var(--u)) solid var(--col);
  border-bottom: 0;
  border-radius: calc(var(--a) * var(--u)) calc(var(--a) * var(--u)) 0 0;
}
/* the arm turns about the half circle's centre, carrying the plane from one city to the other */
.arm {
  left: 0;
  top: calc(var(--c) * -1 * var(--u));
  animation: fly var(--t) linear var(--dl) infinite;
}
/* the plane, nose along the arc, drawn twice and crossed so it never goes edge-on */
.arm i {
  left: calc((var(--a) - 1) * -1 * var(--u) - 8 * var(--u));
  top: calc(-9 * var(--u));
  width: calc(16 * var(--u));
  height: calc(18 * var(--u));
  background: var(--col);
  clip-path: polygon(50% 0, 57% 9%, 57% 36%, 100% 58%, 100% 68%, 57% 56%, 56% 80%, 72% 92%, 72% 100%, 50% 95%, 28% 100%, 28% 92%, 44% 80%, 43% 56%, 0 68%, 0 58%, 43% 36%, 43% 9%);
  opacity: 0;
  animation: blink var(--t) linear var(--dl) infinite;
}
.arm i + i { transform: rotateY(90deg); }

@keyframes spin {
  from { transform: rotateZ(-14deg) rotateX(-28deg) rotateY(-50deg); }
  to   { transform: rotateZ(-14deg) rotateX(-28deg) rotateY(310deg); }
}
@keyframes fly {
  from { transform: rotate(0deg); }
  to   { transform: rotate(180deg); }
}
@keyframes blink {
  0%, 100% { opacity: 0; }
  8%, 92%  { opacity: 1; }
}`,
  },
};
