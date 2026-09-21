/** The browser has already resolved layout, hover, JS state and CSS. Keep that DOM intact;
 * Chromium paints it on the server. No CSS geometry or depth sorting is reimplemented here. */
export interface CapturedAnimation {
  target: number;
  pseudo: string | null;
  frames: Keyframe[];
  timing: EffectTiming;
  time: number;
  rate: number;
}
/** What changed since the frame before: the node's number, and its whole style. */
export type PoseChange = [number, string];
export interface CapturedScene {
  html: string;
  width: number;
  height: number;
  animations: CapturedAnimation[];
  /**
   * One entry per frame for a live take, each holding only the nodes whose style changed since
   * the frame before. A take is sampled here, at whatever rate this browser manages, and drawn
   * afterwards in one go — so the file never waits for the network between frames.
   */
  poses?: PoseChange[][];
}

/**
 * Every computed value of one element, written out as a style attribute. Animation and transition
 * properties are left out: the capture holds the pose, and the server is told the timings
 * separately, so nothing may drift on its own while a frame is taken.
 */
export function styleText(el: Element, pseudo?: string): string {
  const cs = el.ownerDocument.defaultView!.getComputedStyle(el, pseudo);
  const probe = el.ownerDocument.createElement('span').style;
  for (const name of cs) {
    // Legacy alias adds an implicit `fill`, which would paint over a hollow border-image.
    if (name.startsWith('animation') || name.startsWith('transition') || name === '-webkit-border-image') continue;
    probe.setProperty(name, cs.getPropertyValue(name));
  }
  probe.setProperty('animation', 'none');
  probe.setProperty('transition', 'none');
  probe.setProperty('caret-color', 'transparent');
  return probe.cssText;
}

/**
 * The pose of every node right now, in the same order captureScene numbered them. Nothing is
 * drawn and nothing leaves the browser: this is the cheap part of a capture, the part that can
 * run while someone is playing with the model.
 */
export function poseOf(root: Element): string[] {
  return [root, ...root.querySelectorAll('*')].map((el) => styleText(el));
}

/** Only the nodes whose style differs from the frame before. */
export function poseChange(now: string[], before: string[]): PoseChange[] {
  const out: PoseChange[] = [];
  for (let i = 0; i < now.length; i++) if (now[i] !== before[i]) out.push([i, now[i]!]);
  return out;
}

export function captureSource(stage: HTMLElement): HTMLElement {
  const frame = stage.querySelector('iframe');
  if (!frame) return stage;
  if (frame.dataset.ready !== 'true' || !frame.contentDocument?.body) throw new Error('The model is still loading. Please try again in a moment.');
  return frame.contentDocument.body;
}

export function captureScene(stage: HTMLElement, animated = false): CapturedScene {
  const root = captureSource(stage);
  const win = root.ownerDocument.defaultView!;
  const width = root.clientWidth, height = root.clientHeight;
  if (!width || !height) throw new Error('The model is not visible.');
  const nodes = [root, ...root.querySelectorAll('*')];
  const animations: CapturedAnimation[] = [];
  const rules: string[] = [];
  const escapeStyle = (s: string) => s.replace(/<\/style/gi, '<\\/style');
  const styles = styleText;
  const copy = root.cloneNode(true) as HTMLElement;
  const copies = [copy, ...copy.querySelectorAll('*')];
  // All reads happen synchronously, before any image decoding/network awaits: one pose per frame.
  nodes.forEach((el, index) => {
    const twin = copies[index]!;
    twin.setAttribute('data-capture-id', String(index));
    twin.setAttribute('style', styles(el));
    for (const attr of [...twin.attributes]) {
      if (/^on/i.test(attr.name) || ['srcdoc', 'autofocus'].includes(attr.name)) twin.removeAttribute(attr.name);
    }
    for (const pseudo of ['::before', '::after']) {
      const cs = win.getComputedStyle(el, pseudo);
      if (!['none', 'normal'].includes(cs.content)) rules.push(`[data-capture-id="${index}"]${pseudo}{${styles(el, pseudo)}}`);
    }
    if (el.tagName === 'INPUT') {
      const input = el as HTMLInputElement;
      twin.setAttribute('value', input.value);
      twin.toggleAttribute('checked', input.checked);
    }
    if (el.tagName === 'TEXTAREA') twin.textContent = (el as HTMLTextAreaElement).value;
    if (el.tagName === 'OPTION') twin.toggleAttribute('selected', (el as HTMLOptionElement).selected);
    if (el.tagName === 'CANVAS') {
      const image = root.ownerDocument.createElement('img');
      for (const attr of [...twin.attributes]) image.setAttribute(attr.name, attr.value);
      image.src = (el as HTMLCanvasElement).toDataURL();
      twin.replaceWith(image);
    }
    if (animated) for (const a of el.getAnimations()) {
      const effect = a.effect as KeyframeEffect | null;
      if (!effect || effect.target !== el) continue;
      const timing = effect.getTiming();
      // Infinity is not JSON. The transport uses -1 and restores it before creating the effect.
      if (timing.iterations === Infinity) timing.iterations = -1;
      animations.push({ target: index, pseudo: effect.pseudoElement, frames: effect.getKeyframes(), timing, time: Number(a.currentTime) || 0, rate: a.playbackRate });
    }
  });
  for (const el of copy.querySelectorAll('script,style,link,meta,base,iframe,object,embed')) el.remove();
  copy.style.cssText += `;position:relative;inset:auto;margin:0;width:${width}px;height:${height}px;min-height:0;box-sizing:border-box;border:0;border-radius:0;background:transparent;transform:none;translate:none;scale:none;zoom:1;overflow:hidden`;
  // The stage's decorative pseudo-layers are painted by the export compositor, not twice.
  rules.push('[data-capture-id="0"]::before,[data-capture-id="0"]::after{display:none!important}');
  const body = root.tagName === 'BODY' ? copy.outerHTML : `<body style="margin:0">${copy.outerHTML}</body>`;
  return { width, height, animations, html: `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><style>${escapeStyle(rules.join('\n'))}</style></head>${body}</html>` };
}
