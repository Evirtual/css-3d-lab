export type Category = 'css' | 'js';

export interface Demo {
  /** Also the SCSS partial name: src/styles/models/_<id>.scss */
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  /** Key CSS properties / tricks the effect relies on. */
  technique: string[];
  /** Markup. `{{uid}}` is replaced per mount so form groups never collide. */
  html: string;
  /** Scene fills the whole stage instead of being centred and scaled. */
  fill?: boolean;
  /** JS demos only. Returns a cleanup function. */
  init?: (scene: HTMLElement, stage: HTMLElement) => (() => void) | void;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  css: 'Pure CSS',
  js: 'CSS + JS',
};
