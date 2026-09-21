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

- [ ] The working tree is clean: every file is committed, or deliberately left out and named in the push notes — `git status --short --untracked-files=all` prints nothing
- [ ] The main index matches HEAD, so a plain `git commit` cannot undo commits made with commit-tree — `git diff --cached --quiet HEAD && echo same` prints `same`
- [ ] scripts/verify.mjs and scripts/check-exports.mjs are committed, with the verify entry in package.json — `git ls-files scripts/verify.mjs scripts/check-exports.mjs` prints both names and `git show HEAD:package.json | grep '"verify"'` prints the entry
- [ ] The lead's queue has nothing running and its final state is committed — `npm run queue -- list` shows no running item and `git diff --quiet HEAD -- docs/ledger-queue.json && echo committed` prints `committed`
- [ ] Local-only files stay local: hero-options.html, og-preview.html and harness-tmp/ (listed in .git/info/exclude) are not tracked — `git ls-files hero-options.html og-preview.html harness-tmp` prints nothing
- [ ] The remote has nothing main lacks — `git fetch origin && git rev-list --count main..origin/main` prints `0`

## The models

- [ ] The verify gate holds over all 135 models — `npm run verify` ends with `GATE HOLDS: every model held every check.` and exits 0
- [ ] Every model is converted to the base unit --u in vmin — `npm run ledger` prints `135 converted` and `node -p "require('./docs/ledger.json').counts.notConverted"` prints `0`
- [ ] Every model is approved in the ledger — `node -p "require('./docs/ledger.json').counts.approved"` prints `135`
- [ ] The check results behind the ledger are published with the code, so anyone who clones the repo can rebuild it — `/docs/checks/` is no longer in .gitignore and `git ls-files docs/checks` lists models.json, stages.json, motion.json, exports.json and media.json, committed after the final full runs (docs/ledger.json itself stays ignored: it is rebuilt from these by `npm run ledger`)
- [ ] The ledger was built on the commit being pushed — `node -p "require('./docs/ledger.json').head"` prints the same short hash as `git rev-parse --short HEAD`
- [ ] No contract result is stale or failing — `node -p "JSON.stringify(require('./docs/ledger.json').counts.checks.models)"` prints only `"pass":135`
- [ ] Every model stops when paused, names its controls and can be used from the keyboard — `npm run capture -- access` ends with `135 of 135 models pass the access check (pause, names, keyboard)` and exits 0
- [ ] check-stages has judged every model and found them the same everywhere — `npm run capture -- stages` ends with `135/135 models are the same everywhere`
- [ ] check-motion has run over every model and every flagged strip has been looked at by a person — `npm run capture -- motion` ends with its `N/135 pass the automatic check` line, and each `LOOK AT` / `BROKE` model has a visual review in docs/reviews/ or a `Reviewed-by:` commit
- [ ] Recordings and snapshots match the dialog's canvas at every setting on the sample, and at the default settings on every model — both runs: the per-model defaults run over all 135, `npm run capture -- exports --defaults $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` (or `.media-tmp/runs/exports-all.sh`), prints `0 mismatches` and then `node -p "Object.values(require('./docs/checks/exports.json').models).filter(m=>m.status==='pass').length"` prints `135`; and the full matrix on the sample, `node scripts/check-exports.mjs` (no ids: its 8 sample models, every setting), ends with `0 mismatches`
- [ ] Snapshots match the screen — `npm run compare` prints `0 differ, 0 could not be captured` and exits 0
- [ ] Every standalone snippet runs without a script error — `node scripts/snippet-check.mjs $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` prints no `PROBLEM` line (run `npm run generate` first; .media-tmp/ must exist)
- [ ] Editing a model never remounts or moves its frame — `node scripts/preview-check.mjs` prints `PASS`
- [ ] The old implementation is gone, as VIEW-CONTRACT.md "What goes with this" says it will be — `ls src/styles/models | wc -l` prints `0`, and `grep -c "@use 'models/" src/styles/main.scss` prints `0`; if it is kept for this push instead, VIEW-CONTRACT.md and the README's "Sass source" line say so

## The build

- [ ] TypeScript is clean — `npx tsc --noEmit` exits 0
- [ ] The build is clean — `npm run build` exits 0 and prints `generated 135 model pages, 8 group pages`
- [ ] QA on the built site finds nothing — `npm run qa` (after the build) ends with `QA: 135 demos, 0 problem(s)` (its exit code is 0 either way, so read the line)
- [ ] The built site passes the SEO check (tags, canonical, headings, JSON-LD, sitemap, robots.txt, links, page weight) — after `npm run build`, `npm run check-seo` exits 0 and prints `problems: 0`, and each `WAIVED` or `OWN-TEXT` line it prints has been fixed or accepted by the user (`npm run check-seo -- --strict` exits 0 once all are fixed)
- [ ] The social preview images are made, as the deploy workflow will make them — `npm run media` exits 0 and `ls dist/media/*.jpg | wc -l` prints `136` (135 models and home.jpg)
- [ ] Every model's share preview is right: its image is the size its tags say, its title, description and headline are the model's own, and the picture is the model as the site renders it now — after `npm run build && npm run media`, `npm run capture -- media $(node -p "require('./src/generated/model-ids.json').map(d=>d.id).join(' ')")` ends with `135/135 share previews are right.` and the ledger's Share column is a fresh pass for all 135 (`node -p "require('./docs/ledger.json').checkList.find(c=>c.key==='media').tally.pass"` prints `135`)
- [ ] The build works on the Node the workflow uses — `node -v` prints v22 (deploy.yml sets `node-version: 22`), or the build above was run on 22
- [ ] The sitemap dates are regenerated and committed — `npm run generate && git status --short src/sitemap-dates.json` prints nothing
- [ ] The dev fallback address is not in the production bundle — `grep -rl "127.0.0.1:8787" dist/` prints nothing

## The render service

Recording, snapshots and print all need it (README, "Recording, snapshots and print").

- [ ] The Worker in worker/ is deployed with the current server/render.mjs — `cd worker && npx wrangler deployments list` shows a deployment made after the last commit touching `server/render.mjs` or `worker/` (`git log -1 --format=%ci -- server/render.mjs worker/`)
- [ ] ALLOWED_ORIGINS names the live site — `grep ALLOWED_ORIGINS worker/wrangler.jsonc` includes `https://css3dlab.edgarasneverdauskas.com`
- [ ] The Worker answers the site and refuses anyone else — `curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H 'Origin: https://css3dlab.edgarasneverdauskas.com' "$VITE_CAPTURE_URL"` prints `204`, and the same with `-H 'Origin: https://example.com'` prints `403` (the failure path, so a 204 is not a fallback page)
- [ ] VITE_CAPTURE_URL is passed to the Pages build — `grep -n VITE_CAPTURE_URL .github/workflows/deploy.yml` finds it in the env of the `npm run build` step (on 2026-09-21 it does not: the workflow never sets it, and a production build without it says "Export service is not configured yet.")
- [ ] The value the workflow reads exists in the repository settings — `gh variable list` or `gh secret list` shows `VITE_CAPTURE_URL`
- [ ] A local production build with the variable carries the endpoint — `VITE_CAPTURE_URL=<the Worker URL> npm run build && grep -rl "<the Worker host>" dist/assets` finds a file

## Docs

- [ ] The README's counts are the code's — the README says 135 models, 93 Pure CSS and 42 CSS + JS; `node -p "require('./src/generated/model-ids.json').length"` prints 135 and `grep -rho "category: '[a-z]*'" src/models | sort | uniq -c` prints 93 css and 42 js
- [ ] Every npm script points at a file that exists — `node -e "const s=require('./package.json').scripts;for(const[k,v]of Object.entries(s)){const f=(v.match(/node (\S+)/)||[])[1];if(f&&!require('fs').existsSync(f))console.log('missing',k,f)}"` prints nothing
- [ ] The README lists every npm script and every check that is committed — `node -p "Object.keys(require('./package.json').scripts).join('\n')"` and `ls scripts/*.mjs`, each name found in README.md
- [ ] Every script under scripts/ and server/ says what it does and how to run it — `for f in scripts/*.mjs server/*.mjs; do head -c 3 "$f"; echo " $f"; done` shows every file opening with `/**` or `//`
- [ ] README, ADDING-MODELS.md and VIEW-CONTRACT.md were reviewed after the last change to the code they describe (a heuristic, not a proof) — `git log -1 --format=%ci -- README.md docs/ADDING-MODELS.md docs/VIEW-CONTRACT.md` is not older than `git log -1 --format=%ci -- package.json scripts/ server/ worker/ src/preview.ts src/video.ts`
- [ ] VIEW-CONTRACT.md's numbers are the checks' numbers — the table under "What must hold" matches the constants at the top of scripts/check-models.mjs (`sed -n 29,36p scripts/check-models.mjs`)
- [ ] COMMIT-AUDIT.md is marked as a historical snapshot — `sed -n 3p docs/COMMIT-AUDIT.md` starts with `> **Historical snapshot`

## Article

- [ ] The project article at public/article/index.html is corrected for what the rewrite made false: the model count, how recording and snapshots are made (the render service, not the browser), anything about the old compositor or render3d — `grep -n "models\|video\|in your browser\|compositor\|render3d\|frame by frame" public/article/index.html` reviewed line by line against the README, and `git log -1 --format=%ci -- public/article/index.html` is later than the commit where the ledger first reached 135 approved
- [ ] A second article on how the view-contract rewrite was run (the contract, parallel agents reviewing each other, the ledger, the checks) is drafted from docs/ledger.json, docs/reviews/ and the commit history, only after the rewrite is complete — its first commit is later than the one where `node -p "require('./docs/ledger.json').counts.approved"` first printed 135; if it lives under public/, scripts/generate-pages.mjs is extended to put it in the sitemap (today only public/article/index.html is)

## After the push

- [ ] The deploy succeeded — `gh run list --workflow deploy.yml --limit 1` shows `completed success` for the pushed commit
- [ ] Recording works on the live site — on https://css3dlab.edgarasneverdauskas.com/models/cube/ the Video button makes a file that plays, and Image makes a picture (a manual check: no script covers the live site)
