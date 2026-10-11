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
      'The globe\'s body is one flat disc that always faces you, with a lit-from-above <code>radial-gradient</code>, standing at the sphere\'s middle (z = 0). Everything that turns — land, city dots, routes — shares its <code>preserve-3d</code> space, so the browser splits each of them where it crosses the disc: what is in front of the middle is drawn, what is behind is hidden. One element makes a solid sphere.',
      'The land is 22 flat pieces, one to eight per landmass. Each is a sheet cut to its coastline with <code>clip-path: polygon()</code> and placed like a city dot, <code>rotateY(lon) rotateX(lat) translateZ(p)</code>, on the plane that touches the sphere at its middle. The coastline was projected onto that plane from the globe\'s centre, so it lies over the true coastline and every city lands on its own land; every point of a piece is within 27° of its middle, and the piece is set a little in from the surface so its middle sinks as far as its edges float — under 6 units either way.',
      'A flight path is a half circle (a ring cut to its upper half) standing on the straight chord between two cities: radius <code>R·sin θ</code>, chord <code>R·cos θ</code> out from the centre, where 2θ is the angle between them, so its feet land on both cities. Read right to left, one transform places it: a lean about the chord, <code>rotateX(-90deg)</code> to stand it up, <code>rotateZ(ψ)</code> to point it from city to city, <code>rotateX(lat) rotateY(lon)</code> to carry it to their midpoint. The lean (27° to 53°) lays each arc\'s plane nearly level with the equator, and the camera looks down 28°, more than any arc is off level, so no arc ever turns edge-on into a broken hairline.',
      'The plane rides an arm pinned at the half circle\'s centre that turns 0° to 180°, so it follows the arc nose first. It is the same plane shape twice, crossed at 90°, so it never vanishes edge-on, and it fades in and out with <code>opacity</code> at the two airports. The arcs are thick strokes edged in a dark hairline (a spread <code>box-shadow</code>, no blur), so they read on both stages.',
      'The globe turns once every 48 s about a tilted axis, so the routes go round the back and come again. The caption under it is flat chrome in the stage\'s own ink. Every length is a multiple of one base unit, <code>--u</code>, so the globe is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="band">
  <div class="view">
    <div class="world" role="img" aria-label="A turning globe with six flight routes arcing between ten cities on five continents, a plane flying each one">
      <div class="ocean"></div>
      <div class="globe">
        <i class="ring" style="--r:100"></i><!-- the equator -->
        <i class="land" style="--lon:-148;--lat:63;--p:98.1;--x:-14.1;--y:-14.6;--w:35.9;--h:31.2;clip-path:polygon(7.2% 14%,16.9% 2.5%,26.9% 0.1%,44.2% 8.1%,61.5% 11.1%,76.6% 0,76.8% 0,100% 100%,89.5% 86.4%,77.8% 72.3%,66.3% 66.4%,56% 62.4%,43.9% 57.8%,32% 66%,23.8% 76.4%,12.8% 80.5%,0.6% 86.6%,14.3% 69.5%,5.9% 59.3%,1.4% 46.7%,4.9% 36.3%,0 25.9%)"></i><!-- Alaska -->
        <i class="land" style="--lon:-108;--lat:62;--p:97.2;--x:-21.7;--y:-16.3;--w:39;--h:43.4;clip-path:polygon(24.8% 2.5%,30.2% 2.9%,44.3% 11.5%,60.4% 13.9%,73.5% 12.6%,75.4% 0,89.5% 8.8%,100% 11.4%,93.3% 24.4%,84.9% 38.6%,90% 49.7%,99.8% 51.9%,99.1% 75.3%,4.2% 100%,5.8% 94.9%,6% 86.7%,2% 76.8%,0 61%)"></i><!-- Canada W -->
        <i class="land" style="--lon:-72;--lat:56;--p:96.8;--x:-23.2;--y:-19.8;--w:40.9;--h:54.9;clip-path:polygon(37.4% 0,40.1% 2.3%,31.8% 6.4%,14.1% 26.8%,20.3% 31.4%,33.1% 37.9%,36.4% 47.6%,40.2% 38.5%,45.8% 29.6%,44.7% 20.2%,52.9% 17.5%,60.8% 20.6%,71.2% 23.2%,79.8% 34.8%,95% 45.5%,100% 52.7%,91% 62.1%,80.6% 69.5%,71.8% 71.6%,63% 76.8%,63.1% 81%,50.2% 85.6%,44.8% 93.3%,43.2% 100%,0 42.7%)"></i><!-- Canada E -->
        <i class="land" style="--lon:-100;--lat:40;--p:97;--x:-31.6;--y:-22.1;--w:65.9;--h:42;clip-path:polygon(98.9% 50.7%,100% 62.8%,96.1% 68.6%,90.8% 81.2%,93.1% 89.5%,83.1% 91%,82.3% 90.6%,72.9% 90.6%,70.7% 92.8%,23.1% 100%,20.4% 93.2%,15.5% 83.7%,10.3% 77.8%,6.2% 70.2%,3.3% 67.2%,1% 53.8%,0 40.2%,1.5% 29.8%,4.5% 15.7%,4.5% 15%,59.8% 0)"></i><!-- USA -->
        <i class="land" style="--lon:-98;--lat:20;--p:95.8;--x:-20.4;--y:-20.1;--w:56.6;--h:41;clip-path:polygon(81.5% 0,85% 15.4%,84.2% 23.4%,79.5% 18.6%,76% 8.4%,70.3% 5.9%,59.5% 5.7%,54.4% 10%,46.5% 9.2%,38.7% 17%,37.4% 32.6%,38.8% 44.9%,41.6% 53%,47.3% 56.1%,55.7% 54.2%,56.8% 44.2%,66.6% 41.4%,65.8% 56%,63.9% 64.4%,76.6% 64.2%,79.8% 80.2%,79.3% 86.7%,86.4% 92.8%,94.3% 90%,100% 94.1%,98.5% 99.6%,91.8% 100%,85% 96.4%,73.5% 89.1%,68.4% 78.8%,54.8% 73.2%,46% 65.2%,38.9% 66.1%,27.6% 59.1%,15.2% 46.3%,15.5% 38.1%,7.7% 24.9%,0 8.8%)"></i><!-- Mexico -->
        <i class="land" style="--lon:-42;--lat:73;--p:98.7;--x:-10.7;--y:-18.5;--w:21.2;--h:41.3;--c:#e4ecf4;clip-path:polygon(0 16.9%,20.5% 8%,41.9% 4.6%,61.7% 0,76.7% 6.6%,93.5% 23.6%,100% 44.8%,97.9% 60.5%,77.1% 73.3%,57.4% 78.4%,46.3% 100%,26.4% 95.1%,18.1% 81.5%,15.5% 68.4%,15.4% 53.4%,18.2% 32.2%,4.2% 25.1%)"></i><!-- Greenland -->
        <i class="land" style="--lon:-62;--lat:-6;--p:94.3;--x:-32.3;--y:-31.7;--w:80.1;--h:56.3;clip-path:polygon(11.3% 4.7%,20.1% 0,27.7% 6.1%,38.3% 6%,44.6% 12.9%,50.8% 20.6%,61.4% 23.5%,65.6% 33.2%,68.7% 41.7%,77.5% 46.4%,87.9% 47.5%,100% 56.7%,99.6% 68.2%,93% 78.9%,88.9% 93%,86.8% 100%,23.7% 99.9%,23.9% 93.9%,13.8% 85.4%,9.4% 75.1%,3.6% 63.2%,0 54.2%,2% 41.7%,1.8% 35.5%,5.1% 30.9%,7.1% 18.4%,7.2% 12%,10.3% 8.9%)"></i><!-- Amazon -->
        <i class="land" style="--lon:-62;--lat:-34;--p:94.8;--x:-15.3;--y:-24.8;--w:53.9;--h:60.7;clip-path:polygon(100% 0,93.8% 8.8%,87.6% 14.1%,77.9% 15.4%,66.5% 20.6%,64% 27.8%,56.1% 35.2%,50.1% 41.6%,43.6% 43.4%,39.4% 52%,28.4% 54.5%,21.4% 60.1%,22.7% 64.2%,17.5% 74.3%,20% 79.9%,15.2% 87.6%,15.6% 93.6%,13.2% 100%,6.9% 96.1%,1.6% 87.7%,1.7% 72.9%,1.4% 61.6%,0 50.5%,3.8% 39.1%,3.2% 28%,3.8% 11.1%,3.6% 0.1%)"></i><!-- South cone -->
        <i class="land" style="--lon:14;--lat:52;--p:96.2;--x:-32.4;--y:-30.6;--w:64.8;--h:56;clip-path:polygon(0 93.7%,0.9% 86.7%,5.5% 76.3%,8.1% 73.2%,20.4% 77.5%,22.5% 69.7%,17.8% 62.2%,23.5% 61.5%,29.3% 58.1%,33.9% 54.9%,36.1% 49.8%,41.7% 48.9%,41.8% 40.8%,45.2% 37.4%,45.1% 47.1%,50.1% 48.7%,56.9% 46.7%,60.3% 42.7%,60.6% 37.5%,64.2% 37.6%,62.8% 31.6%,70.4% 27.8%,61.1% 28.8%,59.2% 22.2%,62.4% 13.8%,58.8% 11.8%,54.4% 22.7%,56% 30.3%,53.6% 39.6%,48.6% 44.2%,46% 35%,41.8% 36.2%,38.7% 32.8%,39% 23.5%,44.2% 19.5%,50.1% 8.7%,54.1% 0,100% 72.9%,87.2% 99.2%,85.1% 99.5%,79.2% 98.3%,76.3% 93.8%,75.8% 88.1%,74.2% 87.1%,69.3% 89.4%,68.3% 99.8%,66.2% 100%,62.4% 92%,60.9% 85.2%,53.9% 80.3%,49.4% 74%,46.9% 77.3%,50.1% 85%,54.2% 91.2%,55.5% 95.9%,53.7% 97.5%,53.3% 91.2%,50.1% 88.7%,46.2% 85.6%,43.4% 81.8%,40.4% 77.3%,36.8% 79.4%,32.5% 79.6%,29.3% 80.4%,28.5% 83.7%,24.1% 85.8%,21.4% 89.2%,19.7% 93.1%,15.4% 97.9%,7.2% 98.4%,5.9% 95.7%,3.6% 93.7%)"></i><!-- Europe -->
        <i class="land" style="--lon:52;--lat:60;--p:95.8;--x:-21.5;--y:-22.2;--w:56.7;--h:53.2;clip-path:polygon(2.2% 35.1%,4.9% 35.6%,2.1% 34%,1.2% 20.4%,4.5% 18.1%,2.1% 14%,0.8% 14.7%,0 2.5%,5% 0,11.9% 0.3%,16.6% 5.9%,21.5% 12.6%,24.9% 19.9%,15.1% 19%,16.3% 24.4%,22.6% 25.9%,28.4% 20.5%,29.1% 14.1%,40% 14.7%,46.4% 12.5%,54.2% 12.6%,53.6% 5.3%,100% 81.4%,79.2% 100%,5.8% 95.4%)"></i><!-- Russia -->
        <i class="land" style="--lon:95;--lat:65;--p:95.8;--x:-21.8;--y:-21.8;--w:48.7;--h:57.9;clip-path:polygon(9.7% 20.5%,10.2% 20.9%,18.2% 11%,21% 15.2%,18% 23.6%,23.6% 14.4%,30.1% 11.4%,37.3% 9.6%,44.7% 5.6%,51.5% 0,62.1% 10.2%,72.4% 7.2%,100% 69.3%,7.3% 100%,0 97.7%)"></i><!-- Siberia -->
        <i class="land" style="--lon:145;--lat:64;--p:96.3;--x:-28.4;--y:-19;--w:58.2;--h:54.6;clip-path:polygon(28.3% 0,31.6% 1.9%,35.6% 11.5%,44.4% 8.2%,53.4% 11.3%,63.8% 15.2%,73.2% 10.8%,82% 9.5%,93.9% 12.6%,100% 9.5%,95.5% 17.3%,91.8% 27.3%,86.7% 37.1%,74.8% 43.9%,76.4% 55.9%,70.2% 73.7%,66.2% 54.9%,69.7% 41.4%,62.1% 48.6%,45.8% 49.2%,35% 65%,41.5% 72.1%,38.9% 83.3%,26.4% 99.2%,23% 100%,0 63.3%)"></i><!-- Far East -->
        <i class="land" style="--lon:50;--lat:27;--p:96.1;--x:-29.1;--y:-30.2;--w:56.2;--h:54.6;clip-path:polygon(95.8% 57.6%,83.2% 59.5%,71.8% 58.5%,68.9% 54.9%,62.5% 56.4%,58.5% 53.8%,52.9% 47.7%,47.7% 46.4%,47.9% 52.3%,51.8% 56.9%,55.9% 63.1%,64.1% 63.8%,67.9% 57.5%,69.6% 62.6%,75.2% 65.1%,79.1% 68.3%,75.9% 74.8%,73.3% 80%,66.4% 86.2%,57.7% 90.9%,48% 96%,36.8% 99.1%,31.9% 100%,30.5% 92.4%,30.3% 86.6%,24.8% 76.2%,21% 69.6%,20.3% 61.7%,15.4% 54%,11.7% 49.8%,10.9% 44.9%,11% 39.1%,13.5% 34%,17% 26.5%,17.4% 22.7%,7% 22.5%,1.9% 21.1%,0 20%,25.1% 0,100% 2.1%)"></i><!-- Arabia -->
        <i class="land" style="--lon:80;--lat:22;--p:95.8;--x:-23.7;--y:-41.1;--w:49.6;--h:64.6;clip-path:polygon(91.5% 68.7%,85.7% 63.8%,80.7% 62.7%,74.4% 64.1%,69.5% 67.1%,63.6% 70.4%,55.1% 77.6%,48.3% 80.5%,48.7% 87.1%,47% 94.3%,40.8% 100%,35.7% 98.1%,30.3% 87.5%,26.1% 78.9%,24.6% 71%,24.7% 64.7%,16.6% 65.5%,11.7% 58.9%,5.9% 53.2%,0 52.8%,16.4% 8%,44.7% 0,51.4% 0.8%,100% 52.4%)"></i><!-- India -->
        <i class="land" style="--lon:108;--lat:36;--p:95.7;--x:-35.8;--y:-29.8;--w:69.9;--h:53.8;clip-path:polygon(100% 20.8%,99.8% 21.4%,92.1% 28.6%,91.2% 35%,93% 51.1%,88.3% 55.6%,86.8% 45.5%,81.9% 39.9%,75.9% 38%,77.5% 43.4%,69.9% 44.7%,72.3% 50.7%,79.2% 49.5%,76.2% 59.6%,79.9% 68.7%,81% 75%,76.6% 87%,70.5% 96.4%,66.1% 98.7%,63.8% 99.5%,62.8% 100%,23% 89.4%,0 17%,68.8% 0)"></i><!-- China -->
        <i class="land" style="--lon:103;--lat:12;--p:98;--x:-16.8;--y:-24.8;--w:37.3;--h:43.3;clip-path:polygon(100% 13.1%,95.3% 14.8%,90.9% 15.9%,77.7% 20.7%,66.7% 19%,58.2% 29.3%,70.8% 43.1%,73.4% 56.9%,62.3% 64.2%,54.2% 70.6%,53.2% 63.1%,45.1% 62.7%,35.2% 51.2%,31.6% 53.2%,27.8% 67.8%,32.7% 79%,46.9% 89%,50.7% 99.6%,47.4% 100%,35.8% 93.1%,24.5% 73.7%,22.7% 53.1%,20.7% 39.1%,7.2% 40.7%,5.4% 28.5%,0 21.7%,12.9% 0)"></i><!-- SE Asia -->
        <i class="land" style="--lon:-2;--lat:54;--p:99.8;--x:-4.2;--y:-8.1;--w:8.1;--h:15;clip-path:polygon(0 100%,37.8% 93.6%,97.6% 86.1%,100% 68.5%,77.2% 59.7%,72.9% 48.1%,56.4% 35.4%,51.5% 12.1%,28.3% 11.9%,40.2% 0.4%,17.6% 0,1.4% 24.1%,7.2% 38.3%,16.6% 44.4%,38.9% 50.5%,33.4% 62.1%,16.2% 67.7%,22% 81.8%,7.3% 80.3%)"></i><!-- UK -->
        <i class="land" style="--lon:138;--lat:38;--p:99.3;--x:-12;--y:-13;--w:21.5;--h:24.2;clip-path:polygon(0 100%,10.6% 99.2%,15.3% 82.7%,35.4% 85.7%,47.7% 80.1%,62.3% 77.3%,74.1% 69.9%,74.7% 51.3%,80.6% 42.5%,76.9% 29%,87.6% 24.1%,100% 13.9%,93.6% 7.8%,77.4% 0,76.4% 16%,67.6% 21.3%,67.8% 29.9%,66.8% 39.3%,65.2% 52.2%,49.3% 60.8%,42.6% 69.3%,22.8% 70.8%,8.8% 78.7%)"></i><!-- Japan -->
        <i class="land" style="--lon:0;--lat:20;--p:96.2;--x:-28.5;--y:-30.6;--w:54.6;--h:66;--c:#d3a456;clip-path:polygon(0.1% 58.2%,2.6% 45.6%,2.2% 41.6%,16% 25.5%,25.5% 19.6%,27.3% 13.1%,34.3% 9.5%,36.9% 4.7%,47% 6.9%,59.9% 2.2%,78% 0,81% 4.5%,78.7% 8.9%,82.9% 11.2%,93.3% 12%,98.1% 13.3%,100% 88.9%,82.3% 100%,83.1% 92.2%,83.1% 88%,79.4% 86.6%,71.4% 87.2%,66.4% 81.8%,56.9% 82.4%,45.8% 85.9%,37.9% 84.8%,28.2% 86.9%,15.7% 79.9%,10.3% 74.6%,4.4% 68.4%,0 64.1%)"></i><!-- Sahara W -->
        <i class="land" style="--lon:30;--lat:18;--p:96.1;--x:-29.7;--y:-25.8;--w:66.2;--h:58.6;--c:#d3a456;clip-path:polygon(12.1% 0,21.1% 6.8%,22.5% 2%,29.3% 0.8%,33.7% 3.8%,42.6% 6.5%,49.9% 5.3%,54.2% 5.1%,53.5% 17.4%,57.7% 26.6%,62.2% 35%,62.9% 42.2%,66.9% 49.2%,73.6% 56.2%,78.5% 61%,82% 65%,100% 59.5%,99.9% 63.8%,96.8% 76.2%,88.1% 90.8%,77.4% 99.3%,77% 100%,0 86.2%)"></i><!-- Sahara E -->
        <i class="land" style="--lon:25;--lat:-14;--p:95.9;--x:-28.2;--y:-32.5;--w:60.7;--h:69.1;clip-path:polygon(100% 11.9%,96.1% 14%,89.4% 21.6%,86.5% 29.2%,87.6% 38.1%,88.7% 50.7%,78.5% 56.4%,73.3% 67.3%,73.6% 72.4%,65.8% 77%,65.1% 83.7%,58.8% 90.5%,51.3% 96.7%,40.4% 97.6%,34.3% 100%,30.4% 98%,29.2% 92.6%,26.4% 84.8%,21% 78.7%,19.2% 69.8%,11.8% 57.8%,10.9% 52.8%,15% 42.7%,13.2% 35.3%,10.7% 27.9%,0 15.1%,0.6% 8.5%,13.6% 0)"></i><!-- Africa S -->
        <i class="land" style="--lon:134;--lat:-26;--p:97.2;--x:-33.4;--y:-26.2;--w:63.4;--h:49.8;--c:#d3a456;clip-path:polygon(0 43.5%,3.8% 58.4%,7.4% 71%,8.9% 83.4%,11.9% 88.2%,16.6% 87.2%,29% 81.5%,34.4% 75%,45.8% 71.5%,53.8% 76.5%,61% 85.7%,64.8% 87.4%,66.7% 94.6%,74.3% 96.6%,79.6% 100%,86.7% 95.9%,89% 89.1%,92.2% 83.6%,97.5% 74.6%,100% 64.2%,100% 53.4%,95.2% 43.7%,90.9% 37.8%,84.4% 30%,83% 15.7%,78.1% 11.8%,75.9% 0,72.8% 7.9%,72.4% 22.2%,68.2% 24.1%,62.6% 18.3%,57.9% 14.7%,59.9% 5.1%,55.4% 3.9%,48.9% 1.8%,44.6% 4.7%,40.8% 14.1%,34% 10.7%,28.7% 13.9%,23.8% 20.9%,19.8% 31.9%,14.1% 34.3%,8.1% 37.2%)"></i><!-- Australia -->
        <i class="city" style="--lon:-0.1;--lat:51.5"></i><!-- London -->
        <i class="city" style="--lon:-74;--lat:40.9"></i><!-- New York -->
        <i class="city" style="--lon:-118;--lat:34.2"></i><!-- Los Angeles -->
        <i class="city" style="--lon:139.7;--lat:35.9"></i><!-- Tokyo -->
        <i class="city" style="--lon:-46.8;--lat:-23.4"></i><!-- São Paulo -->
        <i class="city" style="--lon:28;--lat:-26.2"></i><!-- Johannesburg -->
        <i class="city" style="--lon:55.6;--lat:24.8"></i><!-- Dubai -->
        <i class="city" style="--lon:114;--lat:22.8"></i><!-- Hong Kong -->
        <i class="city" style="--lon:116.4;--lat:-32"></i><!-- Perth -->
        <i class="city" style="--lon:150.6;--lat:-33.6"></i><!-- Sydney -->
${route(-41.2, 52.5, 165.6, 42.3, 90.6, 53, '#2ee6d6', '5s', '-1.2s')}<!-- London – New York -->
${route(-168.4, 48.2, -178.4, 63.8, 77, 48, '#4cc9ff', '6.6s', '-4.1s')}<!-- Los Angeles – Tokyo -->
${route(-97, 39.7, -11.5, 30.2, 95.3, -40, '#c49bff', '4s', '-0.6s')}<!-- Los Angeles – New York -->
${route(-9.9, -30.2, 2.7, 55.2, 83.4, 30, '#ffe14d', '6s', '-2.6s')}<!-- São Paulo – Johannesburg -->
${route(85, 26.8, 2.3, 44.7, 89.5, -27, '#ffb547', '5.2s', '-3.3s')}<!-- Dubai – Hong Kong -->
${route(133.3, -34, 3.3, 24.8, 96.9, 34, '#ff4d9d', '3.8s', '-1.9s')}<!-- Perth – Sydney -->
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
  inset: calc(-3 * var(--u)); /* a touch wider than the land sphere, so the far side of a piece at the rim is hidden too */
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

/* the equator, laid flat: a faint line that shows the turn over open ocean */
.ring {
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  margin: calc(-100 * var(--u)) 0 0 calc(-100 * var(--u));
  border: calc(1.2 * var(--u)) solid rgb(150 190 255 / 0.4);
  border-radius: 50%;
  transform: rotateX(90deg);
}

/* land: each continent is cut into a few pieces, and each piece is a flat sheet cut to its
   coastline with clip-path, standing on the plane that touches the sphere at its middle
   (--lon, --lat). The sheet sits p in from the ground (p < 100) so its middle sinks as far as
   its edges float: no piece is more than 6 units off the round surface. The coastline was
   projected onto that plane from the globe's centre, so seen from the centre's side it lies
   exactly over the real one, and a city dot at the same longitude and latitude lands on it.
   --x, --y, --w and --h are the piece's box on its plane */
.land {
  width: calc(var(--w) * var(--u));
  height: calc(var(--h) * var(--u));
  background: var(--c, #4fae62); /* green, unless the piece says desert or ice */
  transform-origin: 0 0;
  transform:
    rotateY(calc(var(--lon) * 1deg)) rotateX(calc(var(--lat) * 1deg))
    translateZ(calc(var(--p) * var(--u))) translate(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)));
}

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
   cities; the lean lays it nearly level with the equator, so it never turns edge-on), stand it
   up, point it from city to city, carry it to the midpoint of the two */
.route {
  transform:
    rotateY(calc(var(--lon) * 1deg)) rotateX(calc(var(--lat) * 1deg)) rotateZ(calc(var(--psi) * 1deg)) rotateX(-90deg)
    translateY(calc(var(--c) * -1 * var(--u))) rotateX(calc(var(--lean) * 1deg)) translateY(calc(var(--c) * var(--u)));
}
/* the half circle: a whole ring of radius a centred c out from the centre, cut to its upper half.
   A dark hairline either side of the stroke (spread shadows, no blur) keeps a bright arc
   readable over the light stage */
.arc {
  left: calc(var(--a) * -1 * var(--u));
  top: calc((var(--c) + var(--a)) * -1 * var(--u));
  width: calc(var(--a) * 2 * var(--u));
  height: calc(var(--a) * 2 * var(--u));
  border: calc(4.5 * var(--u)) solid var(--col);
  border-radius: 50%;
  box-shadow:
    0 0 0 calc(1.2 * var(--u)) rgb(10 14 48 / 0.5),
    inset 0 0 0 calc(1.2 * var(--u)) rgb(10 14 48 / 0.5);
  clip-path: polygon(-5% -5%, 105% -5%, 105% 50%, -5% 50%);
}
/* the arm turns about the half circle's centre, carrying the plane from one city to the other */
.arm {
  left: 0;
  top: calc(var(--c) * -1 * var(--u));
  animation: fly var(--t) linear var(--dl) infinite;
}
/* the plane, nose along the arc, drawn twice and crossed so it never goes edge-on */
.arm i {
  left: calc((var(--a) - 2.25) * -1 * var(--u) - 12 * var(--u));
  top: calc(-13 * var(--u));
  width: calc(24 * var(--u));
  height: calc(26 * var(--u));
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
