import site from '../site.config.json';
import { icon } from './icons';

/** Sharing helpers: canonical links, the embed snippet, and copy-to-clipboard with honest feedback. */

export const pageUrl = (id: string): string => `${site.url}/models/${id}/`;
export const embedUrl = (id: string): string => `${site.url}/embed/${id}/`;

export function embedCode(id: string, title: string): string {
  return `<iframe src="${embedUrl(id)}" title="${title} — CSS 3D Lab" width="600" height="400" style="border:0;border-radius:14px;max-width:100%" loading="lazy"></iframe>`;
}

async function flash(btn: HTMLElement, ok: boolean, okLabel: string): Promise<void> {
  const label = btn.innerHTML;
  btn.innerHTML = ok ? `${icon('check')} ${okLabel}` : 'Copy blocked — select the text manually';
  window.setTimeout(() => (btn.innerHTML = label), 1800);
}

export async function copyText(btn: HTMLElement, text: string, okLabel = 'Copied'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    void flash(btn, true, okLabel);
    return true;
  } catch {
    void flash(btn, false, okLabel);
    return false;
  }
}
