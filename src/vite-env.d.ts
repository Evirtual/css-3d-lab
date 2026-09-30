/// <reference types="vite/client" />

/** The index of snippet loaders, one per model, written by snippetChunks in vite.config.ts. */
declare module 'virtual:snippets' {
  import type { Snippet } from './models/snippet-utils';
  export const loaders: Record<string, () => Promise<{ snippet: Snippet }>>;
}
