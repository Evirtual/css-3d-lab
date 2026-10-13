/**
 * Which models the export matrix (every shape, size, quality, format and slider stop) still owes a
 * run, and whether what it proved about the export pipeline still stands.
 *
 * WHY THIS EXISTS. The matrix ran on a fixed sample of eight models, and its record was stale the
 * moment ANY model changed, since its fingerprint covered all of src/models. So a fix to one model
 * re-ran forty minutes of exports over eight models nobody had touched, and the model that did
 * change was never exported at every setting at all (2026-10-13).
 *
 * WHAT IT HOLDS NOW. Two things, kept apart:
 *  - THE PIPELINE: the dialog, what records, what draws the file (scripts/gate-paths.mjs, `matrix`).
 *    A run over the whole SAMPLE proves it, and leaves in docs/checks/matrix.json, beside its
 *    fingerprint, every model's snippet fingerprint at that moment: the baseline.
 *  - EACH MODEL: a model whose snippet is not what it was in the baseline (changed, or added since)
 *    owes a run of its own at every setting, recorded in docs/checks/matrix-models.json against the
 *    snippet it ran on. A model that has not changed since the pipeline was proven is covered by
 *    that run, exactly as every model was by the sample before.
 * The snippet fingerprint is scripts/fingerprint.mjs' resolved one, so data a model reads from
 * another file (a chart's JSON) counts as the model changing.
 *
 * So: pipeline changed, or no baseline yet → the sample runs (with any model already owed);
 * otherwise only the models owed run, and none when nothing changed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stepFingerprint } from './gate-paths.mjs';

export const SAMPLE = ['candles', 'dice', 'paycard', 'cube', 'browser', 'coverflow', 'switch', 'starfield'];
export const MATRIX_FILE = ['docs', 'checks', 'matrix.json'];
export const MODELS_FILE = ['docs', 'checks', 'matrix-models.json'];

const read = (root, parts) => { try { return JSON.parse(readFileSync(join(root, ...parts), 'utf8')); } catch { return null; } };

/**
 * `now` is fingerprint.mjs' fingerprintsNow() result ({ models: { id: { snippet } } }).
 * Returns { pipeline, why, owed, failed, toRun, run }.
 */
export function matrixScope(root, now) {
  const run = read(root, MATRIX_FILE);
  const per = read(root, MODELS_FILE)?.models ?? {};
  const snip = (id) => now?.models?.[id]?.snippet ?? null;
  const ids = Object.keys(now?.models ?? {});
  const fpNow = stepFingerprint('matrix');
  let pipeline = true, why = null;
  if (!run) { pipeline = false; why = 'the sample has never been run at every setting'; }
  else if (!run.sources) { pipeline = false; why = 'the last run at every setting kept no baseline of the models (it predates per-model matrix records)'; }
  else if (!run.ok) { pipeline = false; why = `the sample found ${(run.mismatches ?? []).length} mismatch(es) at every setting`; }
  else if (!run.fp?.hash || !fpNow || run.fp.hash !== fpNow.hash || (run.fp.pathsHash && run.fp.pathsHash !== fpNow.pathsHash)) { pipeline = false; why = 'the export pipeline has changed since the sample ran at every setting'; }
  // owed: changed since the baseline (or new), and no passing run of its own on the snippet it has now
  const owed = run?.sources ? ids.filter((id) => run.sources[id] !== snip(id) && !(per[id]?.ok && per[id].snippet === snip(id))) : [];
  const failed = owed.filter((id) => per[id] && per[id].snippet === snip(id) && !per[id].ok);
  const toRun = pipeline ? owed : [...new Set([...SAMPLE, ...owed])];
  return { pipeline, why, owed, failed, toRun, run };
}
