/**
 * The hero cube can be played with: drag to turn it in any direction (it coasts, then eases back
 * into its own tumble), scroll or pinch to zoom (it springs back to its size when you stop).
 *
 * Three layers, so nothing fights: `.hero__zoom` (scale) > `.hero__turn` (the visitor's rotation)
 * > `.hero__cube` (the endless CSS tumble, paused while held). The pointer is caught by
 * `.hero__art`, which never moves (a moving hit area flickers).
 *
 * Turning is a trackball: every drag step rotates the cube about the screen axis at right angles
 * to the drag, applied on top of the current orientation, so up, down, sideways and diagonal all
 * behave the same, and the cube can go all the way round in any direction.
 *
 * Scrolling: with the pointer ON the cube the wheel only zooms (the page does not move); anywhere
 * else it scrolls the page. On touch screens a vertical swipe scrolls the page (touch-action:
 * pan-y); sideways drags and pinches come here.
 */
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;
const DEG_PER_PX = 0.45;

export function initHero(): void {
  const art = document.querySelector<HTMLElement>('.hero__art');
  const zoomEl = art?.querySelector<HTMLElement>('.hero__zoom');
  const turn = art?.querySelector<HTMLElement>('.hero__turn');
  const cube = art?.querySelector<HTMLElement>('.hero__cube');
  if (!art || !zoomEl || !turn || !cube) return;

  let m = new DOMMatrix(); // the visitor's rotation
  let vx = 0; // last drag step, px: what the coast keeps applying (and letting fade)
  let vy = 0;
  let raf = 0;
  let zoom = 1;
  let zoomTimer = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0;
  let pinchZoom = 1;

  const played = () => art.classList.add('was-played');

  // turn by a drag step (dx, dy) in screen pixels, about the axis at right angles to it
  const rotateBy = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    m = new DOMMatrix().rotateAxisAngle(-dy / len, dx / len, 0, len * DEG_PER_PX).multiply(m);
    turn.style.transform = m.toString();
  };

  const setZoom = (z: number, springy: boolean) => {
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    zoomEl.classList.toggle('is-springing', springy);
    zoomEl.style.setProperty('--z', zoom.toFixed(3));
  };
  // let go of zooming: bounce back to the normal size
  const springBackSoon = (delay: number) => {
    window.clearTimeout(zoomTimer);
    zoomTimer = window.setTimeout(() => setZoom(1, true), delay);
  };

  // back to its own tumble: the visitor's turn eases out (CSS interpolates the rotation) and the
  // cube's animation carries on from where it was paused
  const settle = () => {
    art.classList.remove('is-held');
    turn.classList.add('is-returning');
    m = new DOMMatrix();
    turn.style.transform = m.toString();
  };
  const coast = () => {
    vx *= 0.94;
    vy *= 0.94;
    rotateBy(vx, vy);
    if (Math.hypot(vx, vy) > 0.15) raf = requestAnimationFrame(coast);
    else settle();
  };

  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  art.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      art.setPointerCapture(e.pointerId);
    } catch {
      /* a pointer that is already gone: nothing to capture */
    }
    cancelAnimationFrame(raf);
    // carry on from wherever the return animation has got to
    if (turn.classList.contains('is-returning')) {
      m = new DOMMatrix(getComputedStyle(turn).transform);
      turn.classList.remove('is-returning');
      turn.style.transform = m.toString();
    }
    art.classList.add('is-held');
    played();
    vx = vy = 0;
    if (pointers.size === 2) {
      pinchStart = distance();
      pinchZoom = zoom;
      window.clearTimeout(zoomTimer);
    }
  });

  art.addEventListener('pointermove', (e) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      if (pinchStart > 0) setZoom((pinchZoom * distance()) / pinchStart, false);
      return;
    }
    vx = dx;
    vy = dy;
    rotateBy(dx, dy);
  });

  const release = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) {
      // one finger of a pinch lifted: keep turning with the other, from where it is now
      pinchStart = 0;
      vx = vy = 0;
      return;
    }
    if (pointers.size > 0) return;
    if (pinchStart > 0 || zoom !== 1) springBackSoon(0);
    pinchStart = 0;
    raf = requestAnimationFrame(coast);
  };
  art.addEventListener('pointerup', release);
  art.addEventListener('pointercancel', release);

  // Is the pointer on the cube itself? A circle round it, never smaller than the cube at its normal
  // size: zooming out must not shrink the target out from under the pointer (the page would jump).
  const onCube = (e: MouseEvent): boolean => {
    const r = art.getBoundingClientRect();
    const radius = cube.offsetWidth * Math.max(zoom, 1) * 0.85;
    return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= radius;
  };

  art.addEventListener(
    'wheel',
    (e) => {
      if (!onCube(e)) return; // beside the cube: the page scrolls as usual
      e.preventDefault(); // on the cube: the wheel is for zooming, the page stays put
      played();
      setZoom(zoom * Math.exp(-e.deltaY * 0.0015), false);
      springBackSoon(450);
    },
    { passive: false },
  );
}
