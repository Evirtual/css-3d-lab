/**
 * What a file is called once the visitor has it.
 *
 * Everything the site hands out — a video, a picture, a printed sheet — is named after the model
 * it shows and the settings that made it, so a downloads folder full of them can be read at a
 * glance and two exports of the same model never land on each other. There are no counters: the
 * settings are in the name, so two files that differ have different names already, and a file
 * made twice at the same settings is the same file.
 */

/** A model id as it can go in a filename: lowercase, letters and digits, single dashes between. */
export function slug(id: string): string {
  return (
    id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'model'
  );
}

/**
 * `css-3d-lab-<id>-<setting>-<setting>.<extension>` — e.g. css-3d-lab-cube-9x16-1080p.mp4.
 * Parts that are false, null or empty are left out, so a caller can write `clear() && 'clear'`.
 */
export function fileName(id: string, extension: string, ...parts: (string | false | null | undefined)[]): string {
  return [`css-3d-lab-${slug(id)}`, ...parts.filter((p): p is string => Boolean(p))].join('-') + `.${extension}`;
}

/** A shape as a filename says it: 9:16 becomes 9x16, and "auto" stays as it is. */
export function shapeTag(ratio: string): string {
  return ratio.replace(':', 'x');
}
