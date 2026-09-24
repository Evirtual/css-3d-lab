# Release checklist

What must be true before `main` is pushed. A push deploys the site to GitHub Pages
(`.github/workflows/deploy.yml`), so every item here is checked on the commit that will be
pushed, not on the working tree.

Each item is one line: `- [ ] item — how to prove it`. The item never contains a dash with
spaces around it; everything after the first ` — ` is the proof. `scripts/ledger.mjs` reads this
file in that format. Tick an item (`- [x]`) only after running its proof on the commit being
pushed, and untick it when that commit changes.

Commands are for Git Bash from the repository root. "The ledger" means `docs/ledger.json`,
written by `npm run ledger`.

## Nothing is lost

- [x] The working tree is clean: every file is committed, or deliberately left out and named in the push notes — `git status --short --untracked-files=all` prints nothing
- [x] The main index matches HEAD, so a plain `git commit` cannot undo commits made with commit-tree — `git diff --cached --quiet HEAD && echo same` prints `same`
- [x] scripts/verify.mjs and scripts/check-exports.mjs are committed, with the verify entry in package.json — `git ls-files scripts/verify.mjs scripts/check-exports.mjs` prints both names and `git show HEAD:package.json | grep '"verify"'` prints the entry
- [x] The lead's queue has nothing running and its final state is committed — `npm run queue -- list` shows no running item and `git diff --quiet HEAD -- docs/ledger-queue.json && echo committed` prints `committed`
- [x] Local-only files stay local: hero-options.html, og-preview.html and harness-tmp/ (listed in .git/info/exclude) are not tracked — `git ls-files hero-options.html og-preview.html harness-tmp` prints nothing
- [x] The remote has nothing main lacks — `git fetch origin && git rev-list --count main..origin/main` prints `0` — run 2026-09-24: prints `0`, and main is 615 ahead

## The models

- [ ] The verify gate holds over all 135 models, run on an idle machine — `npm run verify` ends with `GATE HOLDS: every model held every check.` and exits 0. The gate is written for an IDLE machine: it runs one check at a time and opens at most `C3D_MAX_BROWSERS` shard browsers (default 2, the cap in scripts/browser-guard.mjs, which `--jobs N` may lower but never raise) plus as many render-service ones, and it is still hours of browser work. NOT RUN FOR THIS PUSH: an earlier run of it, before the cap, opened 57 headless browsers and the laptop had to be restarted, so it was not run again here. The same checks are green in the ledger at this commit, 135 of 135 approved, each recorded by `npm run capture` and shown per model on docs/ledger.html; that is evidence, not this proof. Run the gate itself before the push
- [x] Every model is approved in the ledger — `node -p "require('./docs/ledger.json').counts.approved"` prints `135`
- [x] The raw check records stay out of the repo and the release snapshot stands in for them — docs/checks/ is 3.4 MB of one machine's workings, so `grep -qx /docs/checks/ .gitignore && echo ignored` prints `ignored` and `git ls-files docs/checks` prints nothing; the committed stand-in is one line per model per check, so `git ls-files docs/release-snapshot.json` prints the name and `node -p "(require('fs').statSync('docs/release-snapshot.json').size/1024).toFixed(0)+' kB'"` is under 200 kB. A clone then reads "not run yet" until it captures its own checks, with the snapshot shown beside the bars as the state at the last release, never as a run of its own
- [x] The release snapshot is the state of the commit being pushed — `node scripts/release-snapshot.mjs --check` prints `the snapshot matches HEAD: taken at <hash>` and exits 0; when it does not it names every file the checks judge that changed since, and a new snapshot means re-capturing those checks, then `npm run ledger && node scripts/release-snapshot.mjs`
- [x] The ledger was built on the commit being pushed — `node -p "require('./docs/ledger.json').head"` prints the same short hash as `git rev-parse --short HEAD`
- [x] No contract result is stale or failing — `node -p "JSON.stringify(require('./docs/ledger.json').counts.checks.models)"` prints only `"pass":135`
- [x] Every model draws the same whatever box-sizing the page around it sets — `npm run capture -- boxsizing` ends with `135/135 models do not depend on outside CSS.` and exits 0; any `content-box by design` line it prints names a reason someone has read
- [x] Every model's text is readable on the dark stage and the light one — `npm run capture -- contrast` ends with `135/135 models have readable text on both stages.` and exits 0
- [x] Every model is within its performance budgets: how much it draws, its frame time while it runs, how fast its main interaction answers, and thirty of that interaction not piling elements up — `npm run capture -- perf` ends with `135/135 models are within the performance budgets.` and exits 0; the budgets and the reason for each are at the top of scripts/check-perf.mjs
- [x] No check result behind the ledger was judged under an older rule — `node -p "require('./docs/ledger.json').models.flatMap(m=>Object.values(m.checks)).filter(c=>(c.staleWhy||[]).some(w=>w.startsWith('rule changed'))).length"` prints `0`
- [x] Every model stops when paused, names its controls and can be used from the keyboard — `npm run capture -- access` ends with `135 of 135 models pass the access check (pause, names, keyboard)` and exits 0
- [x] check-stages has judged every model and found them the same everywhere — `npm run capture -- stages` ends with `135/135 models are the same everywhere`
- [x] check-motion has run over every model and every flagged strip has been looked at by a person — `npm run capture -- motion` ends with its `N/135 pass the automatic check` line, and each `LOOK AT` / `BROKE` model has a visual review in docs/reviews/ or a `Reviewed-by:` commit
- [ ] Recordings and snapshots match the dialog's canvas at every setting the dialog offers on the sample, and at the default settings on every model — both runs: the per-model defaults run over all 135, `npm run capture -- exports --defaults $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` (or `.media-tmp/runs/exports-all.sh`), prints `0 mismatches` and then `node -p "Object.values(require('./docs/checks/exports.json').models).filter(m=>m.status==='pass').length"` prints `135`; and the full matrix on the sample, `node scripts/check-exports.mjs` (no ids: its 8 sample models, every setting the dialog offers), ends with `0 mismatches`, with every 2160p row under `not testable here:` reading `the dialog shows it disabled ("The render service that draws the frames needs a paid tier…")` rather than a file — a size the dialog shows disabled is never asked for one, and the reason it prints is the chip's own tooltip
- [ ] 4K video is held back, and says so where it would be picked — on /models/cube/ with the Video tab open (a manual check in the browser, or the headless one of 2026-09-23), the Quality group still shows a fourth chip, reading `4K · coming later`, faded and unpickable, whose tooltip reads "The render service that draws the frames needs a paid tier before it can hold a 4K film; 1080p is the largest for now."; `grep -n "export const FOUR_K" src/video.ts` prints one line, `export const FOUR_K = false;`, which is the whole of what brings it back
- [ ] Every file the dialog hands out is named after its model and its settings, never "download" — on /models/cube/ with the render service running (a manual check in the browser, or the headless run of 2026-09-23 reading `download.suggestedFilename()`): Image at its defaults saves `css-3d-lab-cube-1x1-1600px.png`, Image at 16:9 / Large / PNG clear saves `css-3d-lab-cube-16x9-3200px-clear.png`, Video at 9:16 / 480p / its own loop saves `css-3d-lab-cube-9x16-480p.mp4`, and the Print tab's sheet is titled `css-3d-lab-cube`, which is the name "Save as PDF" offers; `grep -c "fileName(" src/video.ts` prints `2` (every download the dialog makes goes through src/file-name.ts)
- [ ] Snapshots match the screen — `npm run compare` prints `0 differ, 0 could not be captured` and exits 0
- [ ] Every standalone snippet runs without a script error — `node scripts/snippet-check.mjs $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` prints no `PROBLEM` line (run `npm run generate` first; .media-tmp/ must exist)
- [ ] Editing a model never remounts or moves its frame — `node scripts/preview-check.mjs` prints `PASS`
- [x] The old implementation is gone, as VIEW-CONTRACT.md "What goes with this" says it will be — `ls src/styles/models | wc -l` prints `0`, and `grep -c "@use 'models/" src/styles/main.scss` prints `0`; if it is kept for this push instead, VIEW-CONTRACT.md and the README's "Sass source" line say so

## The build

- [x] TypeScript is clean — `npx tsc --noEmit` exits 0
- [x] The build is clean — `npm run build` exits 0 and prints `generated 135 model pages, 8 group pages`
- [ ] QA on the built site finds nothing — `npm run qa` (after the build) ends with `QA: 135 demos, 0 problem(s)` (its exit code is 0 either way, so read the line)
- [ ] The built site passes the SEO check (tags, canonical, headings, JSON-LD, sitemap, robots.txt, links, page weight) — after `npm run build`, `npm run check-seo` exits 0 and prints `problems: 0`, and each `WAIVED` or `OWN-TEXT` line it prints has been fixed or accepted by the user (`npm run check-seo -- --strict` exits 0 once all are fixed)
- [x] The built gallery stays answerable over all 135 models: first load, frame times while scrolling to the bottom and back, memory, how many model frames stay mounted, long tasks and console errors — after `npm run build`, `npm run capture -- app` ends with `1/1 pages are within the app budgets.` and exits 0, and its `readings /` line is in docs/checks/app.json for the numbers behind the verdict; the budgets and the reason for each are at the top of scripts/check-app.mjs
- [ ] The social preview images are made, as the deploy workflow will make them — `npm run media` exits 0 and `ls dist/media/*.jpg | wc -l` prints `136` (135 models and home.jpg)
- [x] Every model's share preview is right: its image is the size its tags say, its title, description and headline are the model's own, and the picture is the model as the site renders it now — after `npm run build && npm run media`, `npm run capture -- media $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` ends with `135/135 share previews are right.` and the ledger's Share column is a fresh pass for all 135 (`node -p "require('./docs/ledger.json').checkList.find(c=>c.key==='media').tally.pass"` prints `135`)
- [x] The build works on the Node the workflow uses — `node -v` prints v22 (deploy.yml sets `node-version: 22`), or the build above was run on 22
- [x] The sitemap dates are regenerated and committed — `npm run generate && git status --short src/sitemap-dates.json` prints nothing
- [ ] View zoom changes the view only — on /models/cube/ (a manual check in the browser), View zoom at the max its hint names draws the model max / 70% times as big about the canvas middle in the editor view and at full screen with nothing reaching the canvas edge or the bar, keeps its value into and out of full screen, leaves the CSS tab's text and an Image export as they are at 70%, and the home dialog opens the next model at 70%; `grep -c "maker__zoom" src/view-zoom.ts` prints 1 (it wears the export slider's own classes)
- [x] The dev fallback address is not in the production bundle — `grep -rl "127.0.0.1:8787" dist/` prints nothing

## The render service

Recording, snapshots and print all need it (README, "Recording, snapshots and print").

- [x] The Worker in worker/ is deployed with the current server/render.mjs — `cd worker && npx wrangler deployments list` shows a deployment made after the last commit touching `server/render.mjs` or `worker/` (`git log -1 --format=%ci -- server/render.mjs worker/`) — redeployed 2026-09-24 03:31Z (version 30d09e76), after the last commit touching it (9d111c5, 2026-09-23 00:46)
- [x] ALLOWED_ORIGINS names the live site — `grep ALLOWED_ORIGINS worker/wrangler.jsonc` includes `https://css3dlab.edgarasneverdauskas.com`
- [x] The Worker answers the site and refuses anyone else — `curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H 'Origin: https://css3dlab.edgarasneverdauskas.com' "$VITE_CAPTURE_URL"` prints `204`, and the same with `-H 'Origin: https://example.com'` prints `403` (the failure path, so a 204 is not a fallback page) — run 2026-09-24 against the new deployment: 204 for the site, 403 for example.com
- [x] VITE_CAPTURE_URL is passed to the Pages build — `grep -n VITE_CAPTURE_URL .github/workflows/deploy.yml` finds it in the env of the `npm run build` step (on 2026-09-21 it does not: the workflow never sets it, and a production build without it says "Export service is not configured yet.")
- [x] The value the workflow reads exists in the repository settings — `gh variable list` or `gh secret list` shows `VITE_CAPTURE_URL` — `gh variable list` shows VITE_CAPTURE_URL, set 2026-09-22
- [ ] A local production build with the variable carries the endpoint — `VITE_CAPTURE_URL=<the Worker URL> npm run build && grep -rl "<the Worker host>" dist/assets` finds a file

## Docs

- [x] The README's counts are the code's — the README says 135 models, 93 Pure CSS and 42 CSS + JS; `node -p "require('./src/generated/model-ids.json').length"` prints 135 and `grep -rho "category: '[a-z]*'" src/models | sort | uniq -c` prints 93 css and 42 js
- [x] Every npm script points at a file that exists — `node -e "const s=require('./package.json').scripts;for(const[k,v]of Object.entries(s)){const f=(v.match(/node (\S+)/)||[])[1];if(f&&!require('fs').existsSync(f))console.log('missing',k,f)}"` prints nothing
- [x] The README lists every npm script and every check that is committed — `node -p "Object.keys(require('./package.json').scripts).join('\n')"` and `ls scripts/*.mjs`, each name found in README.md
- [x] Every script under scripts/ and server/ says what it does and how to run it — `for f in scripts/*.mjs server/*.mjs; do head -c 3 "$f"; echo " $f"; done` shows every file opening with `/**` or `//`
- [x] README, ADDING-MODELS.md and VIEW-CONTRACT.md were reviewed after the last change to the code they describe (a heuristic, not a proof) — `git log -1 --format=%ci -- README.md docs/ADDING-MODELS.md docs/VIEW-CONTRACT.md` is not older than `git log -1 --format=%ci -- package.json scripts/ server/ worker/ src/preview.ts src/video.ts`
- [x] VIEW-CONTRACT.md's numbers are the checks' numbers — the table under "What must hold" matches the constants at the top of scripts/check-models.mjs (`grep -n "^const [A-Z_]* = " scripts/check-models.mjs`)
- [x] The README says how to run the ledger from a fresh clone — README.md has a `## Running the ledger` section which says it is a local tool with nothing hosted, names `npm install`, `npm run dev`, `npm run capture -- <check> [ids]`, `npm run ledger`, `npm run ledger:watch` and `http://localhost:5183/docs/ledger.html`, and says that the bars read "not run yet" until checks are captured, that the committed docs/release-snapshot.json shows the last release's state, that the export check needs `npm run export` and that the browser checks need Playwright's Chromium
- [x] COMMIT-AUDIT.md is marked as a historical snapshot — `sed -n 3p docs/COMMIT-AUDIT.md` starts with `> **Historical snapshot`

## Article

Written last of everything done before the push, and never after it: the push is the claim that it all checked out, so the article has to be able to describe a list that already holds. Every count, check result and ruling in it is read from the repository, so a draft written earlier quotes numbers that are still moving.

- [ ] The project article at public/article/index.html is corrected for what the rewrite made false: the model count, how recording and snapshots are made (the render service, not the browser), anything about the old compositor or render3d — `grep -n "models\|video\|in your browser\|compositor\|render3d\|frame by frame" public/article/index.html` reviewed line by line against the README, and `git log -1 --format=%ci -- public/article/index.html` is later than the commit where the ledger first reached 135 approved
- [ ] A second article on how the view-contract rewrite was run (the contract, parallel agents reviewing each other, the ledger, the checks) is drafted from docs/ledger.json, docs/reviews/ and the commit history, only after the rewrite is complete — its first commit is later than the one where `node -p "require('./docs/ledger.json').counts.approved"` first printed 135; if it lives under public/, scripts/generate-pages.mjs is extended to put it in the sitemap (today only public/article/index.html is)

## After the push

- [ ] The deploy succeeded — `gh run list --workflow deploy.yml --limit 1` shows `completed success` for the pushed commit
- [ ] Recording works on the live site — on https://css3dlab.edgarasneverdauskas.com/models/cube/ the Video button makes a file that plays, and Image makes a picture (a manual check: no script covers the live site)
