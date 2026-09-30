import type { Snippet } from './models/snippet-utils';
import { loaders } from 'virtual:snippets';

/**
 * A model's snippet, fetched on its own (vite.config.ts, snippetChunks): a page carries the
 * snippets of the models it shows and no others. Scripts read the whole map from
 * src/models/snippets.ts instead; a browser never loads that map.
 */
export async function loadSnippet(id: string): Promise<Snippet | undefined> {
  const load = loaders[id];
  return load ? (await load()).snippet : undefined;
}
