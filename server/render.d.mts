// Types for render.mjs. The page imports the render limits from it (src/record.ts), so the page
// and the render service agree on them; server/dev.mjs and the Worker use the rest.
export const MAX_BODY: number;
export const MAX_PIXELS: number;
export const MAX_SCALE: number;
export const FRAME_TYPES: readonly ('png' | 'webp')[];
export function renderFits(width: number, height: number, scale: number): boolean;
export function validateCapture(payload: unknown): any;
export function readCapture(request: Request): Promise<any>;
export function renderCapture(browser: any, payload: any, signal?: AbortSignal, keepBrowser?: boolean): Promise<ReadableStream<Uint8Array>>;
