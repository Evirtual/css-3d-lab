/**
 * "Hold hover": a switch on the large stage that keeps a model in its hover look without the
 * mouse, so it can be looked at (and printed) that way. Shown only for models whose CSS reacts to
 * :hover (the page sets data-hoverable on the .stage-wrap).
 *
 * How: every model rule with :hover gets a twin in which :hover reads `:is(.is-held *)`, so the
 * rule also applies inside a stage-wrap marked .is-held (same specificity as :hover, and placed
 * right after the original, so it wins exactly where hover would). The print does the same to
 * the snippet's own CSS (printDoc).
 */

/** The stage's hold switches: Pause (animated models) and Hold hover / Hold tap (hover models). */
export const holdHoverHtml = (): string =>
  `<div class="stage__holds"><button type="button" class="stage__hold stage__hold--freeze" data-freeze aria-pressed="false" title="Stop this model on the pose it is in now (it prints like this too)"><span class="stage__tick" aria-hidden="true"></span>Pause</button><button type="button" class="stage__hold" data-hold-hover aria-pressed="false" title="Keep the hover or tap look on (it prints like this too)"><span class="stage__tick" aria-hidden="true"></span><span class="on-mouse">Hold hover</span><span class="on-touch">Hold tap</span></button></div>`;

/** Which switches a model gets, from its CSS: written on the .stage-wrap for the CSS to show them. */
export function markHolds(stage: Element | null, css: string): void {
  const wrap = stage?.closest<HTMLElement>('.stage-wrap');
  if (!wrap) return;
  wrap.toggleAttribute('data-hoverable', css.includes(':hover'));
  wrap.toggleAttribute('data-animated', /animation(-name)?s*:/.test(css));
  // a new model (or a new version of it) starts moving and un-held
  wrap.classList.remove('is-held', 'is-frozen');
  for (const b of wrap.querySelectorAll('[data-hold-hover], [data-freeze]')) b.setAttribute('aria-pressed', 'false');
}

/** The animations running on a stage: in the page, or in the frame of an edited version. */
function stageAnimations(wrap: HTMLElement): Animation[] {
  const stage = wrap.querySelector<HTMLElement>('.stage');
  if (!stage) return [];
  const doc = stage.querySelector('iframe')?.contentDocument;
  return doc ? doc.getAnimations() : stage.getAnimations({ subtree: true });
}

let patched = false;
function patchSheets(): void {
  if (patched) return;
  patched = true;
  const twin = (list: CSSRuleList, owner: CSSStyleSheet | CSSGroupingRule): void => {
    for (let i = list.length - 1; i >= 0; i--) {
      const rule = list[i];
      if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover') && rule.selectorText.includes('.d-')) {
        try {
          owner.insertRule(`${rule.selectorText.replace(/:hover/g, ':is(.is-held *)')} { ${rule.style.cssText} }`, i + 1);
        } catch {
          /* a selector this browser cannot re-read: that rule simply is not held */
        }
      } else if (rule instanceof CSSGroupingRule) twin(rule.cssRules, rule);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      twin(sheet.cssRules, sheet);
    } catch {
      /* a cross-origin sheet (fonts): nothing of ours in it */
    }
  }
}

/** Is this stage held in its hover look? */
export const isHeld = (stage: Element | null): boolean => Boolean(stage?.closest('.stage-wrap')?.classList.contains('is-held'));

document.addEventListener('click', (e) => {
  const freeze = (e.target as HTMLElement).closest<HTMLElement>('[data-freeze]');
  const fwrap = freeze?.closest<HTMLElement>('.stage-wrap');
  if (freeze && fwrap) {
    const on = fwrap.classList.toggle('is-frozen');
    freeze.setAttribute('aria-pressed', String(on));
    for (const a of stageAnimations(fwrap)) {
      if (on) a.pause();
      else a.play();
    }
    return;
  }
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-hold-hover]');
  const wrap = btn?.closest<HTMLElement>('.stage-wrap');
  if (!btn || !wrap) return;
  patchSheets();
  const on = wrap.classList.toggle('is-held');
  btn.setAttribute('aria-pressed', String(on));
});
