# Audit of the 27 unpushed commits

Compared freshly fetched `origin/main` (`b1d49c2`) with local `main` (`db7b098`).
The remote has no commits missing locally; local main is 27 commits ahead.
This is a history and scope audit, not a certification that every new feature works.

## Size of the final change

The committed diff affects 74 files: 48 added, 22 modified, and 4 deleted.
It adds 14,779 lines and removes 1,101: **13,678 net additional lines**.
These are text lines, including comments and data, not executable statements.

| Area | Files | Added | Removed | Net |
| --- | ---: | ---: | ---: | ---: |
| New model implementations, snippets, styles | 43 | 10,732 | 0 | +10,732 |
| Capture engines: record.ts, render3d.ts | 2 | 1,636 | 0 | +1,636 |
| Modal controller and shared layout stylesheet | 2 | 1,473 | 29 | +1,444 |
| Capture diagnostic scripts | 2 | 278 | 0 | +278 |
| Integration, dependencies, docs, other | 20 | 272 | 59 | +213 |
| Sitemap date metadata | 1 | 388 | 288 | +100 |
| Removed pre-rendered video pipeline | 4 | 0 | 725 | -725 |
| Total | 74 | 14,779 | 1,101 | +13,678 |

The new-model category accounts for about 78% of the net line increase. Its 25 models
are introduced in batches M–Q. This is mostly requested product content, not capture code.

Tracked repository file content grows from 4,028,423 to 4,538,128 bytes (+509,705).
TypeScript and Sass under `src` grow from 1,521,977 to 2,035,124 bytes (+513,147,
approximately 34%). These are uncompressed source sizes, **not production download sizes**.

Summing all individual commits yields 17,309 inserted and 3,631 deleted lines. That includes
intermediate edits subsequently changed again. Use the final diff above for what would ship.

## The new models to preserve

| Batch | Models |
| --- | --- |
| M | Mobius band, dodecahedron, gears, spring, Newton's cradle |
| N | Gamepad, ticket, shopping bag, lamp, wallet |
| O | Marquee, outline text, knob, slider, fanning FAB |
| P | Calendar, stories, folding loader, pulse, mountains |
| Q | Desk, rain, bubbles chart, donut chart, Sankey chart |

Their code consists of gallery markup/initializers, independent copy-paste snippets, Sass,
and registration/sizing changes. The existing two-implementation pattern makes this larger
and permits the editable snippet to diverge from the gallery model.

## All 27 commits, oldest first

| Commit | What it changes | Treatment in the planned fix |
| --- | --- | --- |
| d2f467d | Coffee/thanks message after downloads and printing; model-page integration | Preserve |
| aa55851 | Click all six radio-cube faces while making pre-rendered reels | Its target script was later removed; no surviving generator to keep |
| 28f41d1 | Pre-rendered transparent animated WebP stickers and download UI | Much of this pipeline was subsequently replaced; do not restore wholesale |
| 84e42fc | Warn that edited-model videos are pre-filmed; add batch scaffolding | Preserve model registration; old warning belongs to replaced export flow |
| d6d9ee3 | Introduce local runtime video capture and WebCodecs | Replace rendering; assess encoder/muxer reuse |
| 9a298df | Video modal with background progress and download state | Preserve user-facing functionality |
| d247299 | Batch O models | Preserve |
| 3d5951d | Batch N models | Preserve |
| 3f3c881 | PNG snapshot button, video preview UI, remove pre-rendered video pipeline | Preserve UI; replace capture implementation |
| 113e9d8 | Batch P models | Preserve |
| 72391cb | Batch M models | Preserve |
| 469049f | Batch Q models and chart implementations | Preserve |
| bdcb097 | Capture pose, CSS/font handling, cropping, depth sorting | Replace obsolete reconstruction logic |
| 8bbd4bd | Combined video/image/print preview and fill slider | Preserve current surviving UI behavior |
| 96a7fe9 | Combined modal using the live model | Preserve modal; audit state transfer |
| a75c482 | Capture hover, focus, active state | Preserve requirement; replace mechanism as needed |
| bd1000a | Maker reliability and edited-model capture changes | Audit individually; mixes UI and capture concerns |
| 08a7b28 | Move stage into maker instead of rebuilding | Preserve intent; iframe movement needs explicit handling |
| ccf9ee9 | Use stage as export frame | Preserve framing contract |
| 1f644b8 | Keep model visible during recording | Preserve behavior |
| e3aafdc | Transparent-video capability messaging and print the preview | Preserve honest capability checks and preview printing |
| 9bef888 | Keep edited-version notice out of maker | Preserve |
| bffdc4b | Honor requested image aspect ratio | Preserve |
| 97dfa60 | Opaque back-face culling and pseudo-element depth workaround | Retire with reconstruction renderer |
| d08f69c | Add custom WebGL CSS renderer | Retire after replacement is verified |
| 5a26069 | Computed-style textures and screenshot comparison tooling | Retire texture renderer; adapt useful comparison tests |
| db7b098 | Edited iframe fitting and late-close guard | Replace fitting; preserve close-race protection |

## Findings that affect the decision

1. **The editing architecture problem predates these commits.** `origin/main` already mounts
   the gallery implementation initially, then replaces it with a new snippet iframe after
   every edit. The baseline cube snippet already uses a 120px side while the gallery uses 96px.
   Reverting the 27 commits would not solve the implementation switch or iframe restarts.

2. **The deployed baseline has a simpler export promise.** Its video button downloads an
   existing GitHub release asset. It does not generate a video from the visitor's current edits
   and pose. These commits replace that with a much harder runtime capture feature.

3. **The removable renderer is a bounded part of the growth.** `render3d.ts` is 753 lines;
   `record.ts` is 883. The latter also includes useful types, sizing, backdrop, WebCodecs and
   muxing code. Removing all 1,636 lines blindly would remove functionality we want to retain.

4. **UI and implementation changes are interleaved.** `video.ts` is 809 additions/16 removals;
   `_layout.scss` is 664 additions/13 removals. Reverting capture-labelled commits wholesale
   can remove the modal, controls, print integration, or race-condition fixes.

5. **The old pre-rendered pipeline is removed.** Deleted files are `scripts/generate-reels.mjs`,
   `scripts/publish-reels.mjs`, `scripts/verify-reels.mjs`, and `src/reels.json`. The corresponding
   deploy verification step is removed. This diff does not itself delete existing GitHub release assets.

6. **Iframe access changed.** `allow-same-origin` was added alongside `allow-scripts` to support
   capture. This allows parent access but is not strong isolation for arbitrary edited scripts.
   The future preview/export contract should make the intended trust boundary explicit.

7. **Current comparison evidence is limited.** The earlier four-model capture comparison passed
   the existing thresholds for dice, Rubik, and city; cube failed (mean luminance difference 6.4).
   This does not establish all-model, edited-state, video, or cross-browser correctness.

## Uncommitted work, excluded from the counts above

- Pre-existing `src/live-edit.ts`: 1 inserted / 1 deleted line, removing the size argument.
- Pre-existing `src/models/snippet-utils.ts`: 50 inserted / 5 deleted lines, replacing the fit
  algorithm with sampled animation bounds. These were already present when this task started.
- Assistant draft `src/preview.ts`: new, untracked, not imported or wired into the app. Implementation
  was paused at the user's request. It is not a completed fix and should not be shipped as one.

## Recommendation

Keep the new models and current modal, and replace the capture engine and preview lifecycle
selectively. Do not reset to `origin/main` or blindly revert all 27 commits. Preserve the known-good
deployed revision as a reference and review the replacement before pushing. No commits were
pushed, reset, reverted, or rewritten during this audit.
