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

## 6. The payoff: what the board caught once it stopped lying

Export, run properly over all 135 for the first time: **8 failures**, seven of them Text models and
one Data, which is what a font difference looks like from a distance.

```
              on screen        in the file      worst edge
layertext    7.4 – 84.5       7.8 – 95.0          10.5%
shadowtext   9.1 – 87.6      10.2 – 95.0           7.4%
lit          9.4 – 93.7       9.7 – 100.0          6.3%
text        13.2 – 95.4      13.4 – 100.0          4.6%
wordcube     6.9 – 93.1       6.8 – 96.7            3.5%
activity    12.2 – 88.1      12.2 – 90.4            2.4%
```

Left edge matches, right edge runs further in the file. Three of them reach `100.0` — ink touching
the edge of the exported picture, which is text cut off.

## 7. Being wrong in public, twice, and what it cost

**The first diagnosis was wrong, and I shipped it.** I read those numbers as: the file is drawn in
the embedded font, the dialog's canvas is drawn in this machine's font, so make the canvas use the
embedded one too. That is a clean story and it is not what was happening.

It cost eleven Stages failures to buy eight Export passes. `check-stages` measures the model on
every surface the site shows it on, including the export dialog, and the "fix" made the dialog
disagree with the page by 11 vmin — visible, on screen, when you open a dialog. Two checks now
wanted opposite things, and I had picked a side without reading the other one.

Four tests to find out it was not what I thought:

```
remove fit()                     → still 11 vmin      not the re-fit
inject faces, no family rule     → passes             not the faces
force Inter                      → passes             the page IS already Inter
force CaptureSans                → fails              this family is not resolving
```

That last pair is the whole answer, and it took until the next morning to see it. **The capture
embedded Inter under an invented name — `CaptureSans` — and then forced that name onto every
element with `!important`.** But the captured scene already carries each element's own
`font-family`, inlined from what the browser resolved. The override threw that away and drew the
file in a family the page had never used. Removing it:

```
before   22 mismatches, 8 models, worst edge 10.5%
after    10 mismatches, 6 models, worst edge  2.7%   horizontal error gone entirely
```

And this time Stages did not move, because nothing about the preview changed.

**Progress, not regress.** In between those two, at half past midnight, the right call was to
revert my own commit and go back to a known state — eight red rather than eleven red and no
mechanism. Nothing was pushed, so none of it ever reached a visitor; the whole argument was about
what a local board said.

## 8. The bug the detour found

Chasing my own regression turned up a real one. Checked against the live site, read-only:

```
200 font/woff2   /fonts/inter-latin-400.woff2
404 text/html    /models/shadowtext/fonts/inter-latin-400.woff2   ← what the code asked for
```

`ensureCaptureFonts` resolved the font file against `document.baseURI`, and the site is built with
relative asset paths so it can live under any prefix. From a model page — **the only place the
export dialog opens from** — it asks for `fonts/` under that folder, which is nothing. The fetch
throws, the scene ships with no faces embedded, and the renderer draws with whatever it has.

Which is the `4242` bug, the one the capture fonts were added for on 2026-09-25. The fix worked
from the home page, where `baseURI` is the root, and that is where it was tried.

So: a fix that was correct, committed, deployed, believed — and had never once run in the place it
was written for. Nothing in the ledger could see it, because no check measures a model page's
network requests. It took a wrong diagnosis and four experiments to fall over it.

## 9. The same trap, twice, four hours apart

`npm run capture -- exports --defaults` with no model ids falls back to the check's own eight-model
sample. On Friday night that had already left 127 export verdicts sitting two days stale through a
week of font changes while the column read a confident 8. I fixed it in the board, wrote a long
comment about it — and then, at one in the morning, queued the overnight run from the command line
with the same flag and no ids.

```
0 mismatches in 4.1 min
capture-check: recorded 8 model result(s)
```

True of the eight it chose. Silent about the other 127. A run that quietly does a fifteenth of the
work and reports success is worse than one that fails.

Worse: `capture-check` guessed the run total by reading that same SAMPLE list out of the check's
source, so a 135-model run opened its bar claiming `8` and would have read "8/8 finished" a
fifteenth of the way through a 75-minute night. One place decided, another guessed, and they
disagreed — which is the shape of nearly every bug in these notes.

## 10. A difference that cancels is not a colour

The picture check had one number, a mean **absolute** difference, and it called everything it saw a
colour. `crawl` read 7.9 levels and failed, and the file was fine: it is a near-black sky of
gradient stars about a quarter of a canvas pixel wide, drawn at five times the canvas in the file
and at one times on screen, so the two disagree about detail finer than a pixel.

The fix is a second number over the same pixels, the mean **signed** difference:

```
a real cast          every pixel moves the same way     diff 7, cast -7
detail disagreeing   pixels move both ways, cancelling  diff 7, cast -0.5
```

Verified by breaking it on purpose. Darkening every export by 4% made `shadowtext` fail at
`mean shift -8.7`, while `crawl` stayed a reading at `-1.1` — because a near-black scene darkened
source-over moves proportionally, and proportional to nothing is nothing. A rule that still fails
when you sabotage the thing it is supposed to notice is a rule; one that only ever passes is
decoration.

## 11. You cannot argue with "7.9 levels on average"

Every number in the export check is a comparison between a file and the dialog's canvas, and until
`--save` neither picture survived the run. That is fine while the numbers agree and useless the
moment they do not. "The file differs by 7.9 levels" cannot be confirmed, dismissed or argued with.

It earned itself the same day. Five models were failing on their edges by 1.5–2.7%, and I had a
tidy story about resolution ready. Then I put the two pictures side by side with a difference
blend, and `pie` said it outright: its donut was **pixel-identical**, and only its legend ghosted —
"Design 40" barely doubled, "Ship 15" clearly doubled. Error that grows along a line of text is
accumulated advance width. It was never geometry. It was the lettering, again.

## 12. The lettering that was never there, part two

The midnight fix did not work either.

Resolving the fonts against the module instead of the page was correct reasoning and a correct
sentence in the commit message. It shipped inert, for a reason that has nothing to do with the
first one: **vite rewrites `new URL(<template>, import.meta.url)`** into a lookup over a glob of
the module's own folder, keyed by the literal it saw. The built bundle shows it plainly:

```js
new URL({"./inter-latin-400.woff2": u1, ...}[`../fonts/${f.file}`], import.meta.url)
```

The map's keys are `./inter-latin-400.woff2`. Ours is `../fonts/inter-latin-400.woff2`. Every
lookup missed, `undefined` went into the URL, and the dev server handed back the home page with a
200 — the same trick as before, reached down a completely different road. Four 24,067-byte HTML
pages went into the scene as woff2 data URIs, and `catch { css = '' }` said nothing.

So the lettering has **never once** been sent. Not before the fix, not after it, not in dev, not in
the build. Two independent bugs, one symptom, a week apart, and between them a family rename, a
revert, eleven Stages failures and a whole morning of tests.

The previous section ended on: *that check could never have caught this, because the thing it
guards against says OK.* The answer is to stop reading the status and read the bytes.

```js
if (b[0] !== 0x77 || b[1] !== 0x4f || b[2] !== 0x46 || b[3] !== 0x32) throw ...   // wOF2
```

Four characters. Verified in dev and in a built preview — four faces, magic `wOF2`,
23664/24356/21168/21860 bytes, identical in both — and the live host serves those same byte counts
at `/fonts/`, so the path the fixed code asks for exists on the domain it will run on. The five
edge failures and one crash went to zero.

## 13. The fix that would have staled nothing

And it would have changed nothing on the board.

The export check's render path — the list of files that, when they change, expire a result — named
`capture-scene.ts` but not the faces that scene embeds. A fingerprint hashes a file's text, not
what it imports. So the four faces could go from HTML error pages to real fonts, every one of the
135 exported pictures could change, and not a single verdict would have gone stale. 130 green ticks
would have sat there, current, and wrong.

A woff2 is not text either, so the generator now writes each face's hash into the module it
produces, which *is* on the path. Swap a font file and every export result expires, with no code
changed anywhere.

The article's own title, proved by the fix for the thing the article is about.

## 14. Two small ones, both the same shape

A harness crash used to read `Cannot read properties of undefined (reading 'toFixed') [harness]`
and no more, which names a bug somewhere in two thousand lines. Making it print the first line of
our own code took ten minutes, and the first thing it caught was mine, from the commit before it:
`page.evaluate` awaits the promise a page function returns, so returning it read correctly — and
when the function started returning `{diff, cast}` I appended `.diff` to the promise instead of to
its value. One model of 135 reaches that branch. It had never run.

And the options that take a value were named twice — once where they are read, once in the list the
model-id filter skips over — so `--save` was added to the first and not the second. Its directory
became a model id: the check opened `/models/C:/Users/.../edge/`, waited ten seconds for a dialog
that was never coming, and blamed the harness.

Two places deciding one thing. That is nearly every bug in these notes.

## 15. Verified, and still wrong, because I verified it on one machine

The lettering fix was checked properly. Dev and a built preview both embedded four real faces, the
byte counts matched the live host, the five failing models went to zero, and the difference between
the file and the canvas dropped from thick doubled ghosting to a thin edge. That is a good day's
proof, and it was worth nothing for seven models.

Because all of it ran on one machine. The dialog's canvas and the render service were the same
Windows laptop with the same fonts installed, so `system-ui` meant Segoe UI on both sides, and
every comparison agreed. The pictures were identical because nothing was being tested.

Then Edgaras sent the production address of the render service, with the requirement in one line:
*local and the workers should be the same export results.* The same captured scene, posted to both:

```
pie     names Inter            mean diff 0.13   ink box identical
radar   names system-ui only   mean diff 2.85   right edge 87.0 → 91.0   (4.0% apart)
treemap names system-ui only   mean diff 3.20   right edge 92.3 → 100.0  (7.8%)
```

`100.0` is ink touching the frame: a label running off the exported picture. Seven chart models —
activity, candles, funnel, radar, stackbars, treemap, waterfall — name `system-ui, sans-serif` and
nothing we ship, so the embedded faces never apply to them and the renderer uses whatever the
operating system has. On Linux that is not Segoe UI.

This is the `4242` bug, the one the capture fonts were added for on the 25th, still alive on the
26th and the 27th, in seven models, while the board showed them green — and the board was not lying.
It was answering the question it was asked, on the only machine it had.

The fix is one word, thirty-six times: `Inter, system-ui, sans-serif`, the same stack the other 128
already use. The lesson is not the word. It is that a check comparing two things on one machine
cannot see a difference that only exists between machines, and will report agreement with complete
confidence.

## 16. One correct change, and three designs with nothing spare

Naming `Inter` in seven charts was right, and it broke two of them.

```
treemap   contrast   4.50  ->  4.43     the AA minimum is 4.5
candles   share      -3.3  ->  -4.25    the view contract allows 4
```

Neither had been wrong. Both had been sitting **exactly on their limit**: treemap's smallest
label at 4.50 against a 4.5 minimum, candles at -3.3 against 4. A design on its limit is not
passing, it is about to fail, and what tips it can be anything — a font a fraction lighter, a digit
a fraction narrower.

treemap's was the more interesting mechanism. A contrast ratio is between two colours and a font
cannot change it, which I said out loud before checking. It can, through the labels' own
`text-shadow`: a lighter stroke lays down less dark halo, so the pixels *behind* the words are
paler. Its roof went from 80% of the tile colour to 72% — 4.81, with room.

candles was the price labels hanging off the right edge at `left: 100%` with nothing but
`white-space: nowrap`, so their ink reached exactly as far as the text was wide. Inter's digits are
narrower, the right edge came in, the middle of the picture moved left. Their padding went from 6u
to 9u. It now reads -3.7 of 4, and 91 vmin wide of 92 — a pass, and still nothing spare, because
pushing them further clears the centring and breaches the width.

The honest lesson is not "be careful with fonts". It is that a check reports the same green for a
design with four points of margin and one with nought point nought five, and only the second one is
a bug waiting for an excuse.

## 17. The build that was never built, twice

`verify` runs four steps that judge `dist/` — share, qa, app performance, seo — and never built it.
`--no-build` has always been documented as "qa on the dist/ already there, **not a fresh build**",
which says the default is a fresh build. It was read once, used to change a printed sentence, and
nothing ever ran the build.

So it failed all seven charts on the share check, and check-media said exactly why: *"the built
page runs different model code from src/models now: dist/ is older than the model."* The check was
right. verify was the one making a claim it had not earned. Six of those seven passed the moment
they were measured against a current build.

Then I fixed it, and the fix did nothing:

```
first: npm run build — media, qa, app, seo judge dist/, not the dev server
       BUILD FAILED after 0m00s
```

`0m00s`. npm is `npm.cmd` on Windows and Node refuses to execFile a `.cmd` without a shell, so it
threw `EINVAL` before starting. Four words that read like a broken build and were a broken spawn.
The message now carries the error, because the duration was the only clue that anything was wrong.

And in between the two I made the same mistake by hand. Testing whether the font had moved candles,
I swapped the source and re-measured — twice, getting the same number both times, which looked like
proof the font was innocent. `check-media` renders `dist/`, and I had not rebuilt between the
variants. I was comparing a changed source against an unchanged build. With a build each time:
-3.3 without Inter, -4.25 with. It had never been innocent.

Three versions of one mistake inside an hour, by the check, by my fix to the check, and by me.

## 18. The spinner was always one row late

A small one, and the user found it by watching.

`capture-check` sets `current` when a check prints a model's name, which it does when it **starts**
on that model. The board read that as the model last *finished* and took the next one after it. So
the spinner sat one row below the truth, and could never land on the first model at all.

Over a check that takes five seconds a model it is wrong for a blink. Over exports, at half a
minute a model, it is wrong the whole time — which is why it was noticed there and nowhere else:
*"it doesn't start with the first, always with the second."*

The fix is to stop guessing. The run now writes `progress.doing`, the started model that has not
reported, and the board takes its word. The proof was one line of live data, `doing` and `last`
naming the same model:

```
exports  running=true  doing="treemap"  last="treemap"
```

`last` had never meant what its name said.

## Lines worth keeping

- "A hole is not less in the way than a bar." (on hiding a run bar whose row was still in the flow)
- "A measured offset wants to be applied, not animated towards."
- "One check writes one result file."
- "The one moment you most want an answer is the one where the cell had none." (a disabled run
  button was `display: none`, so hovering a cell during a run emptied it)
- Truthful over friendly, confirmed again: the page's own "Could not refresh — what you see was
  fetched under a minute ago" was correct, and correct because I had killed the board myself.
- "A run that quietly does a fifteenth of the work and reports success is worse than one that fails."
- "The faces travel; the families do not change."
- "Progress, not regress." (Edgaras, 00:40, on reverting my own commit rather than defending it)
- A fix that was correct, committed, deployed and believed, and had never once run in the place it
  was written for.
- "A 200 is not proof." (four HTML pages embedded as fonts, past a check that reads only the status)
- "A difference that cancels is local; one that moves together is a colour."
- "You cannot argue with 7.9 levels on average." (why the check now keeps the two pictures)
- A check comparing two things on one machine cannot see a difference that only exists between
  machines, and will report agreement with complete confidence.
- "Local and the workers should be the same export results." (Edgaras, and the only test that
  would have caught it)
- A design on its limit is not passing, it is about to fail. The board shows the same green for
  four points of margin and for nought point nought five.
- "BUILD FAILED after 0m00s" — the duration was the only thing saying it was a broken spawn and
  not a broken build.
- `last` had never meant what its name said.
- Three versions of one mistake inside an hour: by the check, by my fix to the check, and by me.
