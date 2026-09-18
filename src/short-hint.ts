import { icon } from './icons';

/**
 * A short tab in a tall code window is mostly empty space. Instead of collapsing the window
 * (the layout would jump on every tab switch), say that this really is everything, and point at
 * the tab where the work happens. Returns '' when the code is long enough to stand on its own.
 */
export const SHORT_LINES = 12;

export function shortHint(key: string, lineCount: number, others: Record<string, number>): string {
  if (lineCount > SHORT_LINES) return '';

  const go = (pane: string, label: string): string =>
    `<button type="button" class="code-hint__go" data-pane="${pane}">${label} ${icon('arrow-right')}</button>`;

  let text: string;
  let action: string;
  if (key === 'html' && others.css) {
    text = 'That is all the markup. The effect lives in the CSS.';
    action = go('css', `See the CSS · ${others.css} lines`);
  } else if (key === 'js' && others.css) {
    text = 'That is all the JavaScript: it only feeds values in. CSS does the rendering.';
    action = go('css', `See the CSS · ${others.css} lines`);
  } else {
    text = 'Short, and complete. Nothing is hidden.';
    action = go('run', 'Watch it run');
  }
  return `<div class="code-hint"><p>${text}</p>${action}</div>`;
}
