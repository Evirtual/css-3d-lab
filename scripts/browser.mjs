/**
 * How every check opens a browser: one place, so the answer to "which Chromium do the checks run
 * on" is written once.
 *
 * Since Playwright 1.49, `chromium.launch({ headless: true })` with no channel starts
 * chrome-headless-shell, a separate binary. On 2026-09-23 Windows Smart App Control on this
 * machine began blocking it — every launch died with `spawn UNKNOWN`, and the Code Integrity log
 * said "An Application Control policy has blocked this file" for
 * ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe.
 * The full Chromium build Playwright installs beside it (chromium-1243) is not blocked, so the
 * checks ask for it by name: `channel: 'chromium'` is Playwright's own way of saying "the full
 * browser, in its new headless mode" — the same engine at the same version, not a different
 * browser. Everything else the caller passes is passed through.
 *
 * If the policy is lifted (the binary allowed, or Smart App Control turned off), nothing here has
 * to change: the full build keeps working. Drop the channel only to go back to the smaller,
 * faster-starting shell on purpose.
 */
import { chromium } from 'playwright';

export const CHROMIUM_CHANNEL = 'chromium';

/** chromium.launch with this project's channel, and the caller's options over it. */
export const launchChromium = (options = {}) => chromium.launch({ channel: CHROMIUM_CHANNEL, ...options });
