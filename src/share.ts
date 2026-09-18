import site from '../site.config.json';
import { track } from './analytics';
import { icon } from './icons';

/** Share row: link, embed code, CodePen, and the build-time MP4 / GIF downloads. */

export const pageUrl = (id: string): string => `${site.url}/demos/${id}/`;
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

/** Native share sheet where the browser has one (phones), otherwise copy the link. */
export async function shareLink(btn: HTMLElement, id: string, title: string): Promise<void> {
  const url = pageUrl(id);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${title} — CSS 3D Lab`, url });
      track(`share/${id}/native`);
    } catch {
      /* the visitor closed the share sheet: nothing to report */
    }
    return;
  }
  if (await copyText(btn, url, 'Link copied')) track(`share/${id}/link`);
}

/** Opens the snippet in CodePen, prefilled, via their documented POST endpoint. No server needed. */
export function openInCodePen(id: string, title: string, snip: { html: string; css: string; js?: string }): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://codepen.io/pen/define';
  form.target = '_blank';
  const data = document.createElement('input');
  data.type = 'hidden';
  data.name = 'data';
  data.value = JSON.stringify({
    title: `${title} — CSS 3D Lab`,
    description: `From ${pageUrl(id)} (MIT licensed)`,
    html: snip.html,
    // the standalone page centres the snippet; CodePen needs the same few lines to look right
    css: `body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  overflow: hidden;\n  background: #0b0d18;\n  color: #eceefb;\n  font-family: system-ui, sans-serif;\n}\n\n${snip.css}`,
    js: snip.js ?? '',
  });
  form.append(data);
  document.body.append(form);
  form.submit();
  form.remove();
  track(`codepen/${id}`);
}

/**
 * The MP4 / GIF are produced by the build (scripts/generate-media.mjs). A link is only shown if
 * the file is really there and really is media — a static host can answer a missing file with
 * an HTML page and status 200.
 */
export async function revealDownloads(root: ParentNode): Promise<void> {
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-media]')) {
    try {
      const res = await fetch(link.href, { method: 'HEAD' });
      const type = res.headers.get('content-type') ?? '';
      if (res.ok && /^(video|image)\//.test(type)) link.hidden = false;
    } catch {
      /* offline or blocked: the link simply stays hidden */
    }
  }
}
