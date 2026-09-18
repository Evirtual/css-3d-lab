import { icon } from './icons';

/**
 * Full-screen for any `.stage-wrap` that contains a `[data-fullscreen]` button. The wrapper goes
 * full screen (not the stage itself, whose children are replaced whenever a demo is mounted), and
 * CSS enlarges the scene so the effect can be inspected up close.
 */
export function initFullscreen(root: ParentNode = document): void {
  if (!document.fullscreenEnabled) {
    for (const btn of root.querySelectorAll<HTMLElement>('[data-fullscreen]')) btn.hidden = true;
    return;
  }
  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-fullscreen]')) {
    if (btn.dataset.bound) continue;
    btn.dataset.bound = '';
    btn.innerHTML = icon('maximize');
    btn.addEventListener('click', () => {
      const wrap = btn.closest<HTMLElement>('.stage-wrap');
      if (!wrap) return;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void wrap.requestFullscreen().catch(() => undefined); // refused: nothing else to do
    });
  }
}

document.addEventListener('fullscreenchange', () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-fullscreen]')) {
    const on = document.fullscreenElement === btn.closest('.stage-wrap');
    btn.innerHTML = icon(on ? 'minimize' : 'maximize');
    btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  }
});
