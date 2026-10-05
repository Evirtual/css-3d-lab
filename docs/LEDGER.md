# The Ledger

A board that says what has been checked, when, and whether the answer still applies.

This project has 135 CSS 3D models. Nobody can look at 135 models on every surface, at every export
setting, in both themes, after every change — so scripts do it, and the Ledger is where their
answers live. Its one job is to never tell you something is fine when it is not, which turns out to
be harder than checking.

---

## First run

A fresh clone has no results in it. Check results, the generated model pages and `ledger.json` are
deliberately **not committed** — they are outputs, they churn on every run, and a repository full of
them would be a repository full of merge conflicts. So the board starts empty, and that is correct
rather than broken.

```bash
npm ci                 # dependencies
npm run generate       # writes src/generated, models/, groups/, embed/
npm run ledger         # reads what exists and writes docs/ledger.json
npm run board          # opens the board
npm run doctor         # can this machine run the checks at all?
```

Run `npm run doctor` first if anything surprises you. It asks every question the checks assume —
Node version, dependencies, a git repository, **a browser that can actually start**, the ports, the
optional networked parts — and when one fails it says what failed, where, and why in the words of
whatever refused. It changes nothing.

Until you run a check, every model reads "not run yet" and every column is blank. The one thing a
clone does carry is `docs/release-snapshot.json`: what the checks said at the last release, shown as
its own labelled line so it is never mistaken for a result from today.

### You do not have to read this file first

The board opens with a **Start here** panel on its first visit, and that panel is the same answers
this section gives — read from the machine rather than from documentation, which can be out of date
about your computer in a way a reading cannot.

It shows what `npm run doctor` found, one row per question, in three parts: **what** failed,
**where**, and **why** in the words of whatever refused, with the command that fixes it beside it.
If no doctor has ever run, it says exactly that and offers the run — because *nobody has asked* is
not the same answer as *nothing is wrong*, and the board will not show you a clean panel it has no
grounds for.

Under it is a six-stop **tour** with Back and Next, which walks the board itself: what it is
claiming, what each column counts, where to run things, what a tick means, and whether any of it is
current. A stop whose element is not on the page that day is skipped rather than pointed at.

The button hides itself once the doctor has found nothing and you have taken the tour, the same rule
every other header button follows: a control with nothing to say does not take a place in the row.

---

## What you are looking at

**The columns** are the eleven checks that judge every model one at a time — box sizing, text
contrast, keyboard access, the share image, performance, the view contract, motion, stages, exports,
plus the whole app and its SEO. A column reads `135/135` when every model passed it.

The check's key and the column's label are not always the same word: the step is run as `models` and
the column says **Contract**; `contrast` is **Text**; `media` is **Share**. Every gate line prints
both, so the terminal and the table agree.

**Approved** is not a check. It is the column that says a person looked at the model and was happy
with it. No script can set it.

**The release checklist** is the lines that have to hold before a push. One line is about the
documents themselves: each is held to the code it describes (the README to which scripts exist,
LEDGER.md to the ledger scripts, ADDING-MODELS.md and VIEW-CONTRACT.md to the checks), and every
script, command or path the five name has to exist. A change to the Worker asks for no document;
a change to a check asks for the two that describe checks. Each one is answered by a
proof — something that looked, or a run whose recorded answer is read back — and nobody ticks
it. The one exception is the sign-off, which is a person saying to push.

Whether a line is green, which stage is shut and whether a push is allowed are decided once, when
the ledger is built (`scripts/push-gate.mjs`). The page draws that verdict; `npm run signoff`
refuses the tick by it; the pre-push hook refuses the push by it.

---

## How a line is judged

Every checklist line gets one of three answers, and the board treats them differently:

| answer | meaning | what the board does |
| --- | --- | --- |
| `true` | something ran and it held | ticks the line, whatever the file says |
| `false` | something ran and it did not hold | unticks it, whatever the file says |
| `not evaluated` | nothing could answer it from here | leaves the tick exactly as it was |

That third one matters. A proof that **cannot run** is not the same as a proof that **failed**, and
treating them alike either deletes real verifications or invents ones that never happened. When a
line says "not evaluated" it also says what would answer it, and usually the command.

One line is deliberately a person's: the decision to publish. `npm run signoff -- push` writes
it at the end of that line with the date, the commit and the name git is configured with, and
refuses while anything before the push is open. Commit `docs/RELEASE-CHECKLIST.md` **last**, and
nothing after it: the sign-off is about the commit it was given at, and a commit that lands after
it — even a fix to a document — retires it, so the deploy would refuse. Say it again if that
happens; it is one command.

---

## When a result stops being true

A result is not a fact about the project. It is a fact about **the code it judged**, on **the day it
ran**. So every result records a fingerprint: a hash of the files whose contents decide its answer.
Later, the board recomputes that hash. Same hash, the answer still stands. Different hash, something
it judged has changed and the line says so:

```
compare-capture passed at 852904e, but 50 file(s) it depends on
have changed since (e644270 → 71b0c19): run it again
```

`scripts/fingerprint.mjs` holds the render paths for the per-model checks; `scripts/gate-paths.mjs`
holds them for the gate's steps. The point of naming files rather than watching commits is that a
commit is a fact about the repository, not about the check. Editing this file is a commit; no check
reads it. Before fingerprints, a typo in the README retired a four-hour run and six checklist lines
with it.

Results also record **which browser** produced them, for the same reason. Several checks are
calibrated against a measured number, and a number measured on one browser cannot be compared with
one measured on another.

And they record **the rule they were judged under**: each check in `scripts/checks-registry.mjs`
has a `ruleVersion`, bumped whenever what the check holds a model to changes, with the history
beside it. A result judged under an older version reads "rule changed (v3 → v4)" and stops
counting, so a pass under the old rule never stands in for the new one. On 2026-09-30 the contract
check went to v4 (ARIA-only controls are clicked), the text check to v3 (a text on a face that
can turn away is read from its own pixels), and every model was judged again under both; the SEO
check went to v3 the same day (a model page is weighed with the snippet it fetches, and the
budget re-measured once every snippet became its own chunk: 154 KB a model page, 151 KB the home
page, from 314 and 319 when a page carried every snippet).

---

## Everything runs from the board

Every process this project has is startable from **Run** in the header — the gate, the per-model
checks, the live-site check, the renderer comparison, the export matrix, the doctor. None of it
needs a terminal, and anything this machine cannot do is greyed out with the reason rather than
offered as a button that throws.

A release is two of those jobs with the sign-off between them. **Prepare the release**
(`scripts/release-prepare.mjs`) runs what the push is waiting for — the same list the dialog shows
under "What the push needs" — then the jobs that close a line, then the snapshot; it commits the
two records a run regenerates (the snapshot, the sitemap dates) and stops at the first thing that
does not hold, or at the sign-off, which it never ticks. **After the push**
(`scripts/release-after.mjs`) waits for the deploy of HEAD, builds here the same way, and asks the
served site. Between them: `npm run signoff -- push`, commit the checklist last, `git push`.

### Choosing gate steps

The gate is eighteen steps and about four hours. Running all of them to refresh one is the cost the
whole fingerprint record exists to avoid, so the dialog lists them with checkboxes, adds up what
your choice costs, and says of each step whether its recorded result is still about the code on
disk:

| state | what it means |
| --- | --- |
| **current** | the files it judges are unchanged since it ran |
| **stale** | those files have changed — and it names the ones that moved |
| **failed** | it failed the last time it ran |
| **not known** | its result predates fingerprints, so it *cannot be shown* to be about this code |

"Not known" is deliberately not "current". The dialog opens with the first of these already
chosen, and says above the list how many lines of the checklist are open, what closes them and
what it costs:

- **What the push needs** — the steps that close a line of the checklist that is open now, and
  nothing else: a step whose result is current is not asked for again, even when the line it
  answers is open for another reason. A change to the documents or to the board's own page asks
  for no model check.
- **Only what is stale** — the steps the board can show need running.
- **Anything not proved current** — those, plus everything it cannot vouch for.

### While something is running

A check reports per-model, so its bar fills. A **job** does not — it is not a check, and nothing
writes per-model progress for one — so its bar carries elapsed time against the job's recorded
estimate, labelled as the estimate it is, and says "longer than usual" once it passes it by half.
What a run prints is kept: `.media-tmp/runs/output/<what>.log`, one file per runnable, rewritten
by its next run. Under each job in the Run dialog is how its last run ended -- held, or the exit code
-- and **what it printed**, the tail of that file, so a failure can be read without running it again
in a terminal. There is no percentage shown for a job because there is no honest one to show. The elapsed time
ticks every second from when the job started: it used to be drawn only when the data changed, and
a job changes no data while it runs, so it read "2 min" over a job eight minutes in.

Two runs cannot overwrite each other's progress: a run started from a terminal will not clear the
record of one the board started and is still watching.

A job the board starts builds the way the deploy does. The board's own process builds the ledger
through a Vite dev server, which leaves `NODE_ENV=development` set in that process; a job does
not inherit it, and the gate's build and After the push's build pin `production` besides. Before
that (2026-10-01) a build inside a job was a development build, and the live check said, rightly,
that the served site was not the build in dist/.

---

## Running the checks

**From the board.** Each check has a run button, per model or for all of them. The board owns the
runs, so what you start there reports back in place.

**The gate**, which is everything:

```bash
npm run verify                             # 18 steps, about four hours on an idle machine
npm run verify -- --step qa,snippets       # just those, merged into the record
npm run verify -- --fast                   # the cheap ones
npm run verify -- cube dice                # only these models
```

A partial run updates the steps it ran and leaves the rest of the record exactly as it was, because
each step's result stands on its own fingerprint. The build comes first when a step needs dist/;
if it fails, the four steps that judge dist/ (media, qa, app, seo) are recorded as "not run: the
build failed, so dist/ is not this code" rather than judged over whatever older dist/ is there,
and the steps that do not read dist/ still run. Seventeen minutes to refresh five steps, rather
than four and a half hours to refresh one.

**What each step costs**, roughly, on an idle machine: `exports` 70 min, `stages` 55, `motion` 40,
`perf` and `models` 15 each, `access` and `media` 10, `boxsizing` 8, `contrast` 5, `compare` 5,
`snippets` 4, `qa` 2, `looks` 1.5, and `remote`, `preview`, `parity`, `app`, `seo` in seconds.

Three steps are 80% of the four hours. If you are waiting, you are waiting for `exports`.

---

## The parts that need something outside this machine

### When a check could not ask, it does not answer

Some checks depend on somebody else: the Worker that draws exports has a daily budget, the remote
has to be reachable, a browser has to start. A run that is refused has learned nothing, and the
important thing is that it does not pretend otherwise.

So a failure that is the *service refusing the request* — an HTTP 4xx or 5xx, a browser that would
not launch, a scene that never drew — is not recorded as a verdict. Whatever was measured before
stands, and the run says it could not ask.

This is not theoretical. On 2026-09-29 the Worker answered `HTTP 429: out of exports for today — it
resets tomorrow`, and because two backslashes had been eaten out of the pattern that recognises
those refusals, the board recorded `ok: false` over a good measurement and reported that the two
renderers **disagreed** — about pixels the Worker had declined to draw. A false red costs exactly
what a false green costs: it is the board lying about its own evidence.

If you see **Both renderers** sitting at not-measured, check whether the export budget is spent
before assuming anything is broken. It resets daily, and since 2026-10-05 it can be read instead of
guessed: `node scripts/export-budget.mjs` (the README's "The export budget" says what it counts).

| what | needs | if it is missing |
| --- | --- | --- |
| `check-remote` | the network, `gh` | three checklist lines say so |
| `check-parity -- --render` | the deployed Worker's daily export budget | it answers `429` and says it resets tomorrow (00:00 UTC) |
| the Worker's deployment date | `wrangler` signed in | one line says so |
| `check-live` | a deploy to have happened | the four "after the push" lines |

None of them block anything else, and each says which one it is rather than failing vaguely.

---

## Why the machine gets loud

The browser-driven checks render with SwiftShader — software rendering, no GPU. That is deliberate:
these checks compare pixels, and a real GPU draws differently on different machines, so your laptop,
CI and the Cloudflare Worker would each produce slightly different pictures and every comparison
would drift. Determinism is bought with CPU, and one headless browser will use most of the cores it
can reach for hours.

`C3D_MAX_BROWSERS` (default 2) caps how many run at once.

---

## If something looks wrong

Run `npm run doctor` first. Then, in order of how often it is the answer:

**A check failed but nothing is broken.** Look at what it measured, not just the verdict. A stopwatch
held by a busy machine measures the machine: `check-perf` reads frame times, and a model that
measures 25 ms on an idle laptop can measure 42 ms while a gate is running. The board records free
memory per step so you can see it.

**A browser will not start.** On Windows, Smart App Control blocks unsigned binaries and Playwright's
Chromium is unsigned. `browser.mjs` falls back to a signed browser the machine already trusts — Brave,
Chrome or Edge — and says so. `C3D_BROWSER` chooses one by name or by path.

**A service is answering with old code.** Anything on `127.0.0.1:8787` is reused as it stands, and a
service left running from last week renders with last week's code. The checks say which service they
used for exactly this reason. `npm run now` lists what is listening.

**The board looks quiet while something is running.** It is not. A gate run reports itself as a chip
in the header, with the step it is on, because the steps that record nothing per model change nothing
for the board to read.
