import { siFacebook, siReddit, siTelegram, siWhatsapp, siX } from 'simple-icons';
import site from '../site.config.json';
import { track } from './analytics';
import { icon } from './icons';
import { pageUrl } from './share';

/**
 * The site's own share menu, instead of the operating system's share sheet (which looks different
 * on every device and nothing like this site). Targets are plain share links: no SDKs, no
 * third-party scripts, nothing is loaded from those sites until the visitor clicks one.
 * Brand icons: Simple Icons (CC0). LinkedIn asked to be removed from that set, hence the monogram.
 */
interface Target {
  key: string;
  label: string;
  color: string;
  glyph: string; // inner SVG or text
  href: (url: string, text: string) => string;
}

const brand = (path: string): string => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
const enc = encodeURIComponent;

const TARGETS: Target[] = [
  { key: 'x', label: 'X', color: '#000000', glyph: brand(siX.path), href: (u, t) => `https://twitter.com/intent/tweet?text=${enc(t)}&url=${enc(u)}` },
  { key: 'facebook', label: 'Facebook', color: `#${siFacebook.hex}`, glyph: brand(siFacebook.path), href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', glyph: '<b>in</b>', href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
  { key: 'reddit', label: 'Reddit', color: `#${siReddit.hex}`, glyph: brand(siReddit.path), href: (u, t) => `https://www.reddit.com/submit?url=${enc(u)}&title=${enc(t)}` },
  { key: 'whatsapp', label: 'WhatsApp', color: `#${siWhatsapp.hex}`, glyph: brand(siWhatsapp.path), href: (u, t) => `https://wa.me/?text=${enc(`${t} ${u}`)}` },
  { key: 'telegram', label: 'Telegram', color: `#${siTelegram.hex}`, glyph: brand(siTelegram.path), href: (u, t) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { key: 'email', label: 'Email', color: '#5b6b86', glyph: icon('mail'), href: (u, t) => `mailto:?subject=${enc(t)}&body=${enc(`${t}\n${u}`)}` },
];

let menu: HTMLDialogElement | undefined;

export function openShareMenu(id: string, title: string): void {
  const url = pageUrl(id);
  const text = `${title} — a CSS 3D effect with copy-paste code`;

  menu ??= Object.assign(document.createElement('dialog'), { className: 'sharemenu' });
  menu.innerHTML = `
    <header class="sharemenu__head">
      <h2>Share this demo</h2>
      <form method="dialog"><button class="btn btn--icon" aria-label="Close">${icon('x')}</button></form>
    </header>
    <div class="sharemenu__link">
      <img src="${site.url}/media/${id}.jpg" alt="" width="120" height="63" />
      <div><b>${title}</b><span>${url.replace('https://', '')}</span></div>
      <button type="button" class="btn btn--accent" data-copy-link>${icon('copy')} Copy link</button>
    </div>
    <ul class="sharemenu__targets">
      ${TARGETS.map((t) => `<li><a href="${t.href(url, text)}" target="_blank" rel="noopener" data-target="${t.key}"><span class="sharemenu__icon" style="--c:${t.color}">${t.glyph}</span>${t.label}</a></li>`).join('')}
    </ul>
    ${'share' in navigator ? `<button type="button" class="btn sharemenu__more" data-native>More options…</button>` : ''}`;

  // The preview image is produced by the deploy; if it is not there (local dev), do not show a broken image.
  menu.querySelector('img')!.addEventListener('error', (e) => (e.currentTarget as HTMLElement).remove());

  menu.onclick = async (e) => {
    const target = e.target as HTMLElement;
    if (target === menu) return menu!.close(); // backdrop
    const link = target.closest<HTMLElement>('[data-target]');
    if (link) return track(`share/${id}/${link.dataset.target}`);
    const copy = target.closest<HTMLElement>('[data-copy-link]');
    if (copy) {
      const label = copy.innerHTML;
      try {
        await navigator.clipboard.writeText(url);
        copy.innerHTML = `${icon('check')} Link copied`;
        track(`share/${id}/link`);
      } catch {
        copy.textContent = 'Copy blocked — select the address above';
      }
      window.setTimeout(() => (copy.innerHTML = label), 1800);
      return;
    }
    if (target.closest('[data-native]')) {
      try {
        await navigator.share({ title: `${title} — CSS 3D Lab`, url });
        track(`share/${id}/native`);
      } catch {
        /* the visitor closed the system sheet */
      }
    }
  };

  if (!menu.isConnected) document.body.append(menu);
  menu.showModal();
}
