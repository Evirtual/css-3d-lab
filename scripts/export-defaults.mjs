/**
 * The export dialog's DEFAULT settings, in one place for the two scripts that must agree on them:
 * scripts/check-exports.mjs makes exactly these under --defaults, and scripts/capture-check.mjs
 * counts a model's export as checked only on its mismatches about these (isDefault).
 *
 * The settings are src/video.ts fresh(): an image at 1:1, 1600 px, PNG; a video at 9:16, 1080p,
 * MP4, a loop; the slider at 70%, which is the canvas as it opens and needs nothing made, and the
 * PNG format check is its 800 px PNG, so a --defaults row is the same measurement as the full
 * matrix's row of the same name.
 *
 * Drift is the one row the per-model run films differently, for its own length: two seconds of the
 * held model, filmed live at 480p at the video's shape, which must come back as 60 frames of the
 * same picture. The full-length drift — the model's whole turn as a loop, decoded frame by frame —
 * takes minutes a model and stays on the sample run.
 *
 *   import { DEFAULTS, isDefault } from './export-defaults.mjs';
 *
 * Nothing runs on import.
 */
export const DEFAULTS = {
  image: { shape: '1:1', size: 1600, picture: 'png' },
  video: { shape: '9:16', quality: 1080 },
  drift: { shape: '9:16', quality: 480 },
  formats: { image: ['png'], size: 800 },
  fill: 70,
};

/** The same, in words, for docs/checks/exports.json and the ledger. */
export const DEFAULTS_TEXT = {
  image: `${DEFAULTS.image.shape} at ${DEFAULTS.image.size} px, ${DEFAULTS.image.picture.toUpperCase()}`,
  video: `${DEFAULTS.video.shape} at ${DEFAULTS.video.quality}p, MP4, a loop`,
  fill: `${DEFAULTS.fill}%`,
};

/** check-exports' mismatch labels (`MISMATCH <check> <what>`) that are about the default settings. */
export const DEFAULT_LABELS = {
  run: null, // a tab that could not be run at all: always about the defaults too
  dims: [`image ${DEFAULTS.image.shape} canvas`, `image ${DEFAULTS.image.shape} ${DEFAULTS.image.size}`, `video ${DEFAULTS.video.shape} ${DEFAULTS.video.quality}p`],
  // the drift take's first frame: filmed live in the per-model run, as a loop in the full matrix
  picture: [`image ${DEFAULTS.image.shape} ${DEFAULTS.image.size}`, `video ${DEFAULTS.video.shape} ${DEFAULTS.video.quality}p`, `video ${DEFAULTS.drift.shape} live frame 0`, `video ${DEFAULTS.drift.shape} loop frame 0`],
  detail: [`image ${DEFAULTS.image.shape} ${DEFAULTS.image.size}`],
  drift: [DEFAULTS.drift.shape],
  formats: [...DEFAULTS.formats.image],
};

/** Whether a mismatch `{ check, what }` is about the default settings. */
export const isDefault = (x) => Object.hasOwn(DEFAULT_LABELS, x.check) && (DEFAULT_LABELS[x.check] === null || DEFAULT_LABELS[x.check].includes(x.what));
