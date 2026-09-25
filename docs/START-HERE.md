# Start here

You have cloned CSS 3D Lab. This page is the map: what it is, what you get, how to run it, and
where to go depending on what you want to do with it.

Everything else in `docs/` goes deep on one subject. This page goes shallow on all of them, in the
order a new person actually needs them.

---

## What this is

**A gallery of 135 CSS 3D models, each one copy-pasteable, and a system that proves all 135 behave
identically everywhere they appear.**

The gallery is the visible half. The interesting half is the second one, because a model in this
project has to look right in **seven places**: a gallery card, the viewer, its own page, the code
editor, the big stage, full screen, and the video or picture you download. 135 models × 7 places is
945 chances to be wrong, and no one has time to look at 945 things by hand.

So the project is built around three ideas, and they are worth understanding before you change
anything:

1. **A contract, not a measurement.** [`VIEW-CONTRACT.md`](VIEW-CONTRACT.md) says what a model must
   satisfy — fill 40–70% of the canvas, stay inside 92% of its width, sit centred within 4vmin —
   and says nothing about how. A model meets it however it likes. This is the rule that stopped the
   project from bending good designs to fit a ruler.
2. **Checks that judge a picture, not an intention.** Nine checks run over every model and two more
   over the site. They open a real browser, take a real screenshot and measure it. A check that
   crashed or never ran is neither a pass nor a fail — it is named, counted apart, and it blocks.
3. **A ledger that counts honestly.** The ledger is a local page that says, per model, which checks
   have passed *on the code as it stands now*. When the code a check judged changes, that check's
   result expires and says so. A tick is a claim; only a proof run on your machine counts as proven.

If you take one thing from this repository, take the third. Most of the hard-won lessons here are
about a number that has to add up, and a result that has to expire.

---

## What you get, and what you do not

| | |
|---|---|
| **You get** | every model's code, the site, the checks, the ledger page, the docs, and `docs/release-snapshot.json` — one line per model per check from the last release |
| **You do not get** | `docs/checks/` — the raw run records. They are gitignored: megabytes of one machine's workings, and **someone else's run is not your result** |
| **You do not get** | a filled-in lead's record. `docs/ledger-queue.json` ships empty on purpose — it is a working board for *your* work, not a log of the last person's |

So on a fresh clone the ledger reads **"not run yet"** for every bar and puts all 135 models under
"To check". That is correct, not a fault. Bars fill in as *you* capture checks.

Beside each empty bar sits a dashed pill — *"at the last release"* — which is the committed
snapshot. It is shown so you can see what the checks said when they last ran, and it is **never
counted as a run of yours**: it moves no bar and approves no model.

---

## Run it

Node 22 and npm. It runs the same on macOS, Linux and Windows.

```bash
npm install
npx playwright install chromium   # only if you want to run the browser checks
npm run dev                       # the gallery, on http://localhost:5183
```

That is the whole app. Open the port it prints and you have the gallery.

### Run the ledger

The ledger is a **local tool**. Nothing about it is hosted — no account, no service, no shared
database. The page is `docs/ledger.html` in this repository and the numbers on it are whatever your
machine has measured.

```bash
npm run dev                       # leave this running
npm run capture -- contrast       # run one check and record it
npm run ledger                    # rebuild docs/ledger.json from what has been recorded
```

Then open **<http://localhost:5183/docs/ledger.html>**.

Two more worth having in their own terminals:

```bash
npm run ledger:watch              # rebuild whenever something it reads changes
npm run now -- --watch            # what is actually running, MEASURED
```

`npm run now` is the counterpart to the lead's record on the page. The record is **reported** — it
knows only what a script told it. `now` asks the machine: which check is on which model, whether
the ports answer, how far a run has got, how much memory is left. It only reads.

> **PowerShell:** npm ships three launchers and PowerShell picks `npm.ps1`, which a `Restricted`
> execution policy refuses to load. Use `npm.cmd run ...`, or call node directly
> (`node scripts/now.mjs --watch`). Git Bash, cmd, macOS and Linux are unaffected. Nothing here
> needs your execution policy changed.

---

## What do you want to do?

### …add a model

Read [`ADDING-MODELS.md`](ADDING-MODELS.md). It covers what a model is, the gallery entry, the
snippet, and — most usefully — **"Rules learned the hard way"**, which is a list of real bugs that
the checks now catch. Read that section even if you skim the rest.

The short version:

```bash
# add your model under src/models/, then:
npm run capture -- models <your-id>
npm run capture -- stages <your-id>
npm run ledger
```

### …change how models are laid out

Read [`VIEW-CONTRACT.md`](VIEW-CONTRACT.md) first, and change the contract before changing the code.
The contract is the thing the checks enforce; if you change the code without changing the contract,
the checks will simply tell you that you are wrong.

Be ready for the consequence: **tightening a rule expires every result judged under the old one.**
That is deliberate, and it means all 135 models get re-checked. On the week this project was
written, that cost one day where more lines were deleted than added.

### …work on the ledger itself

The ledger is four pieces:

| file | what it does |
|---|---|
| `scripts/ledger.mjs` | builds `docs/ledger.json` from the check records, git history and the checklist |
| `scripts/ledger-watch.mjs` | rebuilds it when anything it reads changes, and writes a heartbeat |
| `docs/ledger.html` | the page — self-contained, reads the JSON, no build step |
| `scripts/checklist-proofs.mjs` | re-runs the cheap proofs behind `RELEASE-CHECKLIST.md` |

Edit the page and reload it; edit a script and the watcher reloads its own code on the next build.
The page says which code version built the data it is showing, and warns you when they differ.

### …run everything before shipping

```bash
npm run verify                    # the gate: every check over every model
```

**Run it on an idle machine.** It is the heaviest thing here — on a 16-thread laptop the last full
run took 2 h 36 m and held 14.7 of 16 threads, because headless Chromium has no GPU and every 3D
transform of every exported frame is rasterised in software. The browser cap
(`C3D_MAX_BROWSERS`, default 2) exists because an early version with no ceiling reached 57 headless
browsers and the laptop had to be restarted.

[`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) is the list that gates a push, and the ledger draws
it with a proof beside each item.

---

## Where things are

```
src/models/       the 135 models: gallery entry + snippet, one file each
src/              the site: the viewer, the stage, the export dialog, the print sheet
server/, worker/  the render service that draws video and image frames
scripts/          the checks, the gate, the ledger, and the tools around them
  checks-registry.mjs   the one list of what a check is; the ledger and the page read it too
  browser-guard.mjs     the browser cap and the low-memory floor, with the reasons written in
docs/             this folder: the contract, the checklist, the ledger page, these docs
```

---

## A note on how this repository is written

Comments here explain **why**, not what, and many of them name a real failure. That is not
decoration: `browser-guard.mjs` opens by describing the run where the laptop fell to 0.4 GB free and
a screenshot failed outright, because that is the only way the cap's value makes sense to whoever
reads it next.

If you change something a comment explains, change the comment. If you remove a check, remove its
checklist item — and if you remove a control, **remove or rewrite the check that tested it**. Both
of those went wrong here in one week, and the second one produced two green ticks against a control
that no longer existed.

---

## Licence

Two licences — see [LICENSE](../LICENSE):

- **The snippets are MIT.** Everything the Copy and Download buttons hand out is free to use in any
  project, commercial or not.
- **Everything else is PolyForm Noncommercial 1.0.0** — the site, the render service, the checks,
  the ledger, the docs. Read it, run it, learn from it, change it for any noncommercial purpose.
  Commercial use needs written permission.

Commits up to `b1d49c2` (2026-09-19) were published under MIT alone and stay that way.
