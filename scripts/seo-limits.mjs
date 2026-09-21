// How long a page's <title> and meta description may be, shared by scripts/generate-pages.mjs
// (which fits each page's fixed wording to them) and scripts/check-seo.mjs (which fails a page over
// them). Not run on its own.
//
// Search results cut titles and descriptions by pixel width, not characters, so these are
// character stand-ins:
//  - title: Google shows about 580-600 px of a title, roughly 50-60 characters of mixed text; Moz
//    and most SEO guides say "under 60". AIM is that; MAX is where the cut starts to eat real words
//    for most titles.
//  - description: Google shows about 920 px on desktop, roughly 150-160 characters, and less on
//    phones (about 120). AIM is the usual "about 155"; MAX is where even a narrow description is
//    cut.
// The generator aims for AIM and never goes past MAX with its own wording; the check fails MAX and
// only counts AIM.
export const TITLE_AIM = 60;
export const TITLE_MAX = 70;
export const DESCRIPTION_AIM = 155;
export const DESCRIPTION_MAX = 165;
/** Below this a description says too little to be picked as the snippet (Google then writes its own). */
export const DESCRIPTION_MIN = 50;
