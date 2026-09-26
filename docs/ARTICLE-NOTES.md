# Raw material for the ledger article

Not the article. The things that actually happened, written down while they were fresh, with the
numbers attached — so the article can be written from evidence rather than from memory of it.

Covers 2026-09-25 → 2026-09-26. Roughly a refactor of the board, and the refactor is the story:
the ledger only started catching real product bugs once it stopped disagreeing with itself.

---

## 1. Two systems that both claimed to know

The board (`scripts/ledger-server.mjs`) holds the processes. The gate (`scripts/verify.mjs`) is
what a release runs. They ran the same checks and had drifted apart in three places, and every
drift showed up as a confident wrong number on screen.

**Share said 134 failures.** Every one read `no image: dist/media/<id>.jpg does not exist`. A
true statement about a folder nobody had built. `verify.mjs` ran `generate-media` first; the
board didn't, and the board is what the buttons drive. The same check gave two answers depending
on where it was started from. After the prepare step moved into `checks-registry.mjs` and both
read it: 135/135.

**The Export button would have asked for days of work.** Without `--defaults` it runs the whole
settings matrix — about 38 minutes for *one* model. Pressing the column meant 135 of those. And
without model ids, `check-exports` falls back to its own eight-model sample and reports that as
the lot. That is how 127 export verdicts came to sit two days stale through a week of font
changes — the one thing exports judge — while the column read a confident 8.

**Buttons that looked pressable and were not.** The page blocked a check only where two runs
named some of the same models; the board refused any second run of a check at all. The board was
right, and the reason is in `capture-check.mjs`: it reads its result file once at the start and
writes it back whole with its own models merged in. Two runs of one check do not divide the work.
The later write wins the file entire, from a snapshot taken before the earlier one finished.

The shape of all three: *two places implementing one rule, and only one of them was ever read.*

## 2. Rules that stopped being right without stopping applying

The recurring bug of the two days, three times in different clothes.

**`@keyframes ckspin`, deleted by a tidy-up.** A pass removed 77 dead CSS rules, and "dead" was
decided by asking whether anything on the page matched the selector. A keyframes block has no
selector to match, so it went. Three rules carried on animating with a name that no longer
existed — which is not an error in CSS. An unknown animation name is simply no animation. The
spinner stopped spinning and nothing anywhere said so, for a day.

**`--head-off`.** The table header used to tuck away on the way down; that was removed when every
heading grew a button (a control you must scroll up to find is one you cannot find). The variable
stayed, and every sticky offset in a 2,900-line stylesheet went on adding a term that was always
nought.

**`transition: top 0.2s`.** Written for that same tuck. Once the tuck was gone it had nothing to
smooth — until a measured height started changing every few seconds, and then it animated the
measurement noise: the group heading spent its life in transit between two offsets, drifting
behind the run bar instead of sitting under it.

## 3. Percentages measured against boxes sized by their contents

Three separate bugs, one cause, and I diagnosed it three times before naming it.

- play icons rendered **1.9 × 0.9px** (`width: 46%` of a grid track sized by the icon)
- the run spinner rendered **4 × 4px** (`width: 100%`, same shape)
- the waiting ring **11.5px inside a 20px circle** — my own fix for the previous two, in ems,
  which avoided the fault instead of removing it

The real answer was the track, not the percentage: these controls have an explicit width, so a
track told to be 100% of that box is a real length.

## 4. Four sums of the same stack

Four things pin under the filter bar — search, column headings, run bar, group heading — and each
carried its own hand-written total of the ones above it, in two media queries, with a `34px` guess
where a measurement hadn't arrived yet. That is how the group heading came to be told to stand
exactly where the run bar already was. One sum now, each line adding one term to the line above.

The phone case is worth a paragraph of its own: below 760px the table stops being a table, so a
sticky cell's containing block becomes its own row — a box the height of itself, with nowhere to
travel. Both pinned rows were still `position: sticky`, still carrying correct offsets, and both
simply scrolled away.

## 5. What the ledger is for, decided out loud

> "this ledger is what the machine can detect and confirm by itself; human favour is not part of
> this ledger. human only does shipping" — later: "we have 2 items that human does: ship and
> article"

Reviews left the board entirely. A flag is now *reported, not gated*: `check-motion` raises 27 of
them, they say true things a machine cannot settle (`hover button#1 "Violet": changes nothing on
screen`), re-running never clears one, and they hold no model back. And the expiry rule — a
verdict dies when the thing it judged changes — was extended to the checklist's own ticks, which
were sitting green over a push that had already happened.

## 6. The payoff, and the best moment

Once the board stopped lying, it caught things it had never been able to see. Export, run properly
over all 135 for the first time: **8 failures**, and six of them one cause.

```
              on screen        in the file      worst edge
layertext    7.4 – 84.5       7.8 – 95.0          10.5%
shadowtext   9.1 – 87.6      10.2 – 95.0           7.4%
lit          9.4 – 93.7       9.7 – 100.0          6.3%
text        13.2 – 95.4      13.4 – 100.0          4.6%
wordcube     6.9 – 93.1       6.8 – 96.7            3.5%
activity    12.2 – 88.1      12.2 – 90.4            2.4%
```

Left edge matches, right edge runs further in the file: left-aligned text in a wider font. The
scene sent to the renderer forces Inter onto everything (because before that the worker's Linux
browser had neither Segoe UI nor Consolas and `4242` ran off the payment card on the live site) —
but the dialog's frame is the real stage, still drawing in this machine's fonts. Two different
pictures, and the one you could see was the one that was not going to be delivered. Three of them
reach `100.0`: ink touching the file's right edge, which is text cut off in the exported picture.

**Then the ending.** Fixing it meant touching `src/video.ts` and `src/capture-scene.ts` — both
fingerprinted by every model's export verdict. One commit took the board from

```
126 approved,   9 to check
```

to

```
  0 approved, 135 to check
```

Nothing broke. The board simply stopped claiming to know something it no longer knew. A score that
can only go up is a score that isn't measuring anything.

## Lines worth keeping

- "A hole is not less in the way than a bar." (on hiding a run bar whose row was still in the flow)
- "A measured offset wants to be applied, not animated towards."
- "One check writes one result file."
- "The one moment you most want an answer is the one where the cell had none." (a disabled run
  button was `display: none`, so hovering a cell during a run emptied it)
- Truthful over friendly, confirmed again: the page's own "Could not refresh — what you see was
  fetched under a minute ago" was correct, and correct because I had killed the board myself.
