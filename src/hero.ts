/**
 * The hero cube can be played with: drag to turn it (it coasts, then eases back into its own
 * tumble), scroll or pinch to zoom (it springs back to its size when you stop).
 *
 * Three layers, so nothing fights: `.hero__zoom` (scale) > `.hero__turn` (the visitor's rotation,
 * --rx / --ry) > `.hero__cube` (the endless CSS tumble, paused while held). The pointer is caught
 * by `.hero__art`, which never moves (a moving hit area flickers).
 *
 * Page scrolling always wins where it should: on touch screens a vertical swipe still scrolls the
 * page (touch-action: pan-y; sideways drags and pinches come here), and the wheel only zooms until
 * the zoom reaches its limit, then the page scrolls on as usual.
 */
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;

export function initHero(): void {
  const art = document.querySelector<HTMLElement>('.hero__art');
  const zoomEl = art?.querySelector<HTMLElement>('.hero__zoom');
  const turn = art?.querySelector<HTMLElement>('.hero__turn');
  if (!art || !zoomEl || !turn) return;

  let rx = 0;
  let ry = 0;
  let vx = 0;
  let vy = 0;
  let raf = 0;
  let zoom = 1;
  let zoomTimer = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0;
  let pinchZoom = 1;

  const played = () => art.classList.add('was-played');
  const setTurn = () => {
    turn.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    turn.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
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

  // back to its own tumble: the visitor's turn eases out and the CSS animation carries on
  const settle = () => {
    art.classList.remove('is-held');
    turn.classList.add('is-returning');
    rx = 0;
    ry = 0;
    setTurn();
  };
  const coast = () => {
    vx *= 0.94;
    vy *= 0.94;
    ry += vx;
    rx = Math.max(-70, Math.min(70, rx + vy));
    setTurn();
    if (Math.abs(vx) + Math.abs(vy) > 0.08) raf = requestAnimationFrame(coast);
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
    turn.classList.remove('is-returning');
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
    vx = dx * 0.45;
    vy = -dy * 0.45;
    ry += vx;
    rx = Math.max(-70, Math.min(70, rx + vy));
    setTurn();
  });

  const release = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 1) {
      // one finger of a pinch lifted: keep turning with the other, from where it is now
      pinchStart = 0;
      return;
    }
    if (pointers.size > 0) return;
    if (pinchStart > 0 || zoom !== 1) springBackSoon(0);
    pinchStart = 0;
    raf = requestAnimationFrame(coast);
  };
  art.addEventListener('pointerup', release);
  art.addEventListener('pointercancel', release);

  art.addEventListener(
    'wheel',
    (e) => {
      const next = zoom * Math.exp(-e.deltaY * 0.0015);
      // at the limit already and still going that way: let the page scroll
      if ((next <= MIN_ZOOM && zoom <= MIN_ZOOM + 0.001) || (next >= MAX_ZOOM && zoom >= MAX_ZOOM - 0.001)) return;
      e.preventDefault();
      played();
      setZoom(next, false);
      springBackSoon(450);
    },
    { passive: false },
  );
}
