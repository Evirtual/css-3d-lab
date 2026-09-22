export type Category = 'css' | 'js';

/**
 * A model's gallery entry: what the site says about it. What it draws is its snippet (the
 * `html`, `css` and `js` of its entry in the snippet maps, src/models/snippets.ts).
 */
export interface Demo {
  /** Also the snippet's key and the page address: models/<id>/ */
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  /** Key CSS properties / tricks the effect relies on. */
  technique: string[];
  /**
   * Only for a model that is content-box by its own design and draws differently when a page makes
   * every box border-box: `'content-box by design: <why>'`. scripts/check-boxsizing.mjs reads it,
   * prints it on the model's line, and fails a model that carries it but draws the same either way
   * (docs/VIEW-CONTRACT.md, "No reliance on outside CSS").
   */
  boxSizing?: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  css: 'Pure CSS',
  js: 'CSS + JS',
};
