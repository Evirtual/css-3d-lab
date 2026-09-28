//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region src/icons.ts
/**
* The app's one icon set: 24×24 outline icons, 2px round stroke, coloured by `currentColor`.
* Size comes from CSS (`.icon`), so every icon in the app is the same size by construction.
*
* Why SVG instead of text glyphs (‹ › ✕ ▶ ☀): a glyph sits on the font's baseline and every font
* draws it at a different height and weight, so it never centres reliably in a button, and some
* systems swap it for a colour emoji. An SVG is a box: centring it is exact.
*
* Path data follows the Lucide icon set (ISC licence, https://lucide.dev).
*/
var PATHS = {
	"chevron-left": "<path d=\"m15 18-6-6 6-6\"/>",
	"chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
	"chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
	"arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
	"arrow-up-right": "<path d=\"M7 7h10v10\"/><path d=\"M7 17 17 7\"/>",
	hand: "<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\"/><path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\"/><path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\"/><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\"/>",
	pointer: "<path d=\"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z\"/>",
	move: "<path d=\"M12 2v20\"/><path d=\"m15 19-3 3-3-3\"/><path d=\"m19 9 3 3-3 3\"/><path d=\"M2 12h20\"/><path d=\"m5 9-3 3 3 3\"/><path d=\"m9 5 3-3 3 3\"/>",
	click: "<path d=\"M14 4.1 12 6\"/><path d=\"m5.1 8-2.9-.8\"/><path d=\"m6 12-1.9 2\"/><path d=\"M7.2 2.2 8 5.1\"/><path d=\"M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z\"/>",
	mouse: "<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"7\"/><path d=\"M12 6v4\"/>",
	printer: "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>",
	image: "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/>",
	film: "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M7 3v18M17 3v18M3 7.5h4M17 7.5h4M3 12h18M3 16.5h4M17 16.5h4\"/>",
	download: "<path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/>",
	more: "<circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/><circle cx=\"5\" cy=\"12\" r=\"1\"/>",
	hash: "<line x1=\"4\" x2=\"20\" y1=\"9\" y2=\"9\"/><line x1=\"4\" x2=\"20\" y1=\"15\" y2=\"15\"/><line x1=\"10\" x2=\"8\" y1=\"3\" y2=\"21\"/><line x1=\"16\" x2=\"14\" y1=\"3\" y2=\"21\"/>",
	x: "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
	check: "<path d=\"M20 6 9 17l-5-5\"/>",
	search: "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>",
	copy: "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>",
	play: "<polygon points=\"6 3 20 12 6 21 6 3\"/>",
	pause: "<rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/><rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/>",
	stop: "<rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\"/>",
	alert: "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
	checklist: "<path d=\"m3 17 2 2 4-4\"/><path d=\"m3 7 2 2 4-4\"/><path d=\"M13 6h8\"/><path d=\"M13 12h8\"/><path d=\"M13 18h8\"/>",
	info: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>",
	note: "<path d=\"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l5-5V5a2 2 0 0 0-2-2z\"/><path d=\"M15 21v-5a1 1 0 0 1 1-1h5\"/>",
	book: "<path d=\"M12 7v14\"/><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"/>",
	sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>",
	moon: "<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>",
	maximize: "<path d=\"M8 3H5a2 2 0 0 0-2 2v3\"/><path d=\"M21 8V5a2 2 0 0 0-2-2h-3\"/><path d=\"M3 16v3a2 2 0 0 0 2 2h3\"/><path d=\"M16 21h3a2 2 0 0 0 2-2v-3\"/>",
	minimize: "<path d=\"M8 3v3a2 2 0 0 1-2 2H3\"/><path d=\"M21 8h-3a2 2 0 0 1-2-2V3\"/><path d=\"M3 16h3a2 2 0 0 1 2 2v3\"/><path d=\"M16 21v-3a2 2 0 0 1 2-2h3\"/>",
	mail: "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>",
	share: "<circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><path d=\"m8.59 13.51 6.83 3.98\"/><path d=\"m15.41 6.51-6.82 3.98\"/>",
	coffee: "<path d=\"M10 2v2\"/><path d=\"M14 2v2\"/><path d=\"M6 2v2\"/><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"/>"
};
/** Inline SVG markup. Decorative by default: the control it sits in carries the label. */
function icon(name) {
	return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
//#endregion
//#region src/ledger/main.ts
(() => {
	"use strict";
	const $ = (id) => document.getElementById(id);
	const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[c]);
	const STATUS = [{
		key: "to check",
		short: "To check",
		long: "to check: an automated check is not cleared",
		cls: "s-conv",
		color: "var(--st-conv)"
	}, {
		key: "approved",
		short: "Approved",
		long: "approved",
		cls: "s-ok",
		color: "var(--st-ok)"
	}];
	/** The overall status as one compact pill; the bucket's full name is in the tooltip. */
	const chipFor = (s, won = false) => {
		const x = STATUS.find((y) => y.key === s);
		return `<span class="chip ${x?.cls ?? "s-none"}${won ? " won" : ""}" data-tip data-tiptext="${esc(x ? `Status: ${x.long}` : s)}">${esc(x?.short ?? s)}</span>`;
	};
	/** Seconds since an ISO time, or null. */
	const age = (iso) => {
		const t = iso ? Date.parse(iso) : NaN;
		return Number.isFinite(t) ? (Date.now() - t) / 1e3 : null;
	};
	const fmtAge = (s) => {
		if (s == null) return "unknown";
		if (s < -5) return "in the future (clock skew?)";
		s = Math.max(0, s);
		if (s < 90) return `${Math.round(s)} s ago`;
		if (s < 5400) return `${Math.round(s / 60)} min ago`;
		if (s < 129600) return `${Math.round(s / 3600)} h ago`;
		return `${Math.round(s / 86400)} days ago`;
	};
	const ago = (iso) => fmtAge(age(iso));
	/** The same age, at the width a table column can spare: "18m ago", "5h ago", "2d ago". The exact
	local date and time is never dropped -- it moves into the tooltip beside the commit it belongs
	to -- so the short form is a convenience and not the only place the moment is written. */
	const fmtAgeShort = (s) => {
		if (s == null) return "unknown";
		if (s < -5) return "ahead";
		s = Math.max(0, s);
		if (s < 60) return "just now";
		if (s < 5400) return `${Math.round(s / 60)}m ago`;
		if (s < 172800) return `${Math.round(s / 3600)}h ago`;
		if (s < 5184e3) return `${Math.round(s / 86400)}d ago`;
		return `${Math.round(s / 2592e3)}mo ago`;
	};
	/** A live "N s ago": the one-second tick rewrites every [data-ago]. */
	const agoSpan = (iso) => `<span data-ago="${esc(iso ?? "")}">${esc(ago(iso))}</span>`;
	const clock = (iso) => new Date(iso).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
	const modes = [
		"auto",
		"light",
		"dark"
	];
	let mode = "auto";
	try {
		mode = localStorage.getItem("ledger-theme") || "auto";
	} catch {}
	const applyTheme = () => {
		if (mode === "auto") document.documentElement.removeAttribute("data-theme");
		else document.documentElement.setAttribute("data-theme", mode);
		$("theme").textContent = `Theme: ${mode}`;
	};
	$("theme").addEventListener("click", () => {
		mode = modes[(modes.indexOf(mode) + 1) % modes.length];
		try {
			localStorage.setItem("ledger-theme", mode);
		} catch {}
		applyTheme();
	});
	applyTheme();
	const OLD_CHECKS = [
		{
			key: "models",
			scope: "model",
			name: "contract",
			short: "Contract",
			title: "Contract check (check-models)"
		},
		{
			key: "stages",
			scope: "model",
			name: "stages",
			short: "Stages",
			title: "Same on every surface (check-stages)"
		},
		{
			key: "motion",
			scope: "model",
			name: "motion",
			short: "Motion",
			title: "Motion flags (check-motion)"
		},
		{
			key: "exports",
			scope: "model",
			name: "exports",
			short: "Export",
			title: "Export at default settings (check-exports)"
		}
	];
	let CHECK_LIST = OLD_CHECKS, CHECK_NAMES = {}, COLS = [], GATE_NAME = {};
	function syncChecks(list) {
		CHECK_LIST = Array.isArray(list) && list.length ? list : OLD_CHECKS;
		CHECK_NAMES = Object.fromEntries(CHECK_LIST.map((c) => [c.key, c.title]));
		COLS = CHECK_LIST.filter((c) => c.scope === "model").map((c) => [c.key, c.short]);
		GATE_NAME = Object.fromEntries(CHECK_LIST.map((c) => [c.key, c.name]));
	}
	syncChecks(null);
	/** Which blocks are open, remembered per visitor. Browser storage can be blocked or empty, so every touch is guarded. */
	const SS_KEY = "ledger.substeps.open";
	let ssOpen = (() => {
		try {
			return JSON.parse(localStorage.getItem(SS_KEY) ?? "{}") ?? {};
		} catch {
			return {};
		}
	})();
	const ssSave = () => {
		try {
			localStorage.setItem(SS_KEY, JSON.stringify(ssOpen));
		} catch {}
	};
	/** A run's parts start open, so what it is doing now is in sight; a check bar's start closed. */
	const ssDefault = (id) => id.startsWith("run:");
	/** Open, if this visitor has said so before; otherwise the block's own default. */
	const ssIsOpen = (id, dflt = ssDefault(id)) => typeof ssOpen?.[id] === "boolean" ? ssOpen[id] : dflt;
	const SS_STATES = [
		[
			"pass",
			"pass",
			"var(--k-pass)"
		],
		[
			"fail",
			"fail",
			"var(--k-fail)"
		],
		[
			"flag",
			"flagged",
			"var(--k-flag)"
		],
		[
			"listed",
			"listed, not failed",
			"var(--st-conv)"
		],
		[
			"skip",
			"skipped",
			"var(--k-never)"
		],
		[
			"notRecorded",
			"not recorded",
			"var(--k-broke)"
		]
	];
	const PLAY = icon("play");
	const PAUSE = icon("pause");
	const STOP = icon("stop");
	const ssChevron = "<svg viewBox=\"0 0 12 12\" width=\"9\" height=\"9\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M4.5 2 8.5 6l-4 4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
	const ssToggle = (id, label, open, iconOnly = false) => `<button type="button" class="sstog${iconOnly ? " sstog--icon" : ""}" data-ss="${esc(id)}" aria-expanded="${open}" aria-controls="ss-${esc(id)}"${iconOnly ? ` aria-label="${esc(label)}" title="${esc(label)}"` : ""}>${ssChevron}${iconOnly ? "" : esc(label)}</button>`;
	/**
	* The open panel. `c` is a checkList entry; `run` its progress record when one is going, whose
	* `steps` say what THIS run covers and whose `step` is the latest part its output named.
	* The one panel there is: "Running now" and the check bars both draw this, off the same
	* checkList entry and the same `running` record, so a check reads the same while it runs and
	* after. They differ in one thing only: a run's panel starts open, a bar's starts closed.
	*/
	function ssPanel(c, id, run) {
		const steps = c.steps ?? [];
		const file = `docs/checks/${c.key}.json`;
		const box = (inner) => `<div class="substeps" id="ss-${esc(id)}">${inner}</div>`;
		if (!steps.length) return box(`<p><b>Not listed yet.</b> ${esc(c.title)} does not say what it covers in <code>scripts/checks-registry.mjs</code>, so there is nothing to show here.</p>`);
		const t = c.stepTotals;
		const passWord = c.scope === "site" ? "no finding" : "pass";
		let head = "";
		if (run) {
			const named = run.step ? steps.find((s) => s.key === run.step) : null;
			head = named ? `<p><span class="ss__now${run.alive === false ? " ss__now--gone" : ""}">${run.alive === false ? "Stopped" : "Running now"}</span> <b>${esc(named.label)}</b> <span class="muted">· ${esc(run.stepFrom ?? "from the check's own output")}</span></p>` : `<p><span class="ss__now${run.alive === false ? " ss__now--gone" : ""}">${run.alive === false ? "Stopped" : "Running now"}</span> ${run.last ? `${c.unit === "pages" ? "page" : "model"} <code>${esc(run.last)}</code>. ` : ""}This check does not say which part it is on while it runs, so the list below is what the run covers, not where it has got to.</p>`;
		}
		if (!t) head += `<p><b>No sub-step results recorded yet.</b> <code>${esc(file)}</code> was written before the checks read their own parts back${c.captured ? "" : ", and this check has never been captured"}. The list below is what it covers; the counts appear once it runs again (or after <code>npm run capture -- ${esc(c.key)} --steps</code>, which re-reads the file without running the check).</p>`;
		const rows = steps.map((s) => {
			const mine = t?.totals?.[s.key];
			const inRun = run?.steps?.[s.key];
			const now = Boolean(run && run.step === s.key);
			const bits = [];
			if (s.implemented === false) bits.push("<span class=\"ss__none\">not implemented yet</span>");
			else if (mine) {
				if (!SS_STATES.some(([k]) => mine[k] > 0)) bits.push(`<span class="ss__none">not recorded yet</span>`);
				else bits.push(`<span class="ss__counts">${SS_STATES.filter(([k]) => mine[k] > 0).map(([k, label, col]) => `<span class="ss__c"><i style="background:${col}"></i>${esc(k === "pass" ? passWord : label)} <b>${mine[k]}</b></span>`).join("")}</span>`);
			}
			const why = [];
			for (const [reason, n] of Object.entries(mine?.skipped ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3)) why.push(`<span class="ss__why"><b>${n} skipped:</b> ${esc(reason)}</span>`);
			if (inRun && inRun.in === false) why.push(`<span class="ss__why"><b>left out of this run:</b> ${esc(inRun.why ?? "the arguments it was given do not make it")}</span>`);
			else if (inRun) why.push("<span class=\"ss__why\">in this run</span>");
			return `<li class="ss${now ? " is-now" : ""}"><div class="ss__head"><span class="ss__name">${esc(s.label)}</span>${bits.join("")}${now ? "<span class=\"ss__now\">on this now</span>" : ""}</div>
        <span class="ss__proves">${esc(s.proves ?? "")}</span>${why.length ? `<span class="ss__counts">${why.join("")}</span>` : ""}</li>`;
		}).join("");
		const loose = Object.entries(t?.unattributed ?? {});
		const foot = t ? `<footer>Over the <b>${t.entries}</b> ${c.unit === "pages" ? "page" : "model"} result${t.entries === 1 ? "" : "s"} recorded in <code>${esc(file)}</code> — every result the file holds, not only the ${esc(c.unit === "pages" ? "pages" : "models")} the bar above counts. Read from each result's own lines; a part no line speaks to is counted “not recorded”, never as a pass.${loose.length ? ` ${loose.reduce((n, x) => n + x[1], 0)} line(s) could not be placed under a part and are counted under none of them.` : ""}${c.scope === "site" ? " A rule’s “no finding” count is pages the run reported nothing under it — not proof the rule applies to each of them." : ""}</footer>` : "";
		return box(`${head}<ol>${rows}</ol>${foot}`);
	}
	/** Clicking a disclosure remembers the choice and redraws the block it belongs to. */
	document.addEventListener("click", (e) => {
		const b = e.target.closest?.("[data-ss]");
		if (!b || !L) return;
		e.stopPropagation();
		const id = b.dataset.ss;
		ssOpen[id] = !ssIsOpen(id);
		ssSave();
		redrawControls();
		document.querySelector(`[data-ss="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
	});
	/** How many table columns there are, for a row that spans them all. */
	const colCount = () => 5 + COLS.length;
	const ico = (d) => `<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
	const GLYPH = {
		tick: ico("M2.5 6.2 5 8.6 9.5 3.6"),
		cross: ico("M3.2 3.2l5.6 5.6M8.8 3.2 3.2 8.8"),
		tilde: ico("M2.2 6.6c1.2-1.6 2.4-1.6 3.8 0s2.6 1.6 3.8 0"),
		bang: ico("M6 2.6v4.2M6 9.3v.1"),
		dash: ico("M3 6h6"),
		bolt: ico("M6.8 2.2 4 6.4h4L5.2 9.8")
	};
	const MARKS = {
		pass: [GLYPH.tick, "pass"],
		cleared: [GLYPH.tick, "flags cleared"],
		stale: [GLYPH.tilde, "passed on older code"],
		flag: [GLYPH.bang, "open flags"],
		fail: [GLYPH.cross, "failed"],
		broke: [GLYPH.bolt, "didn't run (test crashed)"],
		never: [GLYPH.dash, "not run yet"]
	};
	/** What a check result reads as: its mark kind and its words. */
	function markKind(r) {
		if (!r || r.status === "never") return ["never", "not run yet"];
		if (r.status === "untested") return ["never", "not run at the default settings"];
		if (r.status === "pass") return r.stale ? ["stale", "passed on older code"] : ["pass", "pass"];
		if (r.status === "flagged" && r.openFlags === 0) return r.stale ? ["stale", "flags cleared on older code"] : ["cleared", "flags cleared"];
		if (r.status === "flagged") return ["flag", `${r.openFlags ?? "?"} open flag${r.openFlags === 1 ? "" : "s"}${r.stale ? " (older code)" : ""}`];
		if (r.status === "broke" || r.status === "error") return ["broke", `${r.status === "error" ? "didn't run (a tab could not be run)" : "didn't run (test crashed)"}${r.stale ? " (older code)" : ""}`];
		return ["fail", `${{ fail: "failed" }[r.status] ?? r.status}${r.stale ? " (older code)" : ""}`];
	}
	const markHtml = (kind, label, tipText, glyph, extra = "", style = "") => `<span class="mk mk--${kind}${extra}"${style ? ` style="${style}"` : ""} role="img" aria-label="${esc(label)}" data-tip data-tiptext="${esc(tipText)}">${glyph}</span>`;
	/** One check's mark for one model. The run in progress, if it is on this model now, pulses. */
	/**
	* Is this check being run on this model at this moment?
	*
	* The run record names the model it last wrote a result for, so the one it is working on is the
	* one after that -- but the record also says which models the run covers and which have already
	* reported, and the honest answer is "this model is in the run and has not reported yet".
	* Until it reports, the mark in its cell is the PREVIOUS verdict: true a minute ago, about to be
	* replaced, and drawn exactly like one that was just confirmed. That is the one thing this page
	* must never do, so the cell says it is being decided.
	*/
	function runStateOf(key, m) {
		const p = L.running?.[key];
		if (!isLive(key)) {
			const on = RUN_NOW.runs.find((r) => r.what === key || r.what === "all");
			if (!on) return "";
			const over = on.models ?? [];
			return !over.length || over.includes(m.id) ? "is-waiting" : "";
		}
		const ids = idsOfRun(p);
		if (ids.length && !ids.includes(m.id)) return "";
		if (doneInRun(key, p).has(m.id)) return "";
		if (p.doing) return p.doing === m.id ? "is-checking" : "is-waiting";
		const order = ids.length ? ids : L.models.map((x) => x.id);
		const at = p.last ? order.indexOf(p.last) : -1;
		const done = doneInRun(key, p);
		return order.slice(at + 1).find((id) => !done.has(id)) === m.id ? "is-checking" : "is-waiting";
	}
	function checkMark(key, m) {
		const r = m.checks[key];
		const [kind, word] = markKind(r);
		const title = CHECK_NAMES[key] ?? key;
		L.running?.[key];
		const now = runStateOf(key, m) === "is-checking";
		const starting = pendingOn(runKey(key, [m.id])) === "run";
		const when = r && r.status !== "never" ? ` Ran ${r.ranAt ? `${new Date(r.ranAt).toLocaleString()}, ${fmtAgeShort(age(r.ranAt))}` : "at an unknown time"}${r.commit ? ` at ${r.commit}` : ""}.` : " No captured run has reported this model.";
		const s = r?.status === "never" ? r.snapshot : null;
		const rel = s ? ` At the last release (commit ${L.release?.head ?? "?"}) this check said "${s.status}"${s.ranAt ? `, run ${new Date(s.ranAt).toLocaleString()}` : ""}. That is the committed snapshot (${L.release?.file ?? "docs/release-snapshot.json"}), not a run on this machine.` : "";
		const text = `${title}: ${word}.${r?.summary ? ` ${r.summary}.` : ""}${when}${rel}${r?.stale ? ` Stale: ${r.staleWhy.join("; ")}.` : ""}${now ? " Running on this model now." : ""}`;
		const secs = r && r.status !== "never" ? age(r.ranAt) : null;
		const aged = secs == null ? 0 : Math.max(0, Math.min(1, (secs - 86400) / 1123200));
		return markHtml(kind, `${title}: ${word}${s ? `, ${s.status} at the last release` : ""}${now ? ", running now" : ""}${starting ? ", starting" : ""}`, text, MARKS[kind][0], `${now ? " is-running" : ""}${starting ? " is-starting" : ""}${s ? " mk--wasrel" : ""}`, aged ? `--age:${aged.toFixed(2)}` : "");
	}
	function renderMarkLegend() {
		const items = [
			["pass", "pass"],
			["cleared", "flags cleared"],
			["stale", "passed on older code"],
			["flag", "open flags"],
			["fail", "failed"],
			["broke", "didn't run (test crashed)"],
			["never", "not run yet"]
		];
		$("marklegend").innerHTML = items.map(([k, w]) => `<span><span class="mk mk--${k}" aria-hidden="true">${MARKS[k][0]}</span>${esc(w)}</span>`).join("") + `<span><span class="mk mk--pass is-running" aria-hidden="true">${GLYPH.tick}</span>running on it now</span>`;
	}
	let L = null, W = null, wMissing = false;
	const PAGE = 40;
	let filter = "all", group = "all", tags = /* @__PURE__ */ new Set(), query = "", limit = PAGE, tagsOpen = false, blk = null;
	const open = /* @__PURE__ */ new Set();
	try {
		const s = JSON.parse(sessionStorage.getItem("ledger-view") || "{}");
		filter = s.filter || "all";
		group = s.group || "all";
		tags = new Set(s.tags || []);
		query = s.query || "";
		tagsOpen = Boolean(s.tagsOpen);
		blk = s.blk || null;
		for (const id of s.open || []) open.add(id);
		limit = Math.max(PAGE, s.limit || PAGE);
		if (tags.size) tagsOpen = true;
	} catch {}
	const saveView = () => {
		try {
			sessionStorage.setItem("ledger-view", JSON.stringify({
				filter,
				group,
				tags: [...tags],
				query,
				open: [...open],
				limit,
				tagsOpen,
				blk
			}));
		} catch {}
	};
	let prevSig = null;
	let flash = /* @__PURE__ */ new Set();
	let justApproved = /* @__PURE__ */ new Set(), wasStatus = /* @__PURE__ */ new Map();
	const GROUP_C = [
		"var(--accent)",
		"var(--accent-2)",
		"var(--good)",
		"var(--warm)",
		"var(--hot)"
	];
	const gcFor = (key) => {
		let h = 0;
		for (const ch of String(key)) h = h * 31 + ch.charCodeAt(0) >>> 0;
		return GROUP_C[h % GROUP_C.length];
	};
	const rowSig = (m) => JSON.stringify([
		m.status,
		...COLS.map(([k]) => [
			m.checks[k]?.status,
			m.checks[k]?.stale,
			m.checks[k]?.ranAt
		]),
		m.commits.length
	]);
	const KIND_SW = {
		never: "var(--k-never)",
		broke: "var(--k-broke)",
		flagged: "var(--k-flag)",
		failed: "var(--k-fail)",
		"stale-pass": "var(--k-stale)"
	};
	const KIND_SHORT = {
		never: "not run yet",
		broke: "didn't run",
		flagged: "flagged",
		failed: "failed",
		"stale-pass": "passed on older code"
	};
	const cap = (s) => String(s ?? "").charAt(0).toUpperCase() + String(s ?? "").slice(1);
	const fmtDur = (s) => s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;
	/** How long a run has left at its pace so far: an estimate; null while there is no pace to go by. */
	function etaOf(p) {
		if (!p || p.alive === false || !p.done || !p.total || p.done >= p.total) return null;
		const el = (Date.parse(p.updatedAt) - Date.parse(p.startedAt)) / 1e3;
		if (!(el > 0)) return null;
		const per = el / p.done;
		return {
			left: per * (p.total - p.done),
			per
		};
	}
	/** The model ids a run was started on (its args, flags left out), and those it has reported so far. */
	const idsOfRun = (p) => {
		const known = new Set(L.models.map((m) => m.id));
		return (p?.args ?? []).filter((a) => known.has(a));
	};
	const doneInRun = (key, p) => new Set(L.models.filter((m) => p?.runId && m.checks[key]?.runId === p.runId).map((m) => m.id));
	/** The words on the filter chip for a blocker key: "motion didn't run", "visual review stale". */
	function chipLabel(key) {
		if (key === "stale:any") return "passed on older code";
		if (String(key).startsWith("status:")) return STEP_SHORT[key.slice(7)] ?? key.slice(7);
		const [a, b, c] = String(key).split(":");
		return `${GATE_NAME[a] ?? a} ${KIND_SHORT[b] ?? b}`;
	}
	let BLK = /* @__PURE__ */ new Map();
	function blockerRows() {
		const bl = L.counts?.blockers;
		if (!Array.isArray(bl)) return null;
		for (const b of bl) BLK.set(b.key, {
			ids: new Set(b.ids),
			chip: chipLabel(b.key)
		});
		const byId = new Map(L.models.map((m) => [m.id, m]));
		const stale = bl.filter((b) => b.scope === "check" && b.kind === "stale-pass");
		const rows = bl.filter((b) => !stale.includes(b)).map((b) => ({
			key: b.key,
			b,
			scope: b.scope,
			count: b.count,
			alone: b.alone,
			ids: b.ids
		}));
		if (stale.length) {
			const ids = [...new Set(stale.flatMap((b) => b.ids))];
			const alone = ids.filter((id) => (byId.get(id)?.holds ?? []).every((h) => h.endsWith(":stale-pass"))).length;
			BLK.set("stale:any", {
				ids: new Set(ids),
				chip: chipLabel("stale:any")
			});
			rows.push({
				key: "stale:any",
				stale,
				scope: "check",
				count: ids.length,
				alone,
				ids
			});
		}
		const rank = () => 1;
		rows.sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? b.count - a.count : 0));
		return rows;
	}
	function blockerText(r) {
		if (r.key === "stale:any") return {
			title: "Passed on older code",
			sw: KIND_SW["stale-pass"],
			why: `${esc(cap(r.stale[0].means))}. By check: ${r.stale.map((s) => `${esc(GATE_NAME[s.check] ?? s.check)} ${s.count}`).join(", ")}.`,
			state: "A re-run of that check on the current code clears it."
		};
		const b = r.b;
		const short = CHECK_LIST.find((c) => c.key === b.check)?.short ?? b.check;
		const run = L.running?.[b.check];
		const reported = run ? doneInRun(b.check, run) : /* @__PURE__ */ new Set();
		const runIds = run ? new Set(idsOfRun(run).filter((id) => !reported.has(id))) : /* @__PURE__ */ new Set();
		const inRun = b.ids.filter((id) => runIds.has(id)).length;
		const e = etaOf(run);
		const runLine = !run ? "" : run.alive === false ? `A run stopped without finishing (${esc(run.done)} of ${run.total ?? "?"} reported)` : `A run is in progress: ${esc(run.done)} of ${run.total ?? "?"} done${e ? `, about ${fmtDur(e.left)} left (estimate)` : ""}`;
		let state = "";
		if (b.kind === "never") state = run && run.alive !== false ? `${runLine}; ${inRun === b.count ? "it will reach all of these" : `it will reach ${inRun} of these, not the other ${b.count - inRun}`}.` : `${run ? `${runLine}. ` : ""}No run is going that will reach them: <code>npm run capture -- ${esc(b.check)}</code> starts one.`;
		else if (b.kind === "broke") {
			const errs = /* @__PURE__ */ new Map();
			for (const id of b.ids) {
				const s = L.models.find((m) => m.id === id)?.checks[b.check]?.summary || "no error recorded";
				errs.set(s, (errs.get(s) ?? 0) + 1);
			}
			const [top, topN] = [...errs].sort((x, y) => y[1] - x[1])[0] ?? ["no error recorded", 0];
			const rerun = run && run.alive !== false && inRun ? `The run in progress will reach ${inRun} of them.` : "No re-run is in progress.";
			state = `The test's error: “${esc(top)}”${topN < b.count ? ` (${topN} of ${b.count})` : ""}. ${rerun}`;
		} else if (b.kind === "flagged") state = "Open one in the table for what it saw. A flag does not hold the model back: looking at it is a review, and reviews happen on the real product.";
		else if (b.kind === "failed") state = run && run.alive !== false && inRun ? `The run in progress will re-run ${inRun} of them. Open one in the table for what failed.` : "Open one in the table for what failed.";
		else if (b.kind === "stale-pass") state = "A re-run of the check on the current code clears it.";
		return {
			title: `${esc(short)}: ${esc(b.label)}`,
			sw: KIND_SW[b.kind] ?? "var(--k-never)",
			why: `${esc(cap(b.means))}.`,
			state
		};
	}
	const STEP_SHORT = {
		"to check": "To check",
		approved: "Approved"
	};
	const STEP_SUB = {
		"to check": "an automated check is not yet cleared",
		approved: "every check clear at once, on the code as it is now"
	};
	const STAGE_C = [
		"var(--accent)",
		"var(--hot)",
		"var(--warm)"
	];
	let stage = null;
	try {
		stage = localStorage.getItem("ledger-stage");
	} catch {}
	/** The selected stage: the remembered one if it still exists, else the first with models in it. */
	function pickStage(buckets) {
		if (!buckets.some((b) => b.key === stage)) stage = (buckets.find((b) => b.count) ?? buckets[0])?.key ?? null;
		return stage;
	}
	const wavePath = (y, h, a, up) => {
		let d = `M-240 ${y}`;
		for (let x = -240; x < 500; x += h) {
			d += ` Q${x + h / 2} ${up ? y - a : y + a} ${x + h} ${y}`;
			up = !up;
		}
		return `${d} V30 H-240 Z`;
	};
	`${wavePath(7, 60, 3.4, true)}${wavePath(11.5, 20, 2.2, false)}${wavePath(9, 30, 5, true)}${wavePath(9, 30, 5, true)}`;
	const SHAPE = {
		a: [
			18,
			10,
			"M2 5C4 1.6 10 1.6 12.6 5 10 8.4 4 8.4 2 5Z M12.6 5 17 2.3 17 7.7Z"
		],
		b: [
			14,
			8,
			"M1 4C2.6 1.3 7.4 1.3 9.5 4 7.4 6.7 2.6 6.7 1 4Z M9.5 4 13.5 1.6 13.5 6.4Z"
		],
		c: [
			22,
			9,
			"M1.5 4.5C4 1.8 12 1.8 16 4.5 12 7.2 4 7.2 1.5 4.5Z M16 4.5 21 1.8 21 7.2Z M9 2.4 10.6 0.5 12 2.6Z"
		],
		whale: [
			56,
			22,
			"M2 12.5C8 5 21 2 33 4.6 40 6.1 45 8.8 48 12.1 44 15.7 37 18.6 28 18.6 17 18.6 6 16.4 2 12.5Z M48 12.1C50.6 9.7 53 7.9 56 6.7 55 10.3 55 13.9 56 17.5 53 16.3 50.6 14.5 48 12.1Z"
		],
		dolphin: [
			48,
			18,
			"M2 10C8 4 20 2 30 3.6 37 4.8 42 7 45 10 41 13.6 34 16 26 16 16 16 6 14 2 10Z M24 3.6 27 0.5 30 4Z M45 10 48 6.6 48 13.4Z"
		]
	};
	const swimmer = (shape, cls) => {
		const [w, h, d] = SHAPE[shape];
		return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
	};
	`${swimmer("whale", "big1 swimL")}${swimmer("dolphin", "big2 swimR")}${swimmer("a", "f1 swimR")}${swimmer("b", "f2 swimL")}${swimmer("c", "f3 swimR")}${swimmer("b", "f4 swimL")}`;
	const WV = {
		vw: 1092,
		h: 128,
		cy: 100,
		amp: 18,
		per: 92,
		a: -46,
		b: 1138
	};
	const WVN = {
		vw: 384,
		h: 100,
		cy: 72,
		amp: 11,
		per: 64,
		fw: "120%",
		tv: "-16.6667%",
		a: -128,
		b: 512
	};
	function sinePath(o, amp, per, phase) {
		const half = per / 2, c = amp * 4 / 3, r = (n) => Math.round(n * 100) / 100;
		let x = o.a + (phase || 0), up = true, d = `M${r(x)} ${o.cy}`;
		while (x < o.b) {
			const s = up ? -1 : 1;
			d += ` C${r(x + per / 6)} ${r(o.cy + s * c)} ${r(x + per / 3)} ${r(o.cy + s * c)} ${r(x + half)} ${o.cy}`;
			x += half;
			up = !up;
		}
		return d;
	}
	/** How tall a stage's wave stands: that stage's share of every model, and nothing else. A stage
	holding nothing is a flat line -- empty reads as empty, and no floor lifts it off the axis, though
	the line itself carries on lit through the stage so the waveform is never broken. A stage holding
	anything stands at least at WV_MIN of the tallest, so "a few" can never read as "none"; above that
	the height is the share, straight. The number itself is the count printed on the arrow and the
	first line of its tooltip, so the picture never has to be measured. */
	const WV_MIN = .14;
	const waveAmp = (share, count, max) => count ? max * (WV_MIN + .86 * share) : 0;
	const waveLayer = (o, i, amp) => `<div class="wv w${i}" style="--wvw:${o.fw};--wvt:${o.tv}"><div class="wv__flow"><svg viewBox="0 0 ${o.vw} ${o.h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">` + [
		"h3",
		"h2",
		"h1"
	].map((c) => `<path class="${c}" d="${sinePath(o, amp, o.per, 0)}"/>`).join("") + `<path class="hm" d="${sinePath(o, amp / 3, o.per / 2, o.per / 4)}"/></svg></div></div>`;
	const WV_GATE = [[.257, .352], [.587, .679]];
	const sstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
	const dsstep = (t) => 30 * t * t * (t - 1) * (t - 1);
	/** A(x) and A'(x) down the strip: each stage's amplitude flat across its own words, eased into the
	next across the window at the gate. A stage holding nothing is 0 here -- a flat line, still lit
	and still drawn, so empty reads as empty without cutting the wave. */
	function envelope(ampsIn, vw) {
		const g = WV_GATE.map(([s, e]) => [s * vw, e * vw]);
		const amps = ampsIn.length > g.length ? ampsIn : [...ampsIn, ...Array(g.length + 1 - ampsIn.length).fill(ampsIn[ampsIn.length - 1] ?? 0)];
		return (x) => {
			for (let i = 0; i < g.length; i++) {
				const [s, e] = g[i];
				if (x <= s) return [amps[i], 0];
				if (x < e) {
					const len = e - s, t = (x - s) / len, d = amps[i + 1] - amps[i];
					return [amps[i] + d * sstep(t), d * dsstep(t) / len];
				}
			}
			return [amps[g.length], 0];
		};
	}
	/** One frame of the line: y = cy - A(x)·sin(2π(x - phase)/q), as cubic Hermite segments on an x grid
	that is FIXED -- the same x at every frame, so from one frame to the next only the heights move
	and the browser's interpolation between two frames is the wave travelling, never a drift
	sideways. Six samples a period with the exact slope at each puts the curve inside a twentieth of
	a pixel of the sine, and the whole path is two half periods wider than the strip so the round
	caps at its ends are always outside it. */
	function envPath(o, env, k, q, phase, div) {
		const w = 2 * Math.PI / q, step = q / div, n = Math.ceil((o.b - o.a) / step);
		const r = (v) => Math.round(v * 10) / 10;
		const at = (x) => {
			const [A, dA] = env(x), th = w * (x - phase), s = Math.sin(th), c = Math.cos(th);
			return [o.cy - k * A * s, -k * (dA * s + A * w * c)];
		};
		let x0 = o.a, [y0, m0] = at(x0), d = `M${r(x0)} ${r(y0)}`;
		for (let i = 1; i <= n; i++) {
			const x1 = o.a + i * step, h = step, [y1, m1] = at(x1);
			d += `C${r(x0 + h / 3)} ${r(y0 + m0 * h / 3)} ${r(x1 - h / 3)} ${r(y1 - m1 * h / 3)} ${r(x1)} ${r(y1)}`;
			x0 = x1;
			y0 = y1;
			m0 = m1;
		}
		return d;
	}
	const WV_FRAMES = 12;
	const WV_CSS = document.head.appendChild(Object.assign(document.createElement("style"), { id: "wv-frames" }));
	function waveFrames(o, amps) {
		const env = envelope(amps, o.vw), main = [], harm = [];
		for (let i = 0; i <= WV_FRAMES; i++) {
			const t = i / WV_FRAMES;
			main.push(envPath(o, env, 1, o.per, t * o.per, 6));
			harm.push(envPath(o, env, 1 / 3, o.per / 2, o.per / 4 + t * o.per / 2, 4));
		}
		const kf = (name, fr) => `@keyframes ${name}{` + fr.map((d, i) => `${Math.round(i / WV_FRAMES * 1e4) / 100}%{d:path("${d}")}`).join("") + "}";
		WV_CSS.textContent = kf("wvmain", main) + kf("wvharm", harm);
		return {
			main: main[0],
			harm: harm[0]
		};
	}
	const wvStop = (off, cls, v) => `<stop offset="${off}" class="${cls}" style="stop-color:var(${v})"/>`;
	const wvRamp = (v) => wvStop(0, "sa", v) + wvStop(WV_GATE[0][0], "sa", v) + wvStop(WV_GATE[0][1], "sb", v) + wvStop(WV_GATE[1][0], "sb", v) + wvStop(WV_GATE[1][1], "sc", v) + wvStop(1, "sc", v);
	function envLayer(o, amps, flat) {
		const f = waveFrames(o, amps);
		const gu = `gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${o.vw}" y2="0"`;
		return `<div class="wv wv--env"><svg viewBox="0 0 ${o.vw} ${o.h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="wv-core" ${gu}>${wvRamp("--core")}</linearGradient><linearGradient id="wv-halo" ${gu}>${wvRamp("--sw-halo-c")}</linearGradient></defs><g class="wv__rise" style="transform-origin:0 ${o.cy}px${flat ? ";transform:scaleY(0)" : ""}">` + [
			"h3",
			"h2",
			"h1"
		].map((c) => `<path class="${c}" d="${f.main}"/>`).join("") + `<path class="hm" d="${f.harm}"/></g></svg></div>`;
	}
	function synthScene(amps, sel, flat) {
		return `<div class="flow__scene" aria-hidden="true" data-sel="${sel}">
      <div class="sw__deck"><i></i></div><div class="sw__horizon"></div><div class="sw__sun"><i></i></div>
      <div class="sw__wave">${envLayer(WV, amps, flat)}</div></div>`;
	}
	/** One stacked arrow's own scene: the same wave at the amplitude its own share earns it, in its own
	panel and unmasked -- stacked, there is no neighbour to cross into. */
	const synthStep = (amp) => `<span class="step__wrap" aria-hidden="true"><span class="sw__deck"><i></i></span><span class="sw__horizon"></span><span class="sw__wave">${waveLayer(WVN, 1, amp)}</span></span>`;
	/** A stacked arrow's wave rises to the height its count earns it, from wherever it already stood.
	Every stroke is the same path, and the harmonic is that amplitude thirded, so one number sets all
	four. The transition on d is what makes the change a swell; where a browser does not animate d,
	the wave arrives at its height instead. */
	const rise = (root, o, i, amp) => {
		const g = root.querySelector(`.wv.w${i}`);
		if (!g) return;
		const d = sinePath(o, amp, o.per, 0), dm = sinePath(o, amp / 3, o.per / 2, o.per / 4);
		for (const p of g.querySelectorAll("path:not(.hm)")) p.setAttribute("d", d);
		for (const p of g.querySelectorAll("path.hm")) p.setAttribute("d", dm);
	};
	const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
	const shownLv = /* @__PURE__ */ new Map();
	/**
	* The strip, step by step: one per automated check, then Approved.
	*
	* It used to be the model STATES -- to check, awaiting review, approved -- and when reviewing
	* left this page that was two steps, which is not a journey. What a model actually goes through
	* is the checks, in the order the gate runs them, and the useful question at each one is how
	* many models have it clear ON THE CODE AS IT IS NOW. That is the gate's own answer, not the
	* check's raw tally: a model that passed last week and has changed since is not counted here,
	* which is the whole point of the thing.
	*
	* The last step is Approved, and it is the only one that is a state rather than a check: it is
	* every check clear at once, which is never the sum of the steps before it.
	*/
	function flowSteps(c) {
		L.models.length;
		const clear = (k) => L.models.filter((m) => {
			const c = m.checks?.[k];
			return c && c.status === "pass" && !c.stale;
		}).length;
		const steps = COLS.map(([k, short]) => ({
			key: `check:${k}`,
			check: k,
			label: short,
			count: clear(k),
			means: `${CHECK_NAMES[k] ?? k}: cleared on the code as it is now`
		}));
		const ap = L.models.filter((m) => m.status === "approved").length;
		steps.push({
			key: "approved",
			label: STEP_SHORT.approved ?? "Approved",
			count: ap,
			means: "every check clear at once, on the code as it is now"
		});
		return steps;
	}
	/** A step's own colour, spread across however many steps there are: the ramp the three stages used. */
	const stepColour = (i, n) => n <= 1 ? STAGE_C[0] : `color-mix(in oklab, var(--accent) ${Math.round(100 - 100 * i / (n - 1))}%, var(--warm))`;
	function renderStats(buckets) {
		const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
		pickStage(buckets);
		const lvs = buckets.map((b) => b.count / total);
		const selIx = Math.max(0, buckets.findIndex((b) => b.key === stage));
		const seen = buckets.map((b) => shownLv.has(b.key));
		const from = buckets.map((b, i) => seen[i] ? shownLv.get(b.key) : 0);
		const fromAmp = (o) => buckets.map((b, i) => waveAmp(from[i], seen[i] ? b.count : 0, o.amp));
		const grew = buckets.some((b, i) => !seen[i] || from[i] !== lvs[i]);
		from[0], from[Math.floor(from.length / 2)], from[from.length - 1];
		const scene = synthScene([
			lvs[0],
			lvs[Math.floor(lvs.length / 2)],
			lvs[lvs.length - 1]
		].map((lv, i) => waveAmp(lv, buckets[i]?.count ?? 0, WV.amp)), selIx, grew);
		const stepAmp = fromAmp(WVN);
		$("stats").style.setProperty("--ch3", String(lvs[lvs.length - 1] ?? 0));
		$("stats").innerHTML = scene + `<ol class="flow" aria-label="How many models each check has cleared, and how many are approved">${buckets.map((b, i) => {
			b.key;
			const pct = Math.round(b.count / total * 100);
			const name = STEP_SHORT[b.key] ?? b.label;
			const lv = b.count / total;
			const f = seen[i] ? from[i] : 0;
			const means = b.means && b.means.length <= 140 ? b.means.charAt(0).toUpperCase() + b.means.slice(1) : "";
			const rule = `${b.count} of ${total} models, ${pct}% — that share is how tall the wave stands here.` + (means ? ` ${means}.` : "");
			const inner = synthStep(stepAmp[i]);
			return `<li class="flow__li"><span id="step-rule-${i}" class="visually-hidden">${esc(rule)}</span><div id="stage-tab-${i}" class="step step--${Math.min(3, i + 1)}${b.key === "approved" ? " step--end" : ""}${b.count ? " has-work" : ""}" data-lv="${lv}" style="--lv:${f};--ch:${f};--c:${stepColour(i, buckets.length)}" role="img"
          aria-label="${esc(`${name}: ${b.count} of ${total} models, ${pct}% of the strip`)}">
        <span class="step__body" aria-hidden="true">
          ${inner}
          <span class="step__text"><span class="step__label">${esc(name)}</span><span class="step__n">${b.count}</span><span class="step__sub">${esc(STEP_SUB[b.key] ?? "")}</span></span>
        </span></div></li>`;
		}).join("")}</ol>`;
		const settle = () => {
			for (const el of $("stats").querySelectorAll(".step")) {
				const to = +el.dataset.lv, was = shownLv.get(el.id);
				el.style.setProperty("--lv", el.dataset.lv);
				el.style.setProperty("--ch", el.dataset.lv);
				shownLv.set(el.id, to);
				if (was !== to);
			}
			const g = $("stats").querySelector(".flow__scene")?.querySelector(".wv__rise");
			if (g) g.style.transform = "scaleY(1)";
			$("stats").querySelectorAll(".step").forEach((el, i) => {
				const w = el.querySelector(".step__wrap");
				if (w) rise(w, WVN, 1, waveAmp(lvs[i], buckets[i].count, WVN.amp));
			});
		};
		if (REDUCED.matches) settle();
		else requestAnimationFrame(() => requestAnimationFrame(settle));
	}
	function renderOverview() {
		const c = L.counts, n = c.models;
		const by = (k) => c.byStatus?.[k] ?? 0;
		const ap = by("approved"), cv = by("to check");
		const parts = [];
		if (cv) parts.push(`<b>${cv}</b> ${cv === 1 ? "is" : "are"} held by a check`);
		const buckets = flowSteps(c);
		const sum = buckets.reduce((s, b) => s + b.count, 0);
		const bal = c.balance ?? {
			ok: sum === n,
			sum,
			models: n,
			problems: sum === n ? [] : [`the buckets sum to ${sum}, not ${n}`]
		};
		BLK = new Map(buckets.map((b) => [`status:${b.key}`, {
			ids: new Set(L.models.filter((m) => m.status === b.key).map((m) => m.id)),
			chip: STEP_SHORT[b.key] ?? b.label
		}]));
		renderStats(buckets);
		const sumText = `${buckets.map((b) => `${b.count} ${b.label.toLowerCase()}`).join(" + ")} = ${bal.sum}, and there are ${bal.models} models`;
		if (!bal.ok) NOTES_EXTRA = `The books do not balance: ${bal.problems.map(esc).join("; ")} (${esc(sumText)}). Nothing on this page adds up until this is fixed.`;
		const rows = blockerRows();
		if (!rows) {
			$("blk-note").textContent = "";
			$("blockers").innerHTML = "<li class=\"muted\">This ledger was built before it listed what holds each model back; the list appears on the next build.</li>";
		} else {
			$("blk-note").textContent = rows.length ? `These overlap: a model held by two checks is counted under both. ${cv} model${cv === 1 ? " is" : "s are"} held by at least one check. Click one to show exactly those models in the table.` : "";
			$("blockers").innerHTML = rows.length ? rows.map((r) => {
				const t = blockerText(r);
				const on = blk === r.key;
				return `<li><button type="button" class="blk" data-blk="${esc(r.key)}" aria-pressed="${on}">
          <span class="blk__n">${r.count}</span><span class="sw" style="background:${t.sw}" aria-hidden="true"></span>
          <span class="blk__t"><b>${t.title}</b><span class="blk__why">${t.why}</span>${t.state ? `<span class="blk__state">${t.state}</span>` : ""}<span class="blk__go">${on ? "Shown in the table now · click again to show every model" : `Show ${r.count === 1 ? "it" : `these ${r.count}`} in the table`}</span></span>
          <span class="blk__alone">${r.alone} held by this alone</span></button></li>`;
			}).join("") : "<li class=\"muted\">Nothing: every model is approved.</li>";
		}
		const btn = $("blk-btn");
		btn.hidden = !rows;
		btn.innerHTML = `What’s holding models back <small>· ${n - ap}</small>`;
		btn.setAttribute("aria-label", `What’s holding models back: ${n - ap} models not approved`);
		btn.dataset.tip = "";
		btn.dataset.tiptext = `${n - ap} of ${n} models are not approved: ${cv} held by a check. Opens every reason, with counts.`;
		sortBars();
		drawNotices(Object.entries(L.running ?? {}).filter(([, p]) => p && p.alive === false));
	}
	/**
	* Every run that is still going, and where its bar belongs.
	*
	* A run is always a run OVER something: one model, one group, or everything. That thing is a row
	* of the table (or the table itself), so its progress is drawn there rather than in a panel of
	* its own somewhere above. The rule is only: whoever could have started it is who shows it.
	*/
	/**
	* The runs that are actually going, which is not the same as the runs a file says are going.
	*
	* Two things know something here and they know different things. The LEDGER knows what has been
	* measured: it reads each check's result file, and that file says whether a run claimed to be
	* still going when the ledger last looked. The BOARD knows what is running: it holds the
	* processes. The ledger only re-reads when something on disk changes -- so a run whose process
	* dies without writing anything changes nothing, no rebuild happens, and its claim stands for
	* ever. That is the bar that sat under a model reading "0/1, no estimate yet", with no Stop on
	* it, that nothing could get rid of: the ledger believed it, the board had never heard of it,
	* and neither was going to change its mind.
	*
	* So when the board is answering, the board decides. A claim it does not recognise is stale and
	* is not drawn as progress. When there is no board -- the page opened from a file, or from the
	* app's own dev server -- the ledger's own judgement is all there is, and it is used.
	*/
	/**
	* Is this check running? One answer, asked by everything that draws a running state.
	*
	* The rule was written once, for the bars, and not for the marks -- so a stale claim stopped
	* producing a bar you could not stop and started producing an amber ring around a tick with
	* nothing running behind it. Same fault, same file, two functions. There is one now.
	*/
	function isLive(key) {
		const p = L?.running?.[key];
		if (!p || p.alive === false) return false;
		return !RUN_OK || RUN_NOW.runs.some((r) => r.what === key);
	}
	const liveRuns = () => Object.entries(L?.running ?? {}).filter(([key, p]) => p && isLive(key));
	/** Where a run belongs, from the models it covers. Shared by a live run and one just asked for. */
	function homeOf(ids, key) {
		if (CHECK_LIST.find((c) => c.key === key)?.scope === "site") return { kind: "site" };
		if (ids.length === 1) return {
			kind: "model",
			id: ids[0]
		};
		if (ids.length > 1) {
			const gs = new Set(ids.map((id) => L.models.find((m) => m.id === id)?.group ?? ""));
			if (gs.size === 1) return {
				kind: "group",
				key: [...gs][0]
			};
		}
		return { kind: "suite" };
	}
	function barHome(p, key) {
		return homeOf(idsOfRun(p), key);
	}
	/**
	* The bar for a run that has been asked for and has not started.
	*
	* A check takes seconds to spawn a process and open a browser, and the ledger only notices it
	* when it next rebuilds -- which can be another ten. Until then the only thing that had changed
	* on screen was a small spinner where the play button was, which reads as a click that did not
	* land. The bar appears on the press, in the place the run will report to, and says what it is
	* doing: waiting to start. Its track is striped and moving but carries no figure, because there
	* is nothing to count yet and a bar at 0 of 135 would be a number this page had made up.
	*/
	function startingBar(key) {
		const c = CHECK_LIST.find((x) => x.key === key);
		const short = key === "all" ? "Every check" : c?.short ?? key;
		const title = key === "all" ? "Every check, in gate order" : CHECK_NAMES[key] ?? key;
		return `<span class="pg pg--starting">
      <span class="pg__name">${esc(short)}</span>
      <span class="pg__track" role="progressbar" aria-label="${esc(`${title}: starting`)}"><i></i></span>
      <span class="pg__meta">starting\u2026</span>
      ${runOf(key)?.mine ? `<span class="pg__acts">${holdAndStop("rowrun", key)}</span>` : ""}</span>`;
	}
	/** Sorted by where they go, once per render, so no row has to search the list for itself. */
	let BARS = {
		model: /* @__PURE__ */ new Map(),
		group: /* @__PURE__ */ new Map(),
		suite: [],
		site: []
	};
	function sortBars() {
		BARS = {
			model: /* @__PURE__ */ new Map(),
			group: /* @__PURE__ */ new Map(),
			suite: [],
			site: []
		};
		if (!L) return;
		const add = (map, k, v) => map.set(k, [...map.get(k) ?? [], v]);
		const starting = [];
		const stopping = PENDING && PENDING.act === "stop" ? String(PENDING.key).slice(5) : null;
		if (PENDING && PENDING.act === "run") starting.push(String(PENDING.key).split(":"));
		for (const r of RUN_NOW.runs) {
			if (r.what === stopping) continue;
			const seen = L.running?.[r.what];
			if (!seen || seen.alive === false) starting.push([r.what, (r.models ?? []).join(",")]);
		}
		const already = /* @__PURE__ */ new Set();
		for (const [what, idsRaw] of starting) {
			if (already.has(what)) continue;
			already.add(what);
			const h = homeOf((idsRaw ?? "").split(",").filter(Boolean), what);
			const bar = [what, null];
			if (h.kind === "model") add(BARS.model, h.id, bar);
			else if (h.kind === "group") add(BARS.group, h.key, bar);
			else if (h.kind === "site") BARS.site.push(bar);
			else BARS.suite.push(bar);
		}
		for (const [key, p] of liveRuns()) {
			if (already.has(key)) continue;
			const h = barHome(p, key);
			if (h.kind === "model") add(BARS.model, h.id, [key, p]);
			else if (h.kind === "group") add(BARS.group, h.key, [key, p]);
			else if (h.kind === "site") BARS.site.push([key, p]);
			else BARS.suite.push([key, p]);
		}
	}
	/**
	* One run's progress, wherever it is drawn: what is running, how far, how long is left, and the
	* two buttons that change that. The same markup in a row, in a group heading and beside the
	* table's own control, because it is the same fact in all three places.
	*/
	function runBar(key, p, over) {
		if (!p) return startingBar(key);
		const c = CHECK_LIST.find((x) => x.key === key);
		const whole = key === "all";
		const title = whole ? "Every check, in gate order" : CHECK_NAMES[key] ?? key;
		const short = whole ? "Every check" : c?.short ?? key;
		const pct = p.total ? Math.min(100, 100 * p.done / p.total) : 0;
		const e = etaOf(p);
		const ssId = `run:${key}`;
		const nSteps = (c?.steps ?? []).length;
		const ssShown = Boolean(c) && nSteps > 0;
		const ssOpened = ssShown && ssIsOpen(ssId);
		const bar = `<span class="pg${RUN_NOW.paused ? " is-paused" : ""}">
      <span class="pg__name" data-tip data-tiptext="${esc(`${title}, over ${over}.`)}">${esc(short)}</span>
      <span class="pg__track" role="progressbar" aria-label="${esc(`${title}: ${p.done} of ${p.total ?? "?"}`)}" aria-valuemin="0" aria-valuemax="${esc(p.total ?? 0)}" aria-valuenow="${esc(p.done)}"><i style="width:${pct}%"></i></span>
      <span class="pg__n">${esc(p.done)}/${esc(p.total ?? "?")}</span>
      <span class="pg__meta">${(() => {
			const bits = [];
			if (p.preparing) bits.push(`first: ${esc(String(p.preparing).replace(/^scripts\//, ""))}`);
			else if (RUN_NOW.paused) bits.push("paused");
			else if (e) bits.push(`about ${fmtDur(e.left)} left`);
			if (!p.preparing && p.last) bits.push(esc(p.last));
			return bits.join(" · ");
		})()}</span>
      ${RUN_OK ? `<span class="pg__acts">${holdAndStop("rowrun", whole ? null : key)}</span>` : ""}
      ${ssShown ? ssToggle(ssId, ssOpened ? `Hide what ${title} is covering` : `What ${title} is covering (${nSteps} parts)`, ssOpened, true) : ""}</span>`;
		if (!ssShown) return bar;
		return `<span class="pgbox">${bar}${ssOpened ? ssPanel(c, ssId, p) : ""}</span>`;
	}
	/**
	* Notices: things that happened and are worth one line, not a panel.
	*
	* Dismissing one remembers it by its run id, so the same stopped run does not come back on
	* the next rebuild -- the page redraws itself every few seconds, and a notice you cannot get
	* rid of is a notice you stop reading.
	*/
	const DISMISSED = "ledger.notices.dismissed";
	const seenNotices = () => {
		try {
			return new Set(JSON.parse(localStorage.getItem(DISMISSED) ?? "[]"));
		} catch {
			return /* @__PURE__ */ new Set();
		}
	};
	const dismissNotice = (id) => {
		try {
			const d = seenNotices();
			d.add(id);
			localStorage.setItem(DISMISSED, JSON.stringify([...d].slice(-40)));
		} catch {}
	};
	function drawNotices(stopped) {
		const box = $("notices");
		if (!box) return;
		const seen = seenNotices();
		const items = stopped.map(([key, p]) => ({
			key,
			p,
			id: p.runId ?? `${key}:${p.startedAt ?? ""}`
		})).filter((n) => !seen.has(n.id));
		box.hidden = !items.length;
		box.innerHTML = items.map(({ key, p, id }) => {
			const c = CHECK_LIST.find((x) => x.key === key);
			const name = c ? c.short : key;
			const far = p.total ? `${p.done ?? 0} of ${p.total}` : `${p.done ?? 0}`;
			return `<div class="notice notice--stopped" data-notice="${esc(id)}"><span class="notice__what"><b>${esc(name)}</b> stopped after ${esc(far)}</span><span class="notice__why">its process (pid ${esc(p.pid ?? "?")}) is gone, so the rest never reported. Run it again when you are ready.</span><button type="button" class="notice__x" data-dismiss="${esc(id)}" aria-label="Dismiss this notice" title="Dismiss this notice">${XICON}</button></div>`;
		}).join("");
	}
	$("notices")?.addEventListener("click", (e) => {
		const b = e.target.closest("[data-dismiss]");
		if (!b) return;
		dismissNotice(b.dataset.dismiss);
		b.closest(".notice")?.remove();
		const box = $("notices");
		if (box && !box.querySelector(".notice")) box.hidden = true;
	});
	/**
	* One notice above the bars when a check has nothing captured here and the committed snapshot has
	* its verdicts: it names the file and the commit, and says in so many words that those numbers are
	* the state at the last release and not a run on this machine. Nothing when every check has run.
	*/
	function releaseNotice() {
		const R = L.release;
		if (!R) return "";
		const checks = CHECK_LIST.filter((c) => c.scope === "model");
		const noRun = checks.filter((c) => !c.captured && R.checks?.[c.key]?.reported);
		if (!noRun.length) return "";
		const one = noRun.length === 1;
		return `<div class="notice" style="margin:0 0 12px"><b class="big">The state at the last release.</b>
      ${one ? `The <b>${esc(noRun[0].short)}</b> check has` : noRun.length === checks.length ? "None of these checks has" : `${noRun.length} of these ${checks.length} checks have`} been captured on this machine, so ${one ? "its bar reads" : "their bars read"} <b>not run yet</b> and the models under ${one ? "it" : "them"} stay to check.
      Beside ${one ? "it" : "them"}, in a dashed pill, is what <code>${esc(R.file)}</code> recorded at commit <code>${esc(R.head)}</code>${R.takenAt ? `, taken ${esc(new Date(R.takenAt).toLocaleString())}` : ""}: ${esc(noRun.map((c) => `${c.short.toLowerCase()} ${R.checks[c.key].pass}/${R.checks[c.key].of}`).join(" · "))}.
      That is a committed record of someone else's run, never a result of yours. ${R.describesHead ? `It still describes this code: ${esc(R.why)}.` : `<b>It no longer describes this code:</b> ${esc(R.why ?? "the commit it was taken at is not this one")}.`}
      Run <code>npm run capture -- &lt;check&gt;</code> for numbers of your own.</div>`;
	}
	const STAGE_KEY = "ledger.stage.open";
	(() => {
		try {
			return JSON.parse(localStorage.getItem(STAGE_KEY) ?? "{}") ?? {};
		} catch {
			return {};
		}
	})();
	let blkFrom = null, blkKeepFocus = false;
	function openBlockers(from) {
		const d = $("blk-dialog");
		blkFrom = from ?? $("blk-btn");
		if (!d.open) {
			if (typeof d.showModal === "function") d.showModal();
			else d.setAttribute("open", "");
		}
		$("blk-close").focus();
	}
	$("blk-btn").addEventListener("click", (e) => openBlockers(e.currentTarget));
	$("blk-close").addEventListener("click", () => $("blk-dialog").close());
	$("mach-close")?.addEventListener("click", () => $("mach-dialog").close());
	document.addEventListener("click", (e) => {
		if (e.target.closest?.("[data-machine]")) openMachine();
	});
	$("blk-dialog").addEventListener("click", (e) => {
		if (e.target === $("blk-dialog")) $("blk-dialog").close();
	});
	$("blk-dialog").addEventListener("keydown", (e) => {
		if (e.key === "Escape" && $("blk-dialog").open) {
			e.preventDefault();
			$("blk-dialog").close();
		}
	});
	$("blk-dialog").addEventListener("close", () => {
		if (!blkKeepFocus) (blkFrom?.isConnected ? blkFrom : $("blk-btn")).focus({ preventScroll: true });
		blkKeepFocus = false;
	});
	/** Pressed states of everything that sets the table's filter, without redrawing it. */
	function syncPressed() {
		document.querySelectorAll("[data-blk]").forEach((b) => b.setAttribute("aria-pressed", String(blk === b.dataset.blk)));
	}
	/**
	* Show only one filter's models (a blocker, a check-bar segment or a stage of the strip) in the
	* table: every other filter and the search are dropped so the rows are exactly those, all of them
	* drawn, and the table scrolls into view with the filter chip. The same click again shows every model.
	*/
	function showOnly(key, from, { toggle = true } = {}) {
		const on = !toggle || blk !== key;
		blk = on ? key : null;
		filter = "all";
		group = "all";
		tags.clear();
		query = "";
		limit = Math.max(PAGE, L.models.length);
		saveView();
		renderFilterChips();
		renderRows();
		renderOverview();
		if (on) {
			$("tbl-h").closest("section").scrollIntoView({
				block: "start",
				behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
			});
			$("fchip").querySelector("button")?.focus({ preventScroll: true });
		} else $(from)?.querySelector(`[data-blk="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
	}
	$("blockers").addEventListener("click", (e) => {
		const b = e.target.closest("[data-blk]");
		if (!b || !L) return;
		if ($("blk-dialog").open) {
			blkKeepFocus = true;
			$("blk-dialog").close();
		}
		showOnly(b.dataset.blk, "blockers");
	});
	/** Said only when the arithmetic really is wrong, which the build is supposed to prevent. */
	let NOTES_EXTRA = null;
	let NOTES = [];
	let notesOpen = false;
	let dismissed = {};
	try {
		dismissed = JSON.parse(localStorage.getItem("ledger-dismissed") || "{}") || {};
	} catch {}
	const sig = (s) => {
		let h = 5381;
		for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
		return h.toString(36);
	};
	const saveDismissed = () => {
		const live = new Set(NOTES.map((n) => n.key));
		for (const k of Object.keys(dismissed)) if (!live.has(k)) delete dismissed[k];
		try {
			localStorage.setItem("ledger-dismissed", JSON.stringify(dismissed));
		} catch {}
	};
	const isShown = (n) => dismissed[n.key] !== sig(n.html);
	function renderNotes() {
		const shown = NOTES.filter(isShown);
		const hid = NOTES.length - shown.length;
		const btn = $("notes-btn");
		btn.hidden = !NOTES.length;
		btn.innerHTML = `<b>${shown.length}</b> note${shown.length === 1 ? "" : "s"}${hid ? ` <small>· ${hid} dismissed</small>` : ""}`;
		btn.setAttribute("aria-expanded", String(notesOpen));
		btn.classList.toggle("is-quiet", !shown.length);
		paintNavIcons();
		const pop = $("notes-pop");
		pop.hidden = !notesOpen || !NOTES.length;
		pop.innerHTML = (shown.length ? shown.map((n) => `<div class="note"><div class="note__body">${n.html}</div><button type="button" class="note__x" data-dismiss="${esc(n.key)}" aria-label="Dismiss this note" title="Dismiss this note">${XICON}</button></div>`).join("") : "<p class=\"muted\" style=\"margin:4px 2px\">Every note is dismissed.</p>") + (hid ? `<p style="margin:8px 2px 2px"><button type="button" class="linkish" data-undismiss>Show the ${hid} dismissed note${hid === 1 ? "" : "s"}</button> <span class="muted" style="font-size:12px">A dismissed note comes back by itself if what it says changes.</span></p>` : "");
	}
	function paintNavIcons() {
		for (const el of document.querySelectorAll("[data-nav]")) {
			if (el.querySelector(":scope > .nav__i")) continue;
			el.innerHTML = `<span class="nav__i" aria-hidden="true">${icon(el.getAttribute("data-nav"))}</span><span class="nav__t">${el.innerHTML}</span>`;
		}
	}
	paintNavIcons();
	$("notes-btn").addEventListener("click", (e) => {
		e.stopPropagation();
		notesOpen = !notesOpen;
		renderNotes();
		paintNavIcons();
	});
	$("notes-pop").addEventListener("click", (e) => {
		e.stopPropagation();
		const x = e.target.closest("[data-dismiss]");
		if (x) {
			const n = NOTES.find((k) => k.key === x.dataset.dismiss);
			if (n) dismissed[n.key] = sig(n.html);
			saveDismissed();
			renderNotes();
			return;
		}
		if (e.target.closest("[data-undismiss]")) {
			for (const n of NOTES) delete dismissed[n.key];
			saveDismissed();
			renderNotes();
		}
	});
	document.addEventListener("click", () => {
		if (notesOpen) {
			notesOpen = false;
			renderNotes();
		}
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && notesOpen) {
			notesOpen = false;
			renderNotes();
			$("notes-btn").focus();
		}
	});
	/** A focusable "?" whose text is also a visually hidden span it is described by. */
	const helpIcon = (id, label, html) => `<button type="button" class="help" aria-label="${esc(label)}" aria-describedby="help-${esc(id)}" aria-expanded="false" data-help="${esc(id)}">?</button><span id="help-${esc(id)}" class="visually-hidden">${html}</span>`;
	const tip = document.createElement("div");
	tip.className = "tip";
	tip.hidden = true;
	tip.setAttribute("aria-hidden", "true");
	document.body.appendChild(tip);
	let tipFor = null, tipPinned = false;
	function showTip(btn, pin = false) {
		const plainText = btn.dataset.tiptext;
		const text = plainText != null ? { innerHTML: esc(plainText) } : document.getElementById(btn.getAttribute("aria-describedby"));
		if (!text) return;
		if (tipFor && tipFor !== btn) tipFor.setAttribute("aria-expanded", "false");
		tipFor = btn;
		tipPinned = pin;
		btn.setAttribute("aria-expanded", "true");
		const host = btn.closest("dialog[open]") ?? document.body;
		if (tip.parentElement !== host) host.appendChild(tip);
		tip.innerHTML = text.innerHTML;
		tip.hidden = false;
		placeTip();
	}
	function placeTip() {
		if (!tipFor || !tipFor.isConnected) {
			hideTip();
			return;
		}
		const a = tipFor.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 10;
		const below = a.bottom + gap + h <= innerHeight - 8 || a.top - gap - h < 8;
		const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), innerWidth - w - 8);
		const top = below ? a.bottom + gap : a.top - gap - h;
		const host = tip.parentElement;
		const o = host && host !== document.body ? host.getBoundingClientRect() : {
			left: 0,
			top: 0
		};
		tip.style.left = `${left - o.left}px`;
		tip.style.top = `${top - o.top}px`;
		tip.dataset.side = below ? "below" : "above";
		tip.style.setProperty("--arrow-x", `${Math.min(Math.max(12, a.left + a.width / 2 - left), w - 12)}px`);
	}
	function hideTip() {
		tipFor?.setAttribute("aria-expanded", "false");
		tipFor = null;
		tipPinned = false;
		tip.hidden = true;
	}
	let ptr = null;
	document.addEventListener("pointermove", (e) => {
		if (e.pointerType === "mouse") ptr = {
			x: e.clientX,
			y: e.clientY
		};
	}, { passive: true });
	function reTip() {
		if (!ptr || tipPinned) return;
		const under = document.elementFromPoint(ptr.x, ptr.y)?.closest?.(".help, [data-tip]");
		if (under) showTip(under);
		else if (tipFor && !tipFor.isConnected) hideTip();
	}
	document.addEventListener("pointerover", (e) => {
		const b = e.target.closest?.(".help, [data-tip]");
		if (b && e.pointerType === "mouse" && !tipPinned) showTip(b);
	});
	document.addEventListener("pointerout", (e) => {
		const b = e.target.closest?.(".help, [data-tip]");
		if (b && b === tipFor && e.pointerType === "mouse" && !tipPinned && !b.contains(e.relatedTarget)) hideTip();
	});
	document.addEventListener("focusin", (e) => {
		const b = e.target.closest?.(".help, [data-tip]");
		if (b) showTip(b);
	});
	document.addEventListener("focusout", (e) => {
		if (e.target === tipFor && !tipPinned) hideTip();
	});
	document.addEventListener("click", (e) => {
		const b = e.target.closest?.(".help");
		if (b) {
			e.stopPropagation();
			if (tipFor === b && tipPinned) hideTip();
			else showTip(b, true);
			return;
		}
		if (tipFor) hideTip();
	}, true);
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && tipFor) {
			const b = tipFor;
			hideTip();
			if (document.activeElement !== b) b.focus({ preventScroll: true });
		}
	});
	addEventListener("scroll", () => tipFor && placeTip(), {
		passive: true,
		capture: true
	});
	addEventListener("resize", () => tipFor && placeTip());
	/** Whether a model passes a set of filters. Every count on a chip is this, over all models. */
	const passes = (m, f) => {
		if (f.filter !== "all" && m.status !== f.filter) return false;
		if (f.blk && !BLK.get(f.blk)?.ids.has(m.id)) return false;
		if (f.group !== "all" && m.group !== f.group) return false;
		for (const t of f.tags) if (!(m.tags ?? []).includes(t)) return false;
		const needle = f.query.trim().toLowerCase();
		if (needle && ![
			m.id,
			m.title,
			m.groupLabel,
			...m.tags ?? []
		].join(" ").toLowerCase().includes(needle)) return false;
		return true;
	};
	const view = () => ({
		filter,
		group,
		tags,
		query,
		blk
	});
	const countWith = (over) => {
		const f = {
			...view(),
			...over
		};
		return L.models.filter((m) => passes(m, f)).length;
	};
	function render() {
		if (!L) return;
		syncChecks(L.checkList);
		const c = L.counts, n = c.models;
		{
			const nameOf = (key) => CHECK_LIST.find((x) => x.key === key)?.short ?? (CHECK_NAMES[key] ?? key).replace(/\s*\([^)]*\)\s*$/, "");
			const first = (RUN_NOW.runs ?? [])[0] ?? null;
			const rec = first && L.running ? L.running[first.what] : null;
			const far = rec && rec.total ? ` ${rec.done ?? 0}/${rec.total}` : "";
			const more = (RUN_NOW.runs ?? []).length > 1 ? ` +${RUN_NOW.runs.length - 1}` : "";
			document.title = first ? `${nameOf(first.what)}${far}${more} · Ledger` : `${c.approved}/${n} · Ledger`;
		}
		L.build?.by && (`${esc(L.build.by)}`, L.build.reason && `${esc(L.build.reason)}`);
		const full = `Built ${L.generatedAt ? new Date(L.generatedAt).toLocaleString() : "an unknown time"}${L.build?.by ? ` by ${L.build.by}${L.build.reason ? ` (${L.build.reason})` : ""}` : ""} at HEAD ${L.head}. Every status below is read from git, the model files and the captured checks.`;
		$("meta").innerHTML = `<span tabindex="0" data-tip data-tiptext="${esc(full)}">HEAD <code>${esc(L.head)}</code></span><span class="sep">·</span><span>built ${agoSpan(L.generatedAt)}</span>`;
		const notes = [];
		for (const [name, src] of Object.entries(L.sources.checks)) if (/never been captured/.test(src)) notes.push({
			key: `never:${name}`,
			col: name,
			html: `<b>${esc(CHECK_NAMES[name] ?? name)}</b> has no result file: its column says “not run yet” for every model because no run was captured, not because models failed. Capture one with <code>npm run capture -- ${esc(name)}</code>.`
		});
		for (const note of L.notes ?? []) notes.push({
			key: `ledger:${sig(note)}`,
			html: esc(note)
		});
		NOTES = NOTES_EXTRA ? [...notes, {
			key: "balance",
			html: NOTES_EXTRA
		}] : notes;
		$("notices").innerHTML = releaseNotice();
		renderNotes();
		const theadHtml = `<th class="model" scope="col"><span class="colh__wrap colh__wrap--model"><span class="suite" id="suite" data-suite></span><span class="colh colh--plain">Model</span></span></th><th class="st" scope="col">Status</th>${COLS.map(([k, label]) => {
			const note = NOTES.find((n) => n.col === k);
			const title = CHECK_NAMES[k] ?? k;
			return `<th class="c${RUN_NOW.runs.some((r) => r.what === k) ? " is-running-col" : ""}" scope="col"><span class="colh__wrap"><button type="button" class="colh" data-def="${esc(k)}" data-tip data-tiptext="${esc(`${title}. Click for its definition.`)}" aria-label="${esc(`${title}: open its definition`)}">${esc(label)}</button>${note ? helpIcon(`col-${k}`, `About the ${label} column`, note.html) : ""}${RUN_OK ? `<span class="colh__run">${runBtn(k, [], `Run ${title} on every model`, "cellrun")}</span>` : ""}</span></th>`;
		}).join("")}<th class="last" scope="col">Last commit</th><th class="num ncom" scope="col">Commits</th>`;
		if ($("thead").dataset.html !== theadHtml) {
			$("thead").dataset.html = theadHtml;
			$("thead").innerHTML = theadHtml;
			stickyOffsets();
		}
		renderSuite();
		paintHeadRuns();
		if (!Array.isArray(c.blockers) && !String(blk).startsWith("status:")) blk = null;
		renderOverview();
		renderRules();
		renderSiteChecks();
		renderColRuns();
		renderMarkLegend();
		if (group !== "all" && !(L.groups ?? []).some((g) => g.key === group)) group = "all";
		for (const t of [...tags]) if (!(L.tags ?? []).includes(t)) tags.delete(t);
		renderFilterChips();
		renderRows();
		renderReadiness();
		paintNavIcons();
	}
	/**
	* The gallery's filter bar, filled in: status tabs, the Tags button, group and tag chips. Each
	* count is what the list would hold with that choice, given every other filter and the search.
	*/
	const HASH = "<svg class=\"icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><line x1=\"4\" x2=\"20\" y1=\"9\" y2=\"9\"/><line x1=\"4\" x2=\"20\" y1=\"15\" y2=\"15\"/><line x1=\"10\" x2=\"8\" y1=\"3\" y2=\"21\"/><line x1=\"16\" x2=\"14\" y1=\"3\" y2=\"21\"/></svg>";
	const XICON = icon("x");
	const COPYICON = "<svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"/></svg>";
	/** Copy a full hash. The clipboard can be refused (no permission, an insecure origin), so the button
	says which of the two happened rather than pretending it worked. */
	async function copyHash(btn) {
		const text = btn.dataset.copy ?? "";
		let ok = false;
		try {
			await navigator.clipboard.writeText(text);
			ok = true;
		} catch {
			ok = false;
		}
		btn.classList.toggle("is-done", ok);
		btn.classList.toggle("is-nope", !ok);
		btn.setAttribute("data-tiptext", ok ? `Copied ${text}` : `Could not copy: ${text}`);
		setTimeout(() => {
			btn.classList.remove("is-done", "is-nope");
			btn.setAttribute("data-tiptext", text);
		}, 1600);
	}
	function renderFilterChips() {
		const n = L.models.length;
		const meansOf = (k) => (L.counts.buckets ?? []).find((b) => b.key === k)?.means;
		$("f-status").innerHTML = [[
			"all",
			"All",
			"every model, whatever its status"
		], ...STATUS.map((s) => [
			s.key,
			s.short,
			`${s.long}: ${meansOf(s.key) ?? ""}`
		])].map(([k, label, def]) => {
			const n = countWith({ filter: k });
			return `<button type="button" class="tab" data-f="${esc(k)}" aria-pressed="${filter === k}" aria-label="${esc(`${label}, ${n}`)}" data-tip data-tiptext="${esc(def)}">${esc(label)} <b aria-hidden="true">${n}</b></button>`;
		}).join("");
		tabsFade();
		const hidden = n - countWith({});
		const groups = [{
			key: "all",
			label: "All groups"
		}, ...L.groups ?? []];
		$("f-group").innerHTML = (hidden ? `<button type="button" class="group group--clear" data-clear title="Clear every filter and the search">${XICON} Clear <b>${hidden} hidden</b></button>` : "") + groups.map((g) => {
			const c = countWith({ group: g.key });
			const on = group === g.key;
			return `<button type="button" class="group" data-g="${esc(g.key)}" aria-pressed="${on}"${c === 0 && !on ? " disabled" : ""}>${esc(g.label)} <b>${c}</b></button>`;
		}).join("");
		$("f-tags").innerHTML = (L.tags ?? []).map((t) => {
			const on = tags.has(t);
			const c = on ? countWith({}) : countWith({ tags: /* @__PURE__ */ new Set([...tags, t]) });
			if (c === 0 && !on) return "";
			return `<button type="button" class="tchip" data-t="${esc(t)}" aria-pressed="${on}">#${esc(t)} <b>${c}</b></button>`;
		}).join("");
		const btn = $("tags-toggle");
		btn.innerHTML = `${HASH} <span class="btn__label">Tags</span>${tags.size ? ` <b>${tags.size}</b>` : ""}`;
		btn.setAttribute("aria-label", tags.size ? `Tags, ${tags.size} selected` : "Tags");
		btn.setAttribute("aria-expanded", String(tagsOpen));
		$("tags-row").hidden = !tagsOpen;
		$("q-clear").hidden = !query;
		if ($("q").value !== query) $("q").value = query;
		const fc = $("fchip");
		fc.hidden = !blk;
		if (blk) {
			const x = BLK.get(blk);
			fc.innerHTML = `<span class="fchip__c"><span>Showing: ${esc(x?.chip ?? chipLabel(blk))} (${x?.ids.size ?? 0})</span><button type="button" class="fchip__x" data-unblk aria-label="Stop showing only these; show every model">${XICON}</button></span>${x ? "" : "<span class=\"fchip__note\">No model is held by this any more.</span>"}`;
		} else fc.innerHTML = "";
		syncPressed();
		queueMicrotask(() => {
			groupsScroll.reveal($("f-group").querySelector(".group[aria-pressed=\"true\"]"));
			tagsScroll.update();
		});
	}
	function onFilterClick(e) {
		const b = e.target.closest("button");
		if (!b || !L) return;
		if (b.dataset.f) filter = b.dataset.f;
		else if (b.dataset.g) group = b.dataset.g;
		else if (b.dataset.t) tags.has(b.dataset.t) ? tags.delete(b.dataset.t) : tags.add(b.dataset.t);
		else if ("clear" in b.dataset) {
			filter = "all";
			group = "all";
			tags.clear();
			query = "";
			blk = null;
		} else if ("unblk" in b.dataset) blk = null;
		else if (b.id === "tags-toggle") {
			tagsOpen = !tagsOpen;
			saveView();
			renderFilterChips();
			return;
		} else if (b.id === "q-clear") {
			query = "";
			$("q").focus();
		} else return;
		limit = PAGE;
		saveView();
		const keep = b.dataset.f ? `[data-f="${CSS.escape(b.dataset.f)}"]` : b.dataset.g ? `[data-g="${CSS.escape(b.dataset.g)}"]` : b.dataset.t ? `[data-t="${CSS.escape(b.dataset.t)}"]` : null;
		renderFilterChips();
		renderRows();
		if (keep) $("filters").querySelector(keep)?.focus({ preventScroll: true });
	}
	function scrollRow(row) {
		const track = row.querySelector(".scrollrow__track");
		const update = () => {
			const { scrollLeft, scrollWidth, clientWidth } = track;
			row.classList.toggle("can-prev", scrollLeft > 2);
			row.classList.toggle("can-next", scrollLeft + clientWidth < scrollWidth - 2);
		};
		track.addEventListener("scroll", update, { passive: true });
		if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
		for (const [sel, dir] of [[".scrollrow__arrow--prev", -1], [".scrollrow__arrow--next", 1]]) row.querySelector(sel).addEventListener("click", (e) => {
			e.stopPropagation();
			track.scrollBy({
				left: dir * track.clientWidth * .7,
				behavior: "smooth"
			});
		});
		const reveal = (el) => {
			if (el) {
				const { offsetLeft, offsetWidth } = el;
				const { scrollLeft, clientWidth } = track;
				if (offsetLeft < scrollLeft + 48) track.scrollLeft = offsetLeft - 48;
				else if (offsetLeft + offsetWidth > scrollLeft + clientWidth - 48) track.scrollLeft = offsetLeft + offsetWidth - clientWidth + 48;
			}
			update();
		};
		return {
			update,
			reveal
		};
	}
	const groupsScroll = scrollRow($("groups-row"));
	/** The status tabs scroll sideways inside themselves when the bar is tight; a fade marks the side with more. */
	function tabsFade() {
		const t = $("f-status");
		t.classList.toggle("can-prev", t.scrollLeft > 2);
		t.classList.toggle("can-next", t.scrollLeft + t.clientWidth < t.scrollWidth - 2);
	}
	$("f-status").addEventListener("scroll", tabsFade, { passive: true });
	if ("ResizeObserver" in window) new ResizeObserver(tabsFade).observe($("f-status"));
	let stickTop = 0, headH = 0, wasStuck = null, tucked = false;
	function stickyOffsets() {
		const bar = $("filters");
		stickTop = parseFloat(getComputedStyle(bar).top) || 0;
		document.documentElement.style.setProperty("--fbar-h", `${Math.round(bar.offsetHeight)}px`);
		document.documentElement.style.setProperty("--stick-head", `${Math.round(stickTop + bar.offsetHeight)}px`);
		headH = Math.round($("thead").offsetHeight);
		document.documentElement.style.setProperty("--head-h", `${headH}px`);
		const suite = $("rows").querySelector("tr.suiterun > td");
		document.documentElement.style.setProperty("--suite-h", `${suite ? Math.round(suite.offsetHeight) : 0}px`);
		const grow = $("rows").querySelector("tr.grow > th");
		document.documentElement.style.setProperty("--grow-h", `${grow ? Math.round(grow.offsetHeight) : 0}px`);
		onScroll();
	}
	let lastY = -1, run = 0;
	const TUCK_AFTER = 110;
	const dialogOpen = () => Boolean($("rules-dialog").open || $("blk-dialog").open || $("cl-dialog").open);
	function setTuck(on) {
		if (on === tucked) return;
		tucked = on;
		document.documentElement.classList.toggle("tucked", on);
		document.documentElement.style.setProperty("--show", on ? "0" : "1");
	}
	const revealHead = () => {
		run = 0;
		setTuck(false);
	};
	$("filters").addEventListener("focusin", revealHead);
	$("tbl").addEventListener("focusin", revealHead);
	function onScroll() {
		const bar = $("filters");
		const stuck = bar.getBoundingClientRect().top <= stickTop + .5;
		if (stuck !== wasStuck) {
			wasStuck = stuck;
			bar.classList.toggle("is-stuck", stuck);
		}
		const y = Math.max(0, scrollY);
		const dy = lastY < 0 ? 0 : y - lastY;
		lastY = y;
		if (dy > 0 && run < 0 || dy < 0 && run > 0) run = 0;
		run += dy;
		const deep = $("tbl").getBoundingClientRect().top <= 0;
		if (dialogOpen() || !deep) revealHead();
		else if (run > TUCK_AFTER) setTuck(true);
		else if (run < -45) revealHead();
	}
	if ("ResizeObserver" in window) {
		const ro = new ResizeObserver(stickyOffsets);
		ro.observe($("filters"));
		ro.observe($("thead"));
	}
	addEventListener("resize", stickyOffsets);
	{
		let frame = 0;
		addEventListener("scroll", () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				onScroll();
			});
		}, { passive: true });
	}
	if ("IntersectionObserver" in window) {
		const watch = (el, cls) => {
			if (!el) return;
			new IntersectionObserver(([e]) => document.documentElement.classList.toggle(cls, !e.isIntersecting), { rootMargin: "120px" }).observe(el);
		};
		watch($("stats"), "strip-away");
		watch($("tablewrap"), "table-away");
	}
	const tagsScroll = scrollRow($("tags-row"));
	scrollRow($("legend-row"));
	$("filters").addEventListener("click", onFilterClick);
	$("q").addEventListener("input", () => {
		if (!L) return;
		query = $("q").value;
		limit = PAGE;
		saveView();
		renderFilterChips();
		renderRows();
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "/" && !e.target.matches("input, textarea") && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			$("q").focus();
		}
	});
	let moreObserver = null;
	const badKey = (k) => `bad:${k}`;
	/** The ad-hoc "this check failed or flagged" filter is built from the models, not from ledger.json's
	blockers, so it has to be rebuilt on every render -- including after a reload that remembered it. */
	function ensureBad() {
		if (!blk?.startsWith("bad:")) return;
		const k = blk.slice(4);
		if (!COLS.some(([c]) => c === k)) {
			blk = null;
			return;
		}
		BLK.set(blk, {
			ids: new Set(L.models.filter((m) => problemsOf(m).includes(k)).map((m) => m.id)),
			chip: `${CHECK_NAMES[k] ?? k}: failed or flagged`
		});
	}
	/** Show exactly the models a check failed or flagged, whatever the filter was: the chip's promise. */
	function showBad(k) {
		filter = "all";
		group = "all";
		tags.clear();
		query = "";
		$("q").value = "";
		blk = badKey(k);
		ensureBad();
		limit = Math.max(PAGE, L.models.length);
		saveView();
		renderFilterChips();
		renderRows();
		renderOverview();
		$("tbl-h").closest("section").scrollIntoView({
			block: "start",
			behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
		});
	}
	const FLAT_BELOW = 12;
	const CHEVRON = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m6 9 6 6 6-6\"/></svg>";
	let groupState = {};
	try {
		groupState = JSON.parse(localStorage.getItem("ledger-groups") || "{}") || {};
	} catch {}
	let foldView = {
		key: "",
		fold: {}
	};
	const filteringNow = () => blk !== null || filter !== "all" || group !== "all" || tags.size > 0 || query.trim() !== "";
	const saveGroups = () => {
		try {
			localStorage.setItem("ledger-groups", JSON.stringify(groupState));
		} catch {}
	};
	/** Whether any check of a model fails, flags or is running on it now: what a folded group must still show. */
	const problemsOf = (m) => COLS.map(([k]) => k).filter((k) => ["fail", "flag"].includes(markKind(m.checks[k])[0]));
	const runningOn = (m) => COLS.map(([k]) => k).filter((k) => isLive(k) && L.running?.[k]?.last === m.id);
	function groupSections(list) {
		const order = (L.groups ?? []).map((g) => g.key);
		const by = /* @__PURE__ */ new Map();
		for (const m of list) {
			const k = m.group ?? "(none)";
			if (!by.has(k)) by.set(k, []);
			by.get(k).push(m);
		}
		return [...by.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999)).map((k) => ({
			key: k,
			label: (L.groups ?? []).find((g) => g.key === k)?.label ?? k,
			models: by.get(k),
			all: L.models.filter((m) => (m.group ?? "(none)") === k)
		}));
	}
	/** Open unless the viewer folded it; by default a group with a problem or a run on it opens, a fully approved one folds. */
	function groupOpen(g) {
		if (g.key in groupState) return groupState[g.key];
		if (g.all.some((m) => problemsOf(m).length || runningOn(m).length)) return true;
		return !g.all.every((m) => m.approved);
	}
	/**
	* The models that are ticked.
	*
	* A group's run used to mean "every model in this group", which is right until one model in the
	* group is the one that changed. Ticking is how you say which: tick none and a group's buttons
	* still mean all of it, so the common case needs no ticking at all.
	*
	* It is not remembered between visits on purpose. A tick is about what you are doing in the next
	* minute, and a tick restored from last week would quietly narrow a run you thought was whole.
	*/
	const PICKED = /* @__PURE__ */ new Set();
	/**
	* A column heading runs over what is ticked, wherever those models are.
	*
	* A group's buttons have always meant "the ticked ones in this group, or all of it if none are"
	* (targetOf). The column heading did not look at ticks at all: it meant every model, always. So
	* thirteen models spread over four groups -- which is what one evening's editing looks like --
	* could only be run a cell at a time, or four group presses, for each of five checks.
	*
	* The ticks are already global; only the heading was ignoring them. It says which it means, so
	* a run of thirteen can never be mistaken for a run of everything.
	*
	* Written here rather than into the head's own html because that html is rebuilt only when it
	* changes, and a tick must not pull an open tooltip out from under the reader.
	*/
	function paintHeadRuns() {
		if (!RUN_OK) return;
		const ids = [...PICKED];
		for (const th of $("thead").querySelectorAll("th.c")) {
			const k = th.querySelector(".colh")?.dataset.def;
			const slot = th.querySelector(".colh__run");
			if (!k || !slot) continue;
			const title = CHECK_NAMES[k] ?? k;
			slot.innerHTML = runBtn(k, ids, ids.length ? `Run ${title} on the ${ids.length} ticked model${ids.length === 1 ? "" : "s"}` : `Run ${title} on every model`, "cellrun");
		}
	}
	/** What a group's buttons will actually run over: the ticked ones, or all of them if none are. */
	function targetOf(g) {
		const all = g.models.map((m) => m.id);
		const picked = all.filter((id) => PICKED.has(id));
		return {
			ids: picked.length ? picked : all,
			picked: picked.length,
			all: all.length
		};
	}
	const tickBox = (attr, val, on, mixed, label) => `<input type="checkbox" class="pick" ${attr}="${esc(val)}"${on ? " checked" : ""}${mixed ? " data-mixed=\"1\"" : ""} aria-label="${esc(label)}">`;
	/**
	* A group, in one row.
	*
	* It used to be two: a heading across the whole table, and under it a second row of cells
	* carrying a run button per check -- because a heading that spans every column has nowhere to
	* put a control that belongs to one of them. Giving the heading real cells solves that without
	* the second row: the name, the tick and the bar take the Model and Status columns, and each
	* check column holds the button that runs that check over this group.
	*
	* The chips that used to sit at the end of the heading -- "Share 15", "Motion 4", one per check
	* with a problem -- are gone with it. Every one of those numbers is a column of marks directly
	* underneath, in the rows the chip was counting: the chip said "15 failed Share" over fifteen
	* rows each showing a failed Share. Saying it twice is not saying it better, and the chips were
	* counting the whole group while the rows under them were whatever the filter had left, which
	* took a paragraph of explanation to keep honest.
	*/
	function groupRow(g, opened) {
		const n = g.all.length;
		const count = (st) => g.all.filter((m) => m.status === st).length;
		const ap = count("approved"), cv = count("to check");
		const seg = (x, c, w) => x ? `<i style="flex-grow:${x};background:${c}" title="${esc(`${x} ${w}`)}"></i>` : "";
		const shownNote = g.models.length !== n ? `, ${g.models.length} match` : "";
		const t0 = targetOf(g);
		const allOn = t0.picked === t0.all && t0.all > 0;
		const onHere = BARS.group.get(g.key) ?? [];
		const over = t0.picked ? `the ${t0.picked} ticked in ${g.label}` : g.label;
		const cells = RUN_OK && g.key ? COLS.map(([k, label]) => `<td class="c${onHere.some(([rk]) => rk === k) ? " is-running-col" : ""}">${runBtn(k, t0.ids, `Run ${label} on ${over}`, "cellrun")}</td>`).join("") : COLS.map(() => "<td class=\"c\"></td>").join("");
		return `<tr class="grow" style="--gc:${gcFor(g.key)}">
      <th class="model" colspan="2" scope="rowgroup"><div class="grow__in">
      ${RUN_OK ? tickBox("data-pick-grp", g.key, allOn, t0.picked > 0 && !allOn, `Tick every model shown in ${g.label}`) : ""}
      <button type="button" class="grow__btn" data-grp="${esc(g.key)}" aria-expanded="${opened}">${CHEVRON}${esc(g.label)} <span class="n">· ${n}${shownNote}</span></button>
      <span class="mt__run">${runBtn("all", t0.ids, t0.picked ? `Run every check on the ${t0.picked} ticked in ${g.label}` : `Run every check on ${g.label}`)}</span>
      ${`<span class="grow__bar" role="img" aria-label="${esc(`${ap} of ${n} approved, ${cv} to check`)}">${seg(ap, "var(--st-ok)", "approved")}${seg(cv, "var(--st-conv)", "to check")}</span>
      <span class="grow__meta">${ap} approved · ${cv} to check${t0.picked ? ` · <b>${t0.picked} ticked</b>` : ""}</span>`}
      </div></th>
      ${cells}<td class="last"></td><td class="num ncom"></td></tr>
    ${onHere.length ? `<tr class="detail detail--run" style="--gc:${gcFor(g.key)}"><td colspan="${colCount()}">${onHere.map(([k, pr]) => runBar(k, pr, g.label)).join("")}</td></tr>` : ""}`;
	}
	/**
	* A run button for part of the table.
	*
	* Everything used to run over all 135 models or nothing, which is the wrong size for most of what
	* you actually want: one model has changed, or one group, or one check is red and the rest are
	* fine. `what` is a check key or 'all'; `ids` are the models it covers.
	*/
	/**
	* @param text  words to put INSIDE the button. Without it the button is the icon alone, which
	*   is right in a table cell where the column says what it runs. In a list with no column to
	*   read, the name has to be part of the control: an icon beside a word is two things to aim
	*   at, of which only one works.
	*/
	function runBtn(what, ids, label, cls = "rowrun", text = "") {
		if (!RUN_OK) return "";
		const key = runKey(what, ids);
		if (PENDING && PENDING.key === key && cls !== "cellrun") return `<span class="${cls} ckrun--wait" role="status" aria-label="Starting"><i></i></span>`;
		const r = runOf(what);
		if (r && sameIds(r.models ?? [], ids) && cls !== "cellrun") return r.mine ? holdAndStop(cls, what) : `<span class="${cls} ckrun--wait ckrun--busy" role="status" aria-label="Being checked now, started outside this board" title="Being checked now. It was started outside this board, so it cannot be paused or stopped from here."><i></i></span>`;
		const why = blockedBy(what, ids);
		return `<button type="button" class="${cls}${text ? " ckrun--said" : ""}" data-run-what="${esc(what)}" data-run-ids="${esc(ids.join(","))}" title="${esc(why ?? label)}" aria-label="${esc(label)}"${why ? " disabled" : ""}>${PLAY}${text ? `<span>${esc(text)}</span>` : ""}</button>`;
	}
	const sameIds = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
	/**
	* Why this run cannot start, in the words the button will show, or null if it can.
	*
	* One rule: a run is blocked by a live run of the SAME CHECK, whatever models either names. So
	* a check running anywhere switches off its whole column, cells and group rows and all; and it
	* leaves every OTHER check alone, on every model, which is the whole point of running several at
	* once. Motion over all 135 does not stop you running Stages beside it.
	*
	* "Run everything" is its own case. It walks every check and rewrites every result file, so it
	* cannot share the machine with anything, and nothing can start while it is going. That is not
	* a preference: two runs writing one file do not merge, the later one wins it whole, and the
	* board would show verdicts for models nothing had judged.
	*/
	function blockedBy(what, ids) {
		const alone = new Set(CHECK_LIST.filter((c) => c.alone).map((c) => c.key));
		for (const r of RUN_NOW.runs) {
			if (alone.has(r.what)) return `${CHECK_NAMES[r.what] ?? r.what} is running and has the machine to itself: it measures how fast a model draws, so anything running beside it lands in its numbers`;
			if (alone.has(what)) return `${CHECK_NAMES[what] ?? what} measures how fast a model draws, so it waits for an idle machine — ${CHECK_NAMES[r.what] ?? r.what} is running`;
			if (r.what === "all") return "the whole run is going, and it covers every check on every model";
			if (what === "all") return ids.length ? `${CHECK_NAMES[r.what] ?? r.label ?? r.what} is running, and every check means that one too` : `${CHECK_NAMES[r.what] ?? r.label ?? r.what} is running: the whole run covers every check, so it waits for that to finish`;
			if (r.what !== what) continue;
			const over = (r.models ?? []).length;
			return `${CHECK_NAMES[what] ?? what} is already running over ${over ? `${over} model${over === 1 ? "" : "s"}` : "every model"}, and one check writes one result file`;
		}
		if (RUN_NOW.runs.length >= (RUN_NOW.max ?? 2)) return `${RUN_NOW.runs.length} checks are already running, which is as many as this machine will drive at once`;
		return null;
	}
	function modelRow(m, flat) {
		const last = m.commits.find((x) => x.matchedBy.includes("diff")) ?? m.commits[0];
		const glabel = m.groupLabel ?? m.group ?? "";
		const short = glabel.split(/\s*[&,]\s*|\s+/)[0];
		let sd = 0;
		for (const ch of m.id) sd = sd * 31 + ch.charCodeAt(0) >>> 0;
		return `<tr class="row${flash.has(m.id) ? " flash" : ""}" style="--gc:${gcFor(m.group ?? "")};--sweep-d:-${sd % 9}s" tabindex="0" data-id="${esc(m.id)}" aria-expanded="${open.has(m.id)}">
        <td class="model"><div class="mt">${RUN_OK ? tickBox("data-pick", m.id, PICKED.has(m.id), false, `Tick ${m.title} for a group run`) : ""}<b data-tip data-tiptext="${esc(`${m.title} (${m.id}), group: ${glabel || "none"}`)}">${esc(m.title)}</b><code>${esc(m.id)}</code>${flat && glabel ? `<span class="gchip" data-tip data-tiptext="${esc(`Group: ${glabel}`)}" aria-label="${esc(`group: ${glabel}`)}">${esc(short)}</span>` : ""}<span class="mt__run">${runBtn("all", [m.id], `Run every check on ${m.title}`)}</span></div></td>
        <td class="st">${chipFor(m.status, justApproved.has(m.id))}</td>
        ${COLS.map(([k, label]) => {
			const busy = runStateOf(k, m);
			return `<td class="c${busy ? ` ${busy}` : ""}" data-label="${esc(label)}">${checkMark(k, m)}${runBtn(k, [m.id], `Run ${label} on ${m.title}`, "cellrun")}</td>`;
		}).join("")}
        <td class="num last">${last ? `<span data-tip data-tiptext="${esc(`${new Date(last.date).toLocaleString()} · ${last.hash}: ${last.subject}`)}" data-ago-short="${esc(last.date)}">${esc(fmtAgeShort(age(last.date)))}</span>` : "<span class=\"muted\">none found</span>"}</td>
        <td class="num ncom">${m.commits.length}</td></tr>`;
	}
	const noHover = () => window.matchMedia?.("(hover: none)").matches ?? false;
	$("rows").addEventListener("click", (e) => {
		if (noHover()) {
			const cell = e.target.closest("td.c");
			if (cell && !cell.classList.contains("is-armed") && !e.target.closest("button, input")) {
				e.stopPropagation();
				$("rows").querySelectorAll("td.c.is-armed").forEach((x) => x.classList.remove("is-armed"));
				if (cell.querySelector(".cellrun")) {
					cell.classList.add("is-armed");
					return;
				}
			}
		}
		const tick = e.target.closest("[data-pick]");
		if (tick) {
			e.stopPropagation();
			tick.checked ? PICKED.add(tick.dataset.pick) : PICKED.delete(tick.dataset.pick);
			renderRows();
			paintHeadRuns();
			return;
		}
		const gtick = e.target.closest("[data-pick-grp]");
		if (gtick) {
			e.stopPropagation();
			const ids = (view0(gtick.dataset.pickGrp) ?? []).map((m) => m.id);
			for (const id of ids) gtick.checked ? PICKED.add(id) : PICKED.delete(id);
			renderRows();
			paintHeadRuns();
			return;
		}
		const un = e.target.closest("[data-untick]");
		if (un) {
			e.stopPropagation();
			for (const m of view0(un.dataset.untick) ?? []) PICKED.delete(m.id);
			renderRows();
			paintHeadRuns();
			return;
		}
		const bad = e.target.closest("[data-show-bad]");
		if (bad) {
			e.stopPropagation();
			showBad(bad.dataset.showBad);
			return;
		}
		const cp = e.target.closest("[data-copy]");
		if (cp) {
			e.stopPropagation();
			copyHash(cp);
			return;
		}
		const ck = e.target.closest("[data-ck]");
		if (ck) {
			e.stopPropagation();
			const now = ck.getAttribute("aria-expanded") !== "true";
			ckOpen.set(ckKey(ck.dataset.ckModel, ck.dataset.ck), now);
			ck.setAttribute("aria-expanded", String(now));
			ck.closest(".ck")?.classList.toggle("is-open", now);
			const body = document.getElementById(ck.getAttribute("aria-controls"));
			if (body) body.hidden = !now;
			return;
		}
		const b = e.target.closest("[data-grp]");
		if (!b) return;
		e.stopPropagation();
		const k = b.dataset.grp;
		const opening = b.getAttribute("aria-expanded") !== "true";
		if (filteringNow()) foldView.fold[k] = !opening;
		else {
			groupState[k] = opening;
			saveGroups();
		}
		renderRows();
		$("rows").querySelector(`[data-grp="${CSS.escape(k)}"]`)?.focus({ preventScroll: true });
	});
	const setAll = (v) => {
		for (const g of L?.groups ?? []) if (filteringNow()) foldView.fold[g.key] = !v;
		else groupState[g.key] = v;
		if (!filteringNow()) saveGroups();
		renderRows();
	};
	$("fold-all").addEventListener("click", (e) => setAll(e.currentTarget.dataset.act === "open"));
	/** The models of one group that the current filters leave on screen. */
	let SECTIONS = [];
	const view0 = (key) => SECTIONS.find((g) => g.key === key)?.models;
	function renderRows() {
		ensureBad();
		const f = view();
		const matching = L.models.filter((m) => passes(m, f));
		const hidden = L.models.length - matching.length;
		Math.min(limit, matching.length);
		const glabel = (L.groups ?? []).find((g) => g.key === group)?.label ?? group;
		[
			blk ? `“${BLK.get(blk)?.chip ?? chipLabel(blk)}”` : "",
			filter !== "all" ? `status “${filter}”` : "",
			group !== "all" ? `group “${glabel}”` : "",
			...[...tags].map((t) => `#${t}`),
			query.trim() ? `search “${query.trim()}”` : ""
		].filter(Boolean).join(", ");
		const filtering = blk !== null || filter !== "all" || group !== "all" || tags.size > 0 || query.trim() !== "";
		const flat = filtering && matching.length <= FLAT_BELOW;
		const sections = flat ? [{
			key: null,
			models: matching
		}] : groupSections(matching);
		SECTIONS = sections;
		const viewKey = JSON.stringify([
			blk,
			filter,
			group,
			[...tags],
			query.trim()
		]);
		if (viewKey !== foldView.key) foldView = {
			key: viewKey,
			fold: {}
		};
		const isOpen = (g) => !g.key ? true : filtering ? !foldView.fold[g.key] : groupOpen(g);
		let budget = limit, html = "", drawn = 0, cut = 0, folded = 0, foldedGroups = 0;
		for (const g of sections) {
			const opened = isOpen(g);
			if (!opened) {
				folded += g.models.length;
				foldedGroups++;
			}
			if (g.key && budget <= 0) {
				cut += g.models.length;
				continue;
			}
			if (g.key) html += groupRow(g, opened);
			if (!opened) continue;
			for (const m of g.models) {
				if (budget <= 0) {
					cut++;
					continue;
				}
				budget--;
				drawn++;
				const onRow = BARS.model.get(m.id) ?? [];
				html += modelRow(m, flat) + (onRow.length ? `<tr class="detail detail--run" style="--gc:${gcFor(m.group ?? "")}"><td colspan="${colCount()}">${onRow.map(([k, pr]) => runBar(k, pr, m.title)).join("")}</td></tr>` : open.has(m.id) ? `<tr class="detail" style="--gc:${gcFor(m.group ?? "")}"><td colspan="${colCount()}">${detail(m)}</td></tr>` : "");
			}
		}
		const paintMixed = () => $("rows").querySelectorAll("[data-mixed]").forEach((x) => {
			x.indeterminate = true;
		});
		const wide = (BARS.suite ?? []).map(([k, pr]) => runBar(k, pr, "every model")).join("");
		if (wide) html = `<tr class="suiterun"><td colspan="${colCount()}">${wide}</td></tr>` + html;
		$("rows").innerHTML = html || `<tr class="empty"><td colspan="${colCount()}" class="muted">No model matches.${hidden ? " Every model is hidden by the filters above." : ""}</td></tr>`;
		paintMixed();
		$("clear")?.addEventListener("click", () => {
			blk = null;
			filter = "all";
			group = "all";
			tags.clear();
			query = "";
			limit = PAGE;
			saveView();
			render();
		});
		$("grp-acts").hidden = flat;
		{
			const fb = $("fold-all"), opening = foldedGroups > 0 || sections.every((g) => !g.key);
			fb.dataset.act = opening ? "open" : "close";
			fb.textContent = opening ? "Expand all" : "Collapse all";
			fb.title = opening ? "Open every group" : "Fold every group";
		}
		const rest = cut;
		if (rest > 0) $("rows").insertAdjacentHTML("beforeend", `<tr class="more"><td colspan="${colCount()}"><button type="button" class="btn" id="more">Show ${Math.min(PAGE, rest)} more <small>${rest} not on screen yet</small></button></td></tr>`);
		$("rows").querySelectorAll("tr.row").forEach((tr) => {
			const toggle = () => {
				const id = tr.dataset.id;
				open.has(id) ? open.delete(id) : open.add(id);
				saveView();
				renderRows();
				document.querySelector(`tr.row[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
			};
			tr.addEventListener("click", (e) => {
				if (e.target.closest("button, input, a, label")) return;
				toggle();
			});
			tr.addEventListener("keydown", (e) => {
				if (e.target === tr && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					toggle();
				}
			});
		});
		moreObserver?.disconnect();
		const more = $("more");
		if (more) {
			const grow = () => {
				limit += PAGE;
				saveView();
				renderRows();
			};
			more.addEventListener("click", grow);
			if ("IntersectionObserver" in window) {
				moreObserver = new IntersectionObserver((es) => {
					if (es.some((e) => e.isIntersecting)) {
						moreObserver.disconnect();
						grow();
					}
				}, { rootMargin: "600px 0px" });
				moreObserver.observe(more);
			}
		}
		flash = /* @__PURE__ */ new Set();
		justApproved = /* @__PURE__ */ new Set();
		$("rows").classList.toggle("many", drawn > 40);
		stickyOffsets();
	}
	const ckOpen = /* @__PURE__ */ new Map();
	const ckKey = (id, name) => `${id}\u0000${name}`;
	const ckDefault = (r) => [
		"fail",
		"flag",
		"broke"
	].includes(markKind(r)[0]) || Boolean(r?.stale);
	const ckIsOpen = (id, name, r) => ckOpen.get(ckKey(id, name)) ?? ckDefault(r);
	/** A hash short enough to read, with the whole thing one click away. Nothing is lost, only folded. */
	const hashBit = (label, full, note) => full ? `<span class="hsh">${esc(label)} <code>${esc(String(full).slice(0, 7))}</code><button type="button" class="copyb" data-copy="${esc(full)}" aria-label="${esc(`Copy the full ${label} ${full}`)}" data-tip data-tiptext="${esc(`${full}${note ? `. ${note}` : ""}`)}">${COPYICON}</button></span>` : `<span class="hsh">${esc(label)} <b class="muted">none found</b></span>`;
	/** What a run was told to do, in one line: the check, its flags, and how many models it covered.
	The ids themselves are the long part, so they fold away behind a disclosure rather than going. */
	function howItRan(name, r, id) {
		const args = r.args ?? [];
		if (!args.length) return "<p class=\"check__how muted\">How it ran: not recorded.</p>";
		const flags = args.filter((a) => String(a).startsWith("-"));
		const rest = args.filter((a) => !String(a).startsWith("-") && !String(a).startsWith(".") && !String(a).includes("/"));
		const paths = args.filter((a) => !String(a).startsWith("-") && (String(a).startsWith(".") || String(a).includes("/")));
		const over = rest.length ? `over ${rest.length} model${rest.length === 1 ? "" : "s"}` : "";
		return `<p class="check__how muted">How it ran: <code>${esc(GATE_NAME[name] ?? name)}</code>` + (flags.length ? ` <code>${esc(flags.join(" "))}</code>` : "") + (over ? ` · ${esc(over)}` : "") + "</p>" + (rest.length || paths.length ? `<details class="argfold"><summary>the full argument list (${args.length})</summary><div class="qids">${args.map((a) => `<code class="mid${String(a).startsWith("-") || String(a).includes("/") ? " not-id" : ""}">${esc(a)}</code>`).join("")}</div></details>` : "");
	}
	function detail(m) {
		const parts = [];
		parts.push(`<div class="mdet">
      <div class="mdet__ids">${hashBit("fingerprint", m.fingerprint, "the source this model’s results are judged against")}${hashBit("converting commit", m.convertingCommit, "the commit that first set --u in vmin")}<span class="hsh">snippet ${m.snippet ? `<code>${esc(m.snippet.file)}:${esc(m.snippet.line)}</code>${m.snippet.foundBy !== "grep" ? ` <span class="muted">(${esc(m.snippet.foundBy)})</span>` : ""}` : "<b class=\"muted\">not found</b>"}</span></div>
      ${m.approved ? "" : `<p class="mdet__miss"><b>Missing:</b> ${m.missing.map((x) => esc(x)).join(" · ")}</p>`}
    </div>`);
		for (const n of m.notes) parts.push(`<div class="notice">${esc(n)}</div>`);
		parts.push("<h3>Checks: last known result</h3><ul class=\"cks\">" + Object.entries(m.checks).map(([name, r]) => {
			const [kind, word] = markKind(r);
			const id = `ck-${m.id}-${name}`;
			const op = ckIsOpen(m.id, name, r);
			const never = r.status === "never";
			const body = never ? "<p class=\"muted\">No captured run has reported this model.</p>" : `${r.stale ? `<p class="ck__stale"><b>Stale.</b> ${esc(r.staleWhy.join("; "))}.</p>` : ""}
          ${r.flags?.length ? `<ul class="ck__list">${r.flags.map((f) => `<li>${esc(f.flag)} ${f.resolved ? `<span class="chip s-chk">false alarm</span> <span class="muted">${esc(f.by)}: ${esc(f.reason)}</span>` : "<span class=\"chip s-warn\">open</span>"}</li>`).join("")}</ul>` : ""}
          ${r.detail?.length ? `<ul class="ck__list">${r.detail.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
          ${name === "exports" ? "<p class=\"muted ck__note\">This verdict is for the default settings only. Other settings, if this run made any, are in the export matrix under Docs and release readiness.</p>" : ""}
          <p class="ck__when">Ran ${agoSpan(r.ranAt)}${r.ranAt ? ` <span data-tip data-tiptext="${esc(new Date(r.ranAt).toLocaleString())}">(${esc(String(r.ranAt).slice(0, 16).replace("T", " "))})</span>` : ""} at ${r.commit ? `<code>${esc(r.commit)}</code>` : "a HEAD it did not record"}</p>
          ${howItRan(name, r)}`;
			return `<li class="ck${op ? " is-open" : ""}${[
				"fail",
				"flag",
				"broke"
			].includes(kind) ? " is-bad" : ""}">
        <button type="button" class="ck__row" data-ck="${esc(name)}" data-ck-model="${esc(m.id)}" aria-expanded="${op}" aria-controls="${esc(id)}">
          <span class="mk mk--${kind}" aria-hidden="true">${MARKS[kind][0]}</span>
          <b class="ck__name">${esc(CHECK_NAMES[name] ?? name)}</b>
          <span class="ck__verdict">${esc(word)}</span>
          <span class="ck__sum">${esc(never ? "never reported" : r.summary)}</span>
          <span class="ck__chev" aria-hidden="true">${ssChevron}</span>
        </button>
        <div class="ck__body" id="${esc(id)}"${op ? "" : " hidden"}>${body}</div></li>`;
		}).join("") + "</ul>");
		const byDiff = m.commits.filter((c) => c.matchedBy.includes("diff")).length;
		parts.push(`<h3>Commits (${m.commits.length}: ${byDiff} by diff, ${m.commits.length - byDiff} by subject only)</h3>
      <p class="muted" style="font-size:13px">“diff” means the commit changed this model's own entries. A subject-only match names the id or title and may be about another model with a similar name.</p>`);
		parts.push(m.commits.length ? `<ul class="commits">${m.commits.map((c) => `<li><code>${esc(c.hash)}</code> <span class="muted num">${esc(c.date.slice(0, 16).replace("T", " "))}</span> ${esc(c.subject)}
      ${c.matchedBy.map((x) => `<span class="tag ${x === "diff" ? "strong" : ""}">${esc(x)}</span>`).join("")}
      ${c.hash === m.convertingCommit ? "<span class=\"tag strong\">converting</span>" : ""}
      ${c.review ? "<span class=\"tag strong\">review</span>" : ""}${c.textReview ? "<span class=\"tag strong\">text review</span>" : ""}
      ${c.modelsTouched > 5 ? `<span class="tag">broad: touches ${c.modelsTouched} models</span>` : ""}</li>`).join("")}</ul>` : "<p class=\"muted\">No commit found.</p>");
		return parts.join("");
	}
	const CL_STATE = {
		"true": [
			"holds now",
			"s-chk",
			"✓"
		],
		"true-ticked": [
			"holds now · ticked",
			"s-chk",
			"✓"
		],
		"false": [
			"fails now",
			"s-bad",
			"✗"
		],
		conflict: [
			"ticked, but its proof fails now",
			"s-bad",
			"!"
		],
		"ticked-unproven": [
			"done · not re-proved here",
			"s-chk",
			"✓"
		],
		stale: [
			"needs running again on this commit",
			"s-warn",
			"↻"
		],
		"not-evaluated": [
			"not evaluated here",
			"s-none",
			""
		]
	};
	/**
	* DONE MEANS DONE. One predicate, used by the phase strip, the group headings, the summary and
	* the filters, so they cannot disagree with each other — which they did, three separate times,
	* each time by counting something slightly different.
	*
	* A tick in the file is not enough: an item whose proof fails, or whose proof was run on a
	* commit where the code it tests has changed since, is not done. That is the same rule the model
	* checks have always had, and the reason `approved` fell from 135 to 0 when preview.ts changed.
	*/
	const clDone = (x) => x.done && x.state !== "conflict" && x.state !== "stale" && x.result !== "false";
	/**
	* THE THREE PHASES, which is the only question a person releasing actually has.
	*
	* The labels above answer the LEDGER's question -- did I re-prove this just now. That is the
	* right question for the ledger and the wrong one for whoever is about to push: they read
	* "not evaluated here" on an item that was run last night and think it is waiting for them.
	* So each item is also placed in one of three phases, and the dialog leads with those.
	*
	* A phase comes from the item's own `## ` section, so the markdown stays the source of truth.
	*/
	const CL_PHASE = (item) => item.group === "Yours" ? "yours" : item.group === "After the push" ? "after" : "before";
	const CL_PHASES = [
		[
			"before",
			"Before the push",
			"Run by a script, or by an agent running one. Each carries what it printed, in its own line. None of it waits for you."
		],
		[
			"yours",
			"Yours",
			"The two a machine has no business answering: is the writing good, and do we publish."
		],
		[
			"after",
			"After the push",
			"Cannot be true until the site is live. Nothing here blocks the push — they are what is checked once it has happened."
		]
	];
	/** What an item is waiting for, in the words of someone about to release. */
	function clWaitingOn(item) {
		const phase = CL_PHASE(item);
		if (item.state === "conflict" || item.result === "false") return ["needs a look", "s-bad"];
		if (item.state === "stale") return ["run it again", "s-warn"];
		if (clDone(item)) return ["done", "s-chk"];
		if (phase === "yours") return ["waiting for you", "s-warn"];
		if (phase === "after") return ["waits for the push", "s-none"];
		return ["still to do", "s-warn"];
	}
	let clFilter = "all";
	function renderChecklist() {
		const cl = L.readiness?.checklist;
		const btn = $("cl-btn");
		btn.hidden = false;
		if (!cl || !cl.exists) {
			btn.innerHTML = "Release checklist <small>· not written yet</small>";
			$("cl-sum").textContent = "";
			$("cl-body").innerHTML = `<div class="notice"><b class="big">No checklist yet.</b> <code>${esc(cl?.file ?? "docs/RELEASE-CHECKLIST.md")}</code> does not exist, so there is nothing to show. Lines in it look like <code>- [ ] item — how to prove it</code>.</div>`;
			return;
		}
		const evald = cl.proven != null;
		btn.classList.toggle("has-false", Boolean(cl.provenFalse || cl.conflicts));
		const pc = (x) => `${(x / (cl.total || 1) * 100).toFixed(1)}%`;
		const provenPart = cl.proven ?? 0;
		const tickedPart = Math.max(provenPart, Math.min(cl.total ?? 0, cl.done ?? 0));
		for (const el of [btn, $("cl-bar")]) {
			if (!el) continue;
			el.classList.add("clfill");
			el.style.setProperty("--cl-proven", pc(provenPart));
			el.style.setProperty("--cl-ticked", pc(tickedPart));
			el.style.setProperty("--cl-false", pc(cl.provenFalse ?? 0));
		}
		const key = $("cl-key");
		if (key) key.innerHTML = `<span><i class="k-proven"></i><b>${provenPart}</b> proven here</span><span><i class="k-ticked"></i><b>${Math.max(0, tickedPart - provenPart)}</b> ticked, not proven here</span>` + (cl.provenFalse ? `<span><i class="k-false"></i><b>${cl.provenFalse}</b> contradicted by its proof</span>` : "") + `<span><i class="k-open"></i><b>${Math.max(0, (cl.total ?? 0) - tickedPart - (cl.provenFalse ?? 0))}</b> still open</span>`;
		btn.innerHTML = evald ? (() => {
			const stuck = cl.items.filter((x) => !clDone(x));
			const staleN = stuck.filter((x) => x.state === "stale").length;
			const badN = stuck.filter((x) => x.state === "conflict" || x.result === "false").length;
			const bits = [staleN ? `${staleN} to run again` : "", badN ? `<b data-cl-jump="attention" title="Show just these">${badN} need${badN === 1 ? "s" : ""} a look</b>` : ""].filter(Boolean);
			return `Release checklist <small>· ${cl.total - stuck.length} of ${cl.total} done${bits.length ? `, ${bits.join(", ")}` : ""}</small>`;
		})() : `Release checklist <small>· ${cl.done} of ${cl.total} ticked (not evaluated: this ledger predates it)</small>`;
		$("cl-sum").innerHTML = evald ? (() => {
			const stuck = cl.items.filter((x) => !clDone(x));
			const staleN = stuck.filter((x) => x.state === "stale").length;
			const badN = stuck.filter((x) => x.state === "conflict" || x.result === "false").length;
			const why = [staleN ? `${staleN} to run again since the code they test changed` : "", badN ? `${badN} ticked but contradicted by their own proof` : ""].filter(Boolean).join(", ");
			return `${stuck.length ? `<b>${cl.total - stuck.length} of ${cl.total} done.</b> ${stuck.length} to go${why ? ` — ${why}` : ""}.` : `<b>All ${cl.total} done.</b>`} <span class="muted">Of those done, ${cl.proven} were re-proved by this ledger just now; the rest are slow, networked or need a person, and carry what they printed in their own line. A tick is a claim; only a proof run here counts as proven. From <code>${esc(cl.file)}</code>, as of the ledger built ${agoSpan(L.generatedAt)}.</span>`;
		})() : `${cl.done} of ${cl.total} ticked in the file. This ledger was built before items were evaluated.`;
		const CL_FILTERS = [
			[
				"attention",
				"needs a look",
				(x) => x.state === "conflict" || x.state === "stale" || x.result === "false"
			],
			[
				"open",
				"still to do",
				(x) => !clDone(x)
			],
			[
				"all",
				"everything",
				() => true
			]
		];
		const pick = clFilter.startsWith("phase:") ? [
			clFilter,
			CL_PHASES.find((p) => p[0] === clFilter.slice(6))?.[1] ?? clFilter,
			(x) => CL_PHASE(x) === clFilter.slice(6)
		] : CL_FILTERS.find((f) => f[0] === clFilter) ?? CL_FILTERS[CL_FILTERS.length - 1];
		const phaseOf = CL_PHASES.map(([key, name, why]) => {
			const items = cl.items.filter((x) => CL_PHASE(x) === key);
			const done = items.filter(clDone).length;
			return {
				key,
				name,
				why,
				items,
				done,
				left: items.length - done
			};
		});
		const here = phaseOf.find((p) => p.left > 0)?.key ?? null;
		const firstOpen = phaseOf.findIndex((p) => p.left > 0);
		const shutFrom = firstOpen === -1 ? phaseOf.length : firstOpen + 1;
		$("cl-steps").innerHTML = phaseOf.map((p, i) => {
			const shut = i >= shutFrom;
			const state = p.left === 0 ? "is-done" : p.key === here ? "is-here" : shut ? "is-shut" : "is-later";
			const mark = p.left === 0 ? "✓" : shut ? "🔒" : String(i + 1);
			const blockers = firstOpen === -1 ? [] : phaseOf[firstOpen].items.filter((x) => !clDone(x));
			const tip = shut ? `${p.name} — shut until "${phaseOf[firstOpen].name}" is green. ${blockers.length} left there: ${blockers.map((b) => b.item.split(" — ")[0]).slice(0, 4).join("; ")}` : `${p.name} — ${p.why}${p.key === here ? " This is where the release has got to." : ""}`;
			return `<li class="clstep__i ${state}"><button type="button" data-cl-phase="${p.key}" aria-pressed="${clFilter === "phase:" + p.key}" title="${esc(tip)}">
        <span class="clstep__n" aria-hidden="true">${mark}</span>
        <span class="clstep__t">${esc(p.name)}${p.key === here ? " ·" : ""}</span>
        <span class="clstep__c">${p.done}/${p.items.length}</span></button></li>`;
		}).join("");
		$("cl-filter").innerHTML = CL_FILTERS.map(([key, words, test]) => {
			const n = cl.items.filter(test).length;
			if (!n && key !== "all") return "";
			return `<button type="button" class="clfilter__b${clFilter === key ? " is-on" : ""}${key === "attention" && n ? " is-bad" : ""}" data-cl-filter="${key}" aria-pressed="${clFilter === key}">${words} <b>${n}</b></button>`;
		}).join("");
		const shown = cl.items.filter(pick[2]);
		const groups = [];
		for (const x of shown) {
			let g = groups.find((y) => y.name === x.group);
			if (!g) groups.push(g = {
				name: x.group,
				items: []
			});
			g.items.push(x);
		}
		if (!shown.length) $("cl-body").innerHTML = `<p class="muted">Nothing under “${esc(pick[1])}”.</p>`;
		else $("cl-body").innerHTML = groups.map((g) => {
			const stuck = g.items.filter((x) => !clDone(x));
			const head = clFilter === "all" ? stuck.length ? `· ${g.items.length - stuck.length} of ${g.items.length} done · ${stuck.length} to go` : `· all ${g.items.length} done` : `· ${g.items.length} shown of ${cl.items.filter((x) => x.group === g.name).length}`;
			return `<h3>${esc(g.name ?? "Items")} <span class="muted" style="text-transform:none;letter-spacing:0">${head}</span></h3>
      <ul class="cl">${g.items.map((x) => {
				const [, , mark] = CL_STATE[x.state] ?? CL_STATE["not-evaluated"];
				const [waits, waitsCls] = clWaitingOn(x);
				const proof = x.proof ?? "";
				const named = [...proof.matchAll(/(?:re-?run|re-?checked|redeployed|drafted|taken)\b[^.]{0,40}?(20\d\d-\d\d-\d\d)/gi)].pop();
				const all = [...proof.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)].pop();
				const ran = named ?? all;
				const when = x.result === "true" || x.result === "false" ? ` <span class="clwhen">checked ${agoSpan(L.generatedAt)}</span>` : ran ? ` <span class="clwhen">noted ${ran[1]}</span>` : "";
				const said = x.result === "not-evaluated" ? `<span class="muted found">Not evaluated here: ${esc(x.why)}.</span>` : `<span class="found${x.result === "false" ? " bad" : ""}">Found: ${esc(x.found)}</span>`;
				return `<li class="st-${esc(x.state ?? "not-evaluated")}"><span class="box" aria-hidden="true">${mark}</span>
          <div><b>${esc(x.item)}</b> <span class="chip ${waitsCls}">${esc(waits)}</span>${when}<br>${said}
            ${x.proof ? `<details class="proofbox"><summary>Proof (${Math.round(x.proof.length / 5)} words)</summary><span class="proofline">${esc(x.proof)}</span></details>` : "<span class=\"proofline proofline--none\">No way to prove it is written down.</span>"}</div>
          <code class="muted">:${x.line}</code></li>`;
			}).join("")}</ul>`;
		}).join("");
	}
	/**
	* The two checks that judge the site rather than a model.
	*
	* They have no row in a table of models, so they keep one line of their own: what each found, and
	* a button to run it. Everything else runs from the table.
	*/
	function renderSiteChecks() {
		const el = $("sitechecks");
		if (!el) return;
		const site = CHECK_LIST.filter((c) => c.scope === "site");
		if (!site.length) {
			el.hidden = true;
			el.innerHTML = "";
			return;
		}
		el.hidden = false;
		const bars = Object.fromEntries(BARS.site ?? []);
		el.innerHTML = site.map((c) => {
			const t = c.tally ?? {};
			const total = c.total ?? 0;
			const bad = (t.fail ?? 0) + (t.broke ?? 0);
			if (bars[c.key]) return `<span class="sitechk__one is-running"><b>${esc(c.short)}</b><span class="sitechk__said">running</span></span>`;
			const said = !c.captured ? "not run here" : total ? `${t.pass ?? 0}/${total}` : "—";
			const when = c.lastRun?.finishedAt ? ` Last run ${ago(c.lastRun.finishedAt)}${c.lastRun.commit ? ` at ${c.lastRun.commit}` : ""}.` : "";
			const tip = `${c.title}: ${said} ${c.unit ?? "pages"} clear.${when} It judges the site, not any model, and gates nothing.`;
			return `<span class="sitechk__one${bad ? " is-bad" : ""}" data-tip data-tiptext="${esc(tip)}">
        <b>${esc(c.short)}</b><span class="sitechk__said">${esc(said)}</span>
        ${runBtn(c.key, [], `Run ${c.title}`, "cellrun")}</span>`;
		}).join("");
		renderSiteRuns(site, bars);
	}
	/** The full-width bar under the header for whichever site check is running, or nothing. */
	function renderSiteRuns(site, bars) {
		const el = $("siteruns");
		if (!el) return;
		const live = site.filter((c) => bars[c.key]);
		if (!live.length) {
			el.hidden = true;
			el.innerHTML = "";
			return;
		}
		el.hidden = false;
		el.innerHTML = live.map((c) => runBar(c.key, bars[c.key], c.unit ?? "pages")).join("");
	}
	/**
	* The per-check run buttons, for the width where there are no column headings to hold them.
	*
	* A heading carries the button that runs its check over every model. Below 760px the table is
	* a list of cards, the headings are not drawn, and those nine controls went with them -- so on
	* a phone you could run one check on one model, or everything on everything, and nothing in
	* between. This is the same nine buttons and the same runBtn, in a row of their own, with each
	* check named because there is no column above to say which is which.
	*/
	function renderColRuns() {
		const el = $("colruns");
		if (!el) return;
		if (!RUN_OK || !COLS.length) {
			el.hidden = true;
			el.innerHTML = "";
			return;
		}
		el.hidden = false;
		el.innerHTML = "<span class=\"colruns__h\">Run over every model</span>" + runBtn("all", [], "Run every check over every model", "colrun colrun--all", "Every check") + COLS.map(([k, label]) => runBtn(k, [], `Run ${label} on every model`, "colrun", label)).join("");
	}
	/** Opens the machine panel, filled from the last poll so the numbers are the ones on the chip. */
	function openMachine() {
		const d = $("mach-dialog");
		if (!d) return;
		$("mach-body").innerHTML = machineModal();
		if (!d.open) {
			if (typeof d.showModal === "function") d.showModal();
			else d.setAttribute("open", "");
		}
		$("mach-close")?.focus();
	}
	/** Opens the definitions at one check's entry. */
	function openDef(key) {
		const d = $("rules-dialog");
		if (!d.open) {
			if (typeof d.showModal === "function") d.showModal();
			else d.setAttribute("open", "");
		}
		const dt = document.getElementById(`def-${key}`);
		document.querySelectorAll(".defs dt.is-lit").forEach((x) => x.classList.remove("is-lit"));
		if (dt) {
			dt.classList.add("is-lit");
			dt.scrollIntoView({ block: "start" });
			dt.setAttribute("tabindex", "-1");
			dt.focus({ preventScroll: true });
		}
		defFrom = document.querySelector(`[data-def="${CSS.escape(key)}"]`);
	}
	let defFrom = null;
	document.addEventListener("click", (e) => {
		const b = e.target.closest?.("[data-def]");
		if (b && L) {
			e.stopPropagation();
			openDef(b.dataset.def);
		}
	});
	function renderRules() {
		const c = L.counts, s = L.sources;
		const buckets = c.buckets ?? [];
		const B = (key) => buckets.find((b) => b.key === key);
		const sum = buckets.reduce((a, b) => a + b.count, 0);
		const gates = s.gateRules ?? [];
		const dd = (html) => `<dd>${html}</dd>`;
		const n = (x) => `<span class="n">${esc(x)}</span>`;
		const firsts = (b) => !b?.parts ? "" : `${b.parts.filter((p) => p.count).map((p) => `${esc(p.label)} ${n(p.count)}`).join(", ") || "none"}; these sum to ${n(b.partsSum)}${b.partsBalance ? " ✓" : `, not ${n(b.count)} ✗`}`;
		$("rules-body").innerHTML = `
      <h3>The two states</h3>
      <p class="muted" style="font-size:14px">Every model is in exactly one of these. The strip at the top is not these two: it is one step per check, ending here — it shows how many models each check has cleared on the code as it is now, and how many have cleared all of them. Nothing in the strip is a control; picking a model is what the table below is for.</p>
      <dl class="defs">
        ${["approved", "to check"].map((k) => B(k)).filter(Boolean).map((b) => `<dt>${esc(b.label)} ${n(b.count)}</dt>${dd(`${esc(b.means ?? "")}.`)}`).join("")}
        <dt id="def-sum">The numbers add up ${n(c.balance?.ok ? "✓" : "✗")}</dt>
        ${dd(`${buckets.map((b) => `${n(b.count)} ${esc(b.label.toLowerCase())}`).join(" + ")} = ${n(sum)}, and there are ${n(c.models)} models. <code>scripts/ledger.mjs</code> fails the build if these differ, if a first-reason split below does not add up, or if what holds a model back does not match its state.${c.balance?.problems?.length ? ` Now: <b>${c.balance.problems.map(esc).join("; ")}</b>.` : ""}`)}
      </dl>
      <h3>What’s holding models back</h3>
      <p class="muted" style="font-size:14px">The list behind the <b>What’s holding models back</b> button at the top. Each row counts the models one reason holds back, and clicking it shows exactly those models in the table. The rows <b>overlap</b>: a model held by two checks is counted under both, so they do not add up to the model count. “Held by this alone” counts the models with no other reason, the ones that move on once it is fixed. “Passed on older code” is one row for all checks, with the count per check in it; the check bars below split it per check. Rows are largest first.</p>
      <dl class="defs">
        ${(s.holdKinds ?? []).map((k) => `<dt>${esc(cap(k.label))}</dt>${dd(`${esc(k.means)}.${k.key === "broke" ? " A crash says nothing about the model, so it is never counted as failed: not in the bars, not in the marks, not in the counts." : ""}`)}`).join("")}
        ${B("to check")?.parts ? `<dt>First reason, in gate order</dt>${dd(`The ledger also files each model under the first thing that holds it, in the gate order below. Unlike the rows above, these do add up. ${esc(B("to check").label)}: ${firsts(B("to check"))}.`)}` : ""}
      </dl>
      <h3>The checks, in gate order</h3>
      <p class="muted" style="font-size:14px">${esc(s.gates ?? "")}.</p>
      <dl class="defs">${gates.map((g, i) => `<dt id="def-${esc(g.key)}">${i + 1}. ${esc(g.label)} <span class="muted" style="font-weight:500">(column “${esc(CHECK_LIST.find((c) => c.key === g.key)?.short ?? g.key)}”)</span></dt>${dd(`${esc(g.rule)}. From ${esc(g.source)}.`)}`).join("")}</dl>
      ${CHECK_LIST.some((c) => c.scope === "site") ? `<h3>Site checks</h3><p class="muted" style="font-size:14px">Counted in pages, shown in the Site block; they do not gate any model.</p><dl class="defs">${CHECK_LIST.filter((c) => c.scope === "site").map((c) => `<dt id="def-${esc(c.key)}">${esc(c.title)}</dt>${dd(`${esc(c.rule)}. ${c.captured ? `${c.total} pages` : `Not run yet; ${c.total ?? "an unknown number of"} pages to judge`}.`)}`).join("")}</dl>` : ""}
      <h3>When a result stops counting</h3>
      <dl class="defs">
        ${s.staleness ? `<dt id="def-stale">When a result goes stale</dt>${dd(esc(s.staleness))}` : ""}
      </dl>
      <p class="muted" style="font-size:14px">Every model is in exactly one state, so the two above are the whole count. There is no running total to keep: there is nothing to have reached.</p>`;
	}
	/** A dialog opened by a button: closed by its × button, Escape or a backdrop click; focus goes back to the button. */
	function wireDialog(d, open, close) {
		open.addEventListener("click", () => {
			if (typeof d.showModal === "function") d.showModal();
			else d.setAttribute("open", "");
			close.focus();
		});
		close.addEventListener("click", () => d.close());
		d.addEventListener("click", (e) => {
			if (e.target === d) d.close();
		});
		d.addEventListener("close", () => open.focus({ preventScroll: true }));
		d.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && d.open) {
				e.preventDefault();
				d.close();
			}
		});
	}
	wireDialog($("rules-dialog"), $("rules-btn"), $("rules-close"));
	const dlg = $("cl-dialog");
	$("cl-btn").addEventListener("click", (e) => {
		clFilter = e.target.closest("[data-cl-jump]")?.dataset.clJump ?? "all";
		renderChecklist();
		if (typeof dlg.showModal === "function") dlg.showModal();
		else dlg.setAttribute("open", "");
		$("cl-close").focus();
	});
	$("cl-filter").addEventListener("click", (e) => {
		const b = e.target.closest("[data-cl-filter]");
		if (!b) return;
		clFilter = b.dataset.clFilter;
		renderChecklist();
	});
	$("cl-steps").addEventListener("click", (e) => {
		const b = e.target.closest("[data-cl-phase]");
		if (!b) return;
		const key = `phase:${b.dataset.clPhase}`;
		clFilter = clFilter === key ? "all" : key;
		renderChecklist();
	});
	$("cl-close").addEventListener("click", () => dlg.close());
	dlg.addEventListener("click", (e) => {
		if (e.target === dlg) dlg.close();
	});
	dlg.addEventListener("close", () => $("cl-btn").focus({ preventScroll: true }));
	dlg.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && dlg.open) {
			e.preventDefault();
			dlg.close();
		}
	});
	function renderReadiness() {
		const R = L.readiness;
		if (!R) {
			$("readiness").innerHTML = "<p class=\"muted\">This ledger was built before it recorded readiness. It fills in on the next build.</p>";
			return;
		}
		const cl = R.checklist;
		const pct = cl.total ? 100 * cl.done / cl.total : 0;
		!cl.exists ? `${esc(cl.file)}` : !cl.total ? `${esc(cl.file)}` : `${cl.done}${cl.total}${esc(cl.file)}${pct}${cl.items.map((x) => `<li class="${x.done ? "is-done" : ""}"><span class="box" aria-hidden="true">${x.done ? "✓" : ""}</span><span class="visually-hidden">${x.done ? "done:" : "not done:"}</span><div><b>${esc(x.item)}</b>${x.proof ? `<br><span class="muted">Proof: ${esc(x.proof)}</span>` : "<br><span class=\"muted\">No way to prove it is written down.</span>"}</div><code class="muted">:${x.line}</code></li>`).join("")}`;
		const days = (iso) => iso ? (Date.now() - Date.parse(iso)) / 864e5 : null;
		const docs = `<div class="table-wrap"><table class="mini"><thead><tr><th>Document</th><th>Last commit</th><th>Subject</th></tr></thead><tbody>${R.docs.map((d) => {
			const c = d.lastCommit;
			const old = c && days(c.date) > 7;
			return `<tr><td><code>${esc(d.path)}</code></td><td class="num">${c ? `${esc(c.date.slice(0, 10))} <span class="muted">(${agoSpan(c.date)})</span>${old ? " <span class=\"chip s-warn\">over a week</span>" : ""}` : "<span class=\"chip s-warn\">never committed</span>"}</td><td>${c ? `<code class="muted">${esc(c.hash)}</code> ${esc(c.subject)}` : "—"}</td></tr>`;
		}).join("")}</tbody></table></div>`;
		const risk = R.atRisk.length ? `<div class="table-wrap"><table class="mini"><thead><tr><th>File</th><th>State</th><th>Last changed</th></tr></thead><tbody>${R.atRisk.map((f) => `<tr><td><code>${esc(f.path)}</code></td><td><span class="chip ${f.code === "??" ? "s-bad" : "s-warn"}">${esc(f.kind)}</span></td><td class="num">${f.modifiedAt ? agoSpan(f.modifiedAt) : "<span class=\"muted\">gone from disk</span>"}</td></tr>`).join("")}</tbody></table></div>` : "<p>Nothing: every file in the working tree matches a commit.</p>";
		const X = L.exportsMatrix;
		const runLabel = (m) => {
			const a = m.args ?? [];
			const flags = a.filter((x) => x.startsWith("-"));
			const ids = a.filter((x) => !x.startsWith("-"));
			const head = `${flags.join(" ") || "no flags"}${ids.length ? ` · ${ids.length} model${ids.length === 1 ? "" : "s"}` : " · its sample"}${m.sizes ? ` · SIZES=${m.sizes}` : ""}`;
			return ids.length > 3 ? `<details class="runargs"><summary><code class="muted">${esc(head)}</code></summary><code class="muted">${esc(ids.join(" "))}</code></details>` : `<code class="muted">${esc(head)}${ids.length ? `: ${esc(ids.join(" "))}` : ""}</code>`;
		};
		const rows = X?.models ?? [];
		const full = rows.filter((m) => !(m.args ?? []).includes("--defaults"));
		const defaultsOnly = rows.length - full.length;
		const matrix = !X ? "" : `<h3>Exports: default settings per model, the full matrix on a sample</h3>
      <div class="notice info" style="color:var(--text)">${esc(X.note)}</div>
      ${defaultsOnly ? `<p class="muted">For ${defaultsOnly} model${defaultsOnly === 1 ? "" : "s"} the latest export result comes from a <code>--defaults</code> run, which makes only the default settings, so there is nothing for this table to add; their verdicts (pass, fail or didn't run) are in the Export bar and the model table.</p>` : ""}
      ${full.length ? `<div class="table-wrap"><table class="mini"><thead><tr><th>Model</th><th>Run</th><th>Mismatches outside the defaults</th></tr></thead><tbody>${full.map((m) => `<tr><td><code>${esc(m.id)}</code></td><td class="num">${m.ranAt ? agoSpan(m.ranAt) : "—"}<br>${runLabel(m)}</td><td>${m.mismatches.length ? `<ul class="missing">${m.mismatches.map((x) => `<li>${esc(x.check)} ${esc(x.what)}: ${esc(x.detail)}</li>`).join("")}</ul>` : "<span class=\"muted\">none among the settings this run made</span>"}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">${rows.length ? "No model has a full-matrix run on record yet (every setting, on the sample: <code>node scripts/check-exports.mjs</code>)." : "No model has been through check-exports yet."}</p>`}`;
		renderChecklist();
		$("readiness").innerHTML = `${matrix}<h3>Release checklist</h3><p class="muted">It opens from the <b>Release checklist</b> button at the top of the page, with each item's proof run here where that is cheap.</p>
      <h3>Documents: when each last reached a commit</h3>${docs}
      <h3>At risk: work that has not reached a commit (${R.atRisk.length})</h3>
      <p class="muted" style="font-size:13px">From <code>git status</code> at the last build, ${agoSpan(R.at)}; oldest first. Untracked files are in no commit at all. Other agents' work in progress shows here too.</p>${risk}`;
	}
	let RUN_OK = false;
	/**
	* What the board knows is running, for the renderers that draw controls.
	*
	* The controls only existed in the bar at the top, so a check could be running while its own row
	* still offered a play button -- the one control that cannot be right, because pressing it asks
	* to start a thing that has already started.
	*/
	let RUN_NOW = {
		runs: [],
		paused: false,
		max: 2
	};
	let MACHINE = null;
	/** The run of this check, if there is one: { what, label, models, mine, pid }. */
	const runOf = (what) => RUN_NOW.runs.find((r) => r.what === what) ?? null;
	/** What a click asked to start, until the board says it is running. Cleared either way. */
	/**
	* The action a click asked for, until the board's answer proves it happened.
	*
	* Every one takes a moment: starting spawns a process, stopping kills a tree of them, and
	* pausing waits for the model in flight to finish -- which is the point of pausing between
	* models rather than mid-measurement. A control that looks unchanged for two seconds reads as
	* a click that did not land, so all four wait the same way.
	*/
	let PENDING = null;
	const pendingOn = (key) => PENDING && PENDING.key === key ? PENDING.act : null;
	/**
	* What a run is called, everywhere.
	*
	* A click writes this, a button compares against it, and the poll clears it. When the suite wrote
	* 'all' and its button wrote 'all:' the spinner never cleared, because two places were spelling
	* the same run differently -- the shape of half the bugs in this page's history.
	*/
	const runKey = (what, ids = []) => `${what}:${ids.join(",")}`;
	/**
	* Ask the board. A 404 is not an answer.
	*
	* This used to return whatever came back and let the caller set RUN_OK regardless, so opening the
	* page from the Vite dev server -- which serves the page but has no /api -- showed every run
	* button, and pressing one produced "POST /api/run 404" in the console and nothing else. The
	* controls have to be there only when something is behind them, and a 404 means nothing is.
	*
	* Exactly the mistake the ledger exists to catch: a check on a response that did not check
	* whether the response was an answer.
	*/
	const api = async (path, method = "GET") => {
		const r = await fetch(path, {
			method,
			cache: "no-store"
		});
		if (!r.ok) throw new Error(`${r.status} from ${path}`);
		const ct = r.headers.get("content-type") ?? "";
		if (!ct.includes("json")) throw new Error(`${path} answered ${ct || "nothing"}, not json`);
		return {
			status: r.status,
			body: await r.json()
		};
	};
	/**
	* The controls for a running thing: pause (or resume) and stop, wherever the thing is shown.
	*
	* One set of markup, used by the suite control, by the row or cell that started a part-run, and
	* by the panel that shows progress -- so the same three buttons mean the same three things
	* everywhere, and there is no second place keeping its own idea of what is running.
	*/
	function holdAndStop(cls = "rowrun", what = null) {
		const wait = (label) => `<span class="${cls} ckrun--wait" role="status" aria-label="${label}" title="${label}"><i></i></span>`;
		const act = PENDING && (PENDING.act === "pause" || PENDING.act === "resume") ? PENDING.act : PENDING && PENDING.act === "stop" && PENDING.key === `stop:${what}` ? "stop" : null;
		const several = RUN_NOW.runs.length > 1;
		const pr = act === "pause" ? wait("Pausing after the model it is on") : act === "resume" ? wait("Resuming") : RUN_NOW.paused ? `<button type="button" class="${cls} ckrun--go" data-act="resume" title="Resume${several ? " everything" : ""}" aria-label="Resume">${PLAY}</button>` : `<button type="button" class="${cls} ckrun--hold" data-act="pause" title="Pause${several ? " everything" : ""} after the model it is on" aria-label="Pause">${PAUSE}</button>`;
		const canStop = !what || (runOf(what)?.mine ?? false);
		const foreign = what ? runOf(what) : null;
		const runner = foreign && !foreign.mine ? foreign.runner : null;
		const whyNot = "This run was started from a terminal and does not say what is running it, so there is no run to stop from here — only the one check, and the runner would move on to the next. Pause holds all of them.";
		return pr + (act === "stop" ? wait("Stopping") : canStop ? `<button type="button" class="${cls} ckrun--stop" data-act="stop"${what ? ` data-act-check="${esc(what)}"` : ""} title="Stop${what ? ` ${esc(CHECK_NAMES[what] ?? what)}` : ""}" aria-label="Stop">${STOP}</button>` : runner ? `<button type="button" class="${cls} ckrun--stop" data-act="stop" data-act-check="${esc(what)}" title="${esc(`Stop the whole ${runner.name} run — every step of it, not just ${CHECK_NAMES[what] ?? what}. It would have to start again from the beginning.`)}" aria-label="${esc(`Stop the whole ${runner.name} run`)}">${STOP}</button>` : `<span class="${cls} ckrun--stop is-off" data-tip data-tiptext="${esc(whyNot)}" tabindex="0" role="img" aria-label="Stop is not available: ${esc(whyNot)}">${STOP}</span>`);
	}
	/**
	* The table's own control, beside "Collapse all".
	*
	* It runs everything, and it is where a run that belongs to no single row shows its progress: the
	* whole run, or one check started over models from more than one group.
	*/
	/**
	* The Model heading's control: run every check over every model.
	*
	* Every other heading carries a round button above its word that runs that column over every
	* model. This is the same rule one column to the left -- every check rather than one -- so it is
	* the same button in the same place, and the row of them reads as one row. It used to be a wide
	* pill reading "Run every check", which was the one control in the header shaped unlike its
	* neighbours, and the tallest thing in the row.
	*
	* While the whole run goes, the bar for it is the table's own first row, across all of it. This
	* keeps only the two buttons that change it.
	*/
	function renderSuite() {
		const slots = document.querySelectorAll("[data-suite]");
		if (!slots.length) return;
		const all = runOf("all");
		const html = !RUN_OK ? "" : all ? all.mine ? holdAndStop("cellrun", "all") : "" : runBtn("all", [], "Run every check over every model", "cellrun");
		for (const el of slots) el.innerHTML = html;
	}
	/** Everything a press changes, drawn once. Four separate calls per click redrew the table four times. */
	function redrawControls() {
		sortBars();
		renderSuite();
		if (L) {
			renderRows();
			renderSiteChecks();
			renderColRuns();
		}
	}
	const sigOf = () => `${RUN_NOW.runs.map((r) => `${r.what}@${(r.models ?? []).join("+")}`).sort().join("|")}|${RUN_NOW.paused}|${PENDING ? `${PENDING.key}:${PENDING.act}` : ""}`;
	async function runState() {
		try {
			const { body } = await api("/api/state");
			RUN_OK = true;
			const was = sigOf();
			if (PENDING) {
				const asked = String(PENDING.key).split(":")[0];
				const has = (w) => (body.runs ?? []).some((r) => r.what === w);
				if (PENDING.act === "run" ? has(asked) : PENDING.act === "stop" ? !has(String(PENDING.key).slice(5)) : PENDING.act === "pause" ? !!body.paused : !body.paused) PENDING = null;
			}
			RUN_NOW = {
				runs: body.runs ?? [],
				paused: !!body.paused,
				max: body.max ?? 2
			};
			MACHINE = body.machine ?? null;
			paintMachine();
			if (was !== sigOf()) redrawControls();
			else renderSuite();
			reTip();
			return body;
		} catch {
			RUN_OK = false;
			renderSuite();
			return null;
		}
	}
	async function runDo(path, check, models = []) {
		try {
			await api(path + (check ? `?check=${encodeURIComponent(check)}${models.length ? `&models=${encodeURIComponent(models.join(","))}` : ""}` : ""), "POST");
		} catch (e) {
			PENDING = null;
			const m = /^409 /.test(String(e.message)) ? String(e.message).replace(/^409 /, "") : String(e.message);
			const el = $("suite");
			if (el) el.innerHTML = `<span class="suite__off">${esc(m)}</span>`;
		}
		await runState();
	}
	document.addEventListener("click", (e) => {
		const part = e.target.closest("[data-run-what]");
		if (part && !part.disabled) {
			const ids = (part.dataset.runIds ?? "").split(",").filter(Boolean);
			PENDING = {
				key: runKey(part.dataset.runWhat, ids),
				act: "run"
			};
			redrawControls();
			runDo("/api/run", part.dataset.runWhat, ids);
			return;
		}
		const one = e.target.closest("[data-run]");
		if (one && !one.disabled) {
			PENDING = {
				key: one.dataset.run,
				act: "run"
			};
			runDo("/api/run", one.dataset.run);
			return;
		}
		const act = e.target.closest("[data-act]");
		if (act && !act.disabled) {
			const what = act.dataset.actCheck ?? null;
			PENDING = {
				key: act.dataset.act === "stop" ? `stop:${what ?? ""}` : "paused",
				act: act.dataset.act
			};
			redrawControls();
			runDo("/api/" + act.dataset.act, act.dataset.act === "stop" ? what : null);
			return;
		}
	});
	runState().then((s) => {
		if (s) rerender();
	});
	setInterval(runState, 3e3);
	function paintMachine() {
		const el = $("machine");
		if (!el) return;
		const m = MACHINE;
		if (!m) {
			el.innerHTML = "";
			return;
		}
		const cpu = m.cpuPercent == null ? "" : ` · CPU ${m.cpuPercent}%`;
		el.innerHTML = `<span class="sep">·</span><button type="button" class="machine linkish" data-machine title="What this machine has left — click for what it means"><i class="dot ${m.low ? "warn" : "on"}"></i>${m.memFreeGB} GB free${esc(cpu)}</button>`;
	}
	/** The modal behind that chip: the numbers, and why running two checks at once is not free. */
	function machineModal() {
		const m = MACHINE;
		if (!m) return "<p>The board is not answering, so there is nothing to report about the machine.</p>";
		const used = Math.round((m.memTotalGB - m.memFreeGB) * 10) / 10;
		const usedPc = Math.min(100, Math.max(0, used / m.memTotalGB * 100));
		const floorPc = Math.min(100, Math.max(0, (m.memTotalGB - m.floorGB) / m.memTotalGB * 100));
		const cpu = m.cpuPercent;
		return `
      <div class="mgauges">
        <section class="mgauge${m.low ? " is-bad" : ""}">
          <header><h3>Memory</h3><b>${m.memFreeGB} GB<span>free</span></b></header>
          <div class="mbar" role="img" aria-label="${used} GB of ${m.memTotalGB} GB in use; the floor is at ${m.floorGB} GB free">
            <i style="width:${usedPc.toFixed(1)}%"></i>
            <u style="left:${floorPc.toFixed(1)}%" title="Under ${m.floorGB} GB free, a model waits"></u>
          </div>
          <footer>${used} GB in use of ${m.memTotalGB} · the floor is <b>${m.floorGB} GB</b> free</footer>
        </section>
        <section class="mgauge">
          <header><h3>CPU</h3><b>${cpu == null ? "—" : `${cpu}%`}<span>${cpu == null ? "sampling" : "busy"}</span></b></header>
          <div class="mbar" role="img" aria-label="${cpu == null ? "not sampled yet" : `${cpu} per cent busy`}">
            <i style="width:${cpu == null ? 0 : cpu}%"></i>
          </div>
          <footer>averaged over the last second, across ${m.cores} cores</footer>
        </section>
      </div>
      <ul class="mfacts">
        <li><b>${m.maxRuns}</b> check${m.maxRuns === 1 ? "" : "s"} at once</li>
        <li><b>${m.maxBrowsers}</b> browser${m.maxBrowsers === 1 ? "" : "s"} per check</li>
        <li>temperature ${m.tempC != null ? `<b>${m.tempC} °C</b>` : `<b>no reading</b> <span class="mwhy" data-tip data-tiptext="${esc(m.tempWhy ?? "")}">why?</span>`}</li>
      </ul>
      <p>A check is not a script that reads a file. It drives real Chromium browsers over real
      models — opening pages, recording video, decoding frames — and this is a laptop, not a farm.
      <b>Two checks at once is not twice the work done:</b> it is the same cores and the same memory
      split two ways.</p>
      <p>Before every model the guard reads free memory. Under <b>${m.floorGB} GB</b> the model
      <b>waits</b>, for up to three minutes; if memory has not come back it runs anyway and its
      result says <i>ran under memory pressure</i>. A fresh browser is launched every 20 models, so
      memory cannot creep across a 135-model run.</p>
      <p><b>One check must have the machine to itself.</b> The performance check measures how many
      milliseconds a model takes to draw, and anything else running lands in that number. The board
      will not start it beside another check, or another check beside it.</p>`;
	}
	const POLL_MS = 1e4;
	const BEAT_DEAD_S = 90;
	const QUIET_S = 120;
	let lastFetchAt = null, lastChangeAt = null, fetchError = null;
	function watcherState() {
		if (wMissing) return { kind: "none" };
		if (!W) return { kind: "unknown" };
		if (W.stoppedAt) return {
			kind: "stopped",
			at: W.stoppedAt
		};
		const beat = age(W.heartbeatAt);
		return beat != null && beat <= BEAT_DEAD_S ? {
			kind: "alive",
			beat
		} : {
			kind: "dead",
			beat
		};
	}
	function renderLive() {
		if (!L) return;
		const w = watcherState();
		const dataAge = age(L.generatedAt);
		const dot = {
			alive: "on",
			dead: "off"
		}[w.kind] ?? "";
		const wText = {
			alive: `Watcher live · heartbeat ${fmtAge(w.beat)}`,
			dead: `Watcher not responding · last heartbeat ${fmtAge(w.beat)}`,
			stopped: `Watcher stopped ${ago(w.at)}`,
			none: "No watcher has run",
			unknown: "Watcher state unknown"
		}[w.kind];
		const checked = `Page checked ${lastFetchAt ? fmtAge((Date.now() - lastFetchAt) / 1e3) : "never"}${document.hidden ? " (paused while the tab is hidden)" : `, every ${POLL_MS / 1e3} s`}. Ledger updated ${fmtAge(dataAge)}.`;
		const short = w.kind === "alive" ? "watcher live" : wText;
		const G = L.gate;
		let gateNote = "";
		let gateChip = "";
		if (G?.running) {
			const at = G.step?.index ?? G.done.length + 1;
			const pct = G.total ? Math.min(100, Math.round(100 * G.done.length / G.total)) : 0;
			const bad = G.done.filter((d) => !d.ok);
			const tip = `gate: step ${at} of ${G.total}${G.step ? `, ` + G.step.name : ``}. ${G.done.length} finished${bad.length ? `, ${bad.length} failed: ` + bad.map((d) => d.key).join(`, `) : `, all held`}. Started ${clock(G.startedAt)}.`;
			gateChip = `<span class="sep">·</span><span class="gate${bad.length ? ` gate--bad` : ``}" tabindex="0" data-tip data-tiptext="${esc(tip)}" data-cl-jump="gate"><i class="dot busy"></i>gate <b>${esc(at)}/${esc(G.total)}</b>${G.step ? `<span class="gate__what">${esc(G.step.short ?? G.step.key)}</span>` : ``}<span class="gate__track"><i style="width:${pct}%"></i></span></span>`;
		} else if (G?.crashed) gateNote = `<div class="notice bad"><b class="big">A gate run stopped without finishing.</b> It reached step ${esc(G.step?.index ?? G.done.length)} of ${esc(G.total)}${G.step ? ` (<code>${esc(G.step.key)}</code>)` : ``} and the process is gone, so nothing is running now: this board holds whatever it had recorded by then. Start it again with <code>npm run verify</code>.</div>`;
		$("live").innerHTML = `<span class="sep">·</span><span tabindex="0" data-tip data-tiptext="${esc(checked)}"><i class="dot ${dot}"></i>${esc(short)}</span>` + (dataAge != null && dataAge > QUIET_S ? `<span class="sep">·</span><span class="stale">not rebuilt for ${esc(fmtAge(dataAge).replace(/ ago$/, ""))}</span>` : "") + `<span id="machine"></span>` + gateChip;
		paintMachine();
		const min = (s) => `${Math.max(1, Math.round(s / 60))} min`;
		let note = "";
		if (fetchError) note = `<div class="notice bad"><b class="big">Could not refresh.</b> ${esc(fetchError)}. What you see was fetched ${esc(lastChangeAt ? fmtAge((Date.now() - lastChangeAt) / 1e3).replace(/\d+ s ago/, "under a minute ago") : "earlier")}.</div>`;
		else if (w.kind === "dead" && dataAge > QUIET_S) note = `<div class="notice bad"><b class="big">Stale: this page has stopped updating.</b> The ledger has not changed for ${min(dataAge)}, and the watcher that should rebuild it last reported ${min(w.beat ?? 0)} ago without recording a stop, so it has probably crashed or the laptop slept. Commits and check results since ${esc(clock(W.heartbeatAt))} are missing. Restart it with <code>npm run ledger:watch</code>.</div>`;
		else if (w.kind === "dead") note = `<div class="notice">The watcher last reported ${min(w.beat ?? 0)} ago without recording a stop. This data is recent because it was built ${L.build?.by ? `by <code>${esc(L.build.by)}</code>` : "another way"}, but nothing is rebuilding it. Restart the watcher with <code>npm run ledger:watch</code>.</div>`;
		else if (w.kind === "alive" && dataAge > QUIET_S && !G?.running) note = `<div class="notice info">Quiet, not stale: nothing the ledger reads has changed for ${min(dataAge)}. The watcher is alive and looking every 3 s.</div>`;
		else if ((w.kind === "stopped" || w.kind === "none") && dataAge > QUIET_S) note = `<div class="notice"><b class="big">Not live.</b> No watcher is running, so this is the build from ${min(dataAge)} ago and it will not change until someone runs <code>npm run ledger</code> or starts <code>npm run ledger:watch</code>.</div>`;
		note = gateNote + note;
		const code = L.build?.code;
		if (!code) note += `<div class="notice"><b class="big">Built by old code.</b> This ledger was built by a version of <code>scripts/ledger.mjs</code> from before it recorded its own version, so it may be missing sections or counting the old way.${w.kind === "alive" ? " The watcher running now loaded that old code: restart it with <code>npm run ledger:watch</code>." : " Run <code>npm run ledger</code>."}</div>`;
		else if (code.stale) note += `<div class="notice"><b class="big">Built by older code than is on disk.</b> This build ran on <code>${esc(code.loaded)}</code>, but <code>${esc(code.files.join(" and "))}</code> are now <code>${esc(code.onDisk)}</code>. ${w.kind === "alive" && W?.code ? "The watcher reloads the new code on its next build." : w.kind === "alive" ? "The watcher running now does not reload its code: restart it with <code>npm run ledger:watch</code>." : "Run <code>npm run ledger</code>."}</div>`;
		else if (w.kind === "alive" && W && !W.code) note += `<div class="notice">The watcher running now does not report which build code it has loaded, so it predates reloading and will keep building with old code after the next change to <code>scripts/ledger.mjs</code>. Restart it with <code>npm run ledger:watch</code>.</div>`;
		const inst = W?.instruments;
		if (inst?.count) note += `<div class="notice"><b class="big">The watching tools failed ${inst.count} time${inst.count === 1 ? "" : "s"} in the last day.</b> Not the app and not the checks — the instruments that report on them. What they could not do is recorded rather than swallowed, because a tool that gives up quietly is how you come to trust a reading taken by something that was not working: <code>${esc(inst.last.map((r) => r.what).join(" · ").slice(0, 220))}</code></div>`;
		if ($("livenote").dataset.note !== note) {
			$("livenote").dataset.note = note;
			$("livenote").innerHTML = note;
		}
	}
	function tickAges() {
		if (document.hidden) return;
		document.querySelectorAll("[data-ago]").forEach((el) => {
			const t = ago(el.dataset.ago);
			if (el.textContent !== t) el.textContent = t;
		});
		document.querySelectorAll("[data-ago-short]").forEach((el) => {
			const t = fmtAgeShort(age(el.dataset.agoShort));
			if (el.textContent !== t) el.textContent = t;
		});
		renderLive();
	}
	/** Re-render in place, keeping where the reader is: scroll, the focused control, the caret in the search. */
	function rerender() {
		const x = scrollX, y = scrollY, tx = $("tablewrap").scrollLeft;
		const a = document.activeElement;
		const caret = a?.id === "q" ? [a.selectionStart, a.selectionEnd] : null;
		const row = a?.closest?.("tr.row")?.dataset.id;
		const onTab = a?.getAttribute?.("role") === "tab";
		const key = [
			"f",
			"g",
			"t"
		].find((k) => a?.closest?.("#filters") && a.dataset?.[k] != null);
		const btn = key ? `#filters button[data-${key}="${CSS.escape(a.dataset[key])}"]` : null;
		render();
		if (caret) {
			const q = $("q");
			q.focus({ preventScroll: true });
			try {
				q.setSelectionRange(...caret);
			} catch {}
		} else if (row) document.querySelector(`tr.row[data-id="${CSS.escape(row)}"]`)?.focus({ preventScroll: true });
		else if (btn) document.querySelector(btn)?.focus({ preventScroll: true });
		else if (onTab) $("stats").querySelector("[aria-selected=\"true\"]")?.focus({ preventScroll: true });
		$("tablewrap").scrollLeft = tx;
		scrollTo(x, y);
	}
	const raw = {
		l: null,
		q: null,
		w: null
	};
	async function getText(name) {
		const r = await fetch(name, { cache: "no-cache" });
		if (!r.ok) {
			const e = /* @__PURE__ */ new Error(`${name}: HTTP ${r.status}`);
			e.missing = r.status === 404;
			throw e;
		}
		const type = r.headers.get("content-type") || "";
		const text = await r.text();
		if (/html/.test(type) || /^\s*</.test(text)) {
			const e = /* @__PURE__ */ new Error(`${name} is missing (the server sent a page instead)`);
			e.missing = true;
			throw e;
		}
		return text;
	}
	const parseFails = {};
	const parseFail = (name, errs) => {
		parseFails[name] = (parseFails[name] ?? 0) + 1;
		if (parseFails[name] >= 3) errs.push(`${name} has not parsed for ${parseFails[name]} fetches in a row; showing the last good copy`);
	};
	let first = true;
	async function refresh() {
		const [l, w] = await Promise.allSettled([getText("ledger.json"), getText("ledger-watch.json")]);
		const errs = [];
		let changedL = false;
		if (l.status === "fulfilled") {
			if (l.value !== raw.l) try {
				const next = JSON.parse(l.value);
				if (L && prevSig) {
					for (const m of next.models) if (prevSig.get(m.id) !== rowSig(m)) flash.add(m.id);
				}
				if (L) for (const m of next.models) {
					const was = wasStatus.get(m.id);
					if (was && was !== "approved" && m.status === "approved") justApproved.add(m.id);
				}
				wasStatus = new Map(next.models.map((m) => [m.id, m.status]));
				prevSig = new Map(next.models.map((m) => [m.id, rowSig(m)]));
				L = next;
				raw.l = l.value;
				changedL = true;
				parseFails["ledger.json"] = 0;
			} catch {
				parseFail("ledger.json", errs);
			}
		} else errs.push(l.reason.message);
		if (w.status === "fulfilled") {
			if (w.value !== raw.w) try {
				W = JSON.parse(w.value);
				wMissing = false;
				raw.w = w.value;
				parseFails["ledger-watch.json"] = 0;
			} catch {
				parseFail("ledger-watch.json", errs);
			}
		} else if (w.reason.missing) {
			W = null;
			wMissing = true;
			raw.w = null;
		}
		lastFetchAt = Date.now();
		if (!L) {
			if (first) loadFallback(l.reason);
			first = false;
			return;
		}
		first = false;
		fetchError = errs.length ? errs.join("; ") : null;
		if (!fetchError) lastChangeAt = Date.now();
		const firstRender = changedL && !rendered;
		if (changedL) rerender();
		if (firstRender) {
			rendered = true;
			try {
				const y = Number(sessionStorage.getItem("ledger-scroll"));
				if (y > 0) scrollTo(0, y);
			} catch {}
		}
		renderLive();
	}
	let rendered = false;
	addEventListener("pagehide", () => {
		try {
			sessionStorage.setItem("ledger-scroll", String(Math.round(scrollY)));
		} catch {}
	});
	function loadFallback(err) {
		$("meta").textContent = "The ledger could not be loaded.";
		$("notices").innerHTML = `<div class="notice bad">Could not read <code>ledger.json</code>: ${esc(err?.message)}.
      Opened straight from disk, a browser will not let the page read files beside it. Serve the folder
      (for example <code>npm run dev</code>, then open <code>/docs/ledger.html</code>), run <code>npm run ledger</code> if the file does not exist,
      or pick the two files here. Picked files do not refresh.</div>
      <div class="loadbox"><label>ledger.json: <input type="file" id="pick" accept=".json,application/json" multiple></label></div>`;
		$("pick").addEventListener("change", async (e) => {
			for (const f of e.target.files) try {
				const data = JSON.parse(await f.text());
				if (Array.isArray(data.models)) L = data;
			} catch (x) {
				alert(`${f.name}: ${x.message}`);
			}
			if (L) {
				stopPolling();
				render();
				$("live").textContent = "Showing picked files: this copy does not refresh.";
			}
		});
	}
	let timer = null, ticker = null;
	function refreshFailed(e) {
		console.error("ledger: the page could not finish drawing", e);
		const box = $("notices");
		if (!box) return;
		box.hidden = false;
		box.insertAdjacentHTML("afterbegin", `<div class="notice notice--stopped"><span class="notice__what"><b>This page could not finish drawing.</b></span><span class="notice__why">${esc(String(e?.message ?? e))} — the console has the stack. Anything below may be left over from before the error.</span></div>`);
	}
	const schedule = () => {
		clearTimeout(timer);
		if (!document.hidden) timer = setTimeout(() => refresh().catch(refreshFailed).finally(schedule), POLL_MS);
	};
	const stopPolling = () => {
		clearTimeout(timer);
		clearInterval(ticker);
		timer = ticker = null;
		document.removeEventListener("visibilitychange", onVis);
	};
	const onVis = () => {
		if (document.hidden) clearTimeout(timer);
		else refresh().catch(refreshFailed).finally(schedule);
	};
	document.addEventListener("visibilitychange", onVis);
	ticker = setInterval(tickAges, 1e3);
	refresh().catch(refreshFailed).finally(schedule);
})();
//#endregion
