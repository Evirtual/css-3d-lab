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
}

export const CATEGORY_LABEL: Record<Category, string> = {
  css: 'Pure CSS',
  js: 'CSS + JS',
};
