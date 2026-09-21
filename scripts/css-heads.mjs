/**
 * The hover and focus targets a model's CSS names: for every selector with :hover, or with :focus,
 * :focus-visible or :focus-within, the part in front of it. check-access and check-motion both
 * read targets this way, so they agree on what a model's hover and focus targets are. Not run on
 * its own.
 *
 *   .key:hover .cap                       names .key (hover)
 *   .key:is(:hover, :focus-visible) .cap  names .key, for hover and for focus alike
 *   .row:not(:hover), .row:has(:hover)    name no target: nothing there is hovered itself
 *
 * Comments, @-rules and keyframe steps are skipped. A head that ends in a combinator (a bare
 * `:hover`, or `.a > :hover`) names no single element and is left out.
 */
export function cssHeads(css) {
  const text = String(css ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const heads = { hover: new Set(), focus: new Set() };
  for (const m of text.matchAll(/([^{}]+)\{/g)) {
    const rule = m[1].trim();
    if (!rule || rule.startsWith('@') || /^(from|to|[\d.]+%)/.test(rule)) continue;
    // split the selector list on commas that are not inside parentheses
    for (const s of rule.split(/,(?![^(]*\))/)) {
      for (const [kind, re] of [['hover', /:hover/], ['focus', /:focus(-visible|-within)?/]]) {
        const at = s.search(re);
        if (at < 0) continue;
        let head = s.slice(0, at);
        // inside a group: .slot:is(:hover, :focus-visible) names .slot; :not(:hover) and
        // :has(:hover) name no hover target
        const open = head.lastIndexOf('(');
        if (open > head.lastIndexOf(')')) {
          if (/:(not|has)$/.test(head.slice(0, open))) continue;
          head = head.slice(0, open).replace(/:(is|where)$/, '');
        }
        head = head.trim();
        if (head && !/[\s>+~(,]$/.test(head)) heads[kind].add(head);
      }
    }
  }
  return { hover: [...heads.hover], focus: [...heads.focus] };
}
