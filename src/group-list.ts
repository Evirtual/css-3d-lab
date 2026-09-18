import { icon } from './icons';

/**
 * The footer's "Every demo" list shows the first few demos of each group; "Show all" opens the
 * whole group in a dialog (the links are all in the page already, so it copies them).
 */
export function initGroupLists(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-group-list]');
    if (!btn) return;
    const section = btn.closest('section');
    const title = section?.querySelector('h3 a');
    const list = section?.querySelector('ul');
    if (!title || !list) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'grouplist';
    dialog.setAttribute('aria-label', title.firstChild?.textContent?.trim() ?? 'Effects');
    dialog.innerHTML = `<h2><span>${title.firstChild?.textContent?.trim() ?? ''}</span><button type="button" class="btn btn--icon" aria-label="Close" data-close>${icon('x')}</button></h2>
      ${list.outerHTML}
      <footer><a class="btn" href="${title.getAttribute('href')}">Open the group page ${icon('arrow-right')}</a></footer>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', (ev) => {
      if (ev.target === dialog || (ev.target as HTMLElement).closest('[data-close]')) dialog.close();
    });
    dialog.showModal();
  });
}
