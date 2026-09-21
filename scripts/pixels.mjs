/**
 * Reading screenshots: Chromium's PNGs decoded to RGBA, averaged into cells, and compared.
 * Shared by scripts/check-motion.mjs (which films models move) and scripts/check-access.mjs (which
 * checks they stop when paused, and that focus shows), so both judge a picture the same way.
 */
import { inflateSync } from 'node:zlib';

/** A mean change over the whole canvas (0-255 per channel) under this changes nothing on screen ... */
export const STILL = 0.12;
/** ... unless the mean change round the part acted on (changeNear) is this or more. */
export const STILL_NEAR = 1;

/** A PNG as RGBA bytes. Chromium writes 8-bit RGB or RGBA PNGs. */
export function decode(png) {
  let at = 8, width = 0, height = 0, depth = 0, kind = 0;
  const parts = [];
  while (at + 8 <= png.length) {
    const size = png.readUInt32BE(at);
    const tag = png.toString('latin1', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + size);
    if (tag === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; kind = data[9]; }
    else if (tag === 'IDAT') parts.push(data);
    else if (tag === 'IEND') break;
    at += size + 12;
  }
  const channels = { 2: 3, 6: 4 }[kind];
  if (depth !== 8 || !channels) throw new Error(`cannot read this PNG (depth ${depth}, colour type ${kind})`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const row = Buffer.alloc(stride), above = Buffer.alloc(stride);
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0, read = 0; y < height; y++) {
    const filter = raw[read++];
    raw.copy(row, 0, read, read + stride);
    read += stride;
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0;
      const corner = i >= channels ? above[i - channels] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + above[i]) & 255;
      else if (filter === 3) row[i] = (row[i] + ((left + above[i]) >> 1)) & 255;
      else if (filter === 4) {
        const guess = left + above[i] - corner;
        const dl = Math.abs(guess - left), du = Math.abs(guess - above[i]), dc = Math.abs(guess - corner);
        row[i] = (row[i] + (dl <= du && dl <= dc ? left : du <= dc ? above[i] : corner)) & 255;
      }
    }
    row.copy(above);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * channels;
      rgba[o] = row[s]; rgba[o + 1] = row[s + 1]; rgba[o + 2] = row[s + 2]; rgba[o + 3] = channels === 4 ? row[s + 3] : 255;
    }
  }
  return { width, height, rgba };
}

/** The picture averaged into `cell` × `cell` px cells: { cols, rows, rgb: Float32Array } */
export function cells({ width, height, rgba }, cell) {
  const CELL = cell;
  const cols = Math.floor(width / CELL), rows = Math.floor(height / CELL);
  const rgb = new Float32Array(cols * rows * 3);
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = ((cy * CELL + y) * width + cx * CELL + x) * 4;
          r += rgba[o]; g += rgba[o + 1]; b += rgba[o + 2];
        }
      const c = (cy * cols + cx) * 3, n = CELL * CELL;
      rgb[c] = r / n; rgb[c + 1] = g / n; rgb[c + 2] = b / n;
    }
  return { cols, rows, rgb };
}

/** The largest channel difference of cell i (an index into rgb) between two pictures. */
export const far = (p, q, i) => Math.max(Math.abs(p.rgb[i] - q.rgb[i]), Math.abs(p.rgb[i + 1] - q.rgb[i + 1]), Math.abs(p.rgb[i + 2] - q.rgb[i + 2]));
/**
 * The mean change in the cells round a part's box ([left, top, right, bottom] in frame pixels),
 * two cells wider on every side so a focus ring or glow drawn just outside it counts.
 */
export const changeNear = (p, q, box, cell) => {
  const CELL = cell;
  const x0 = Math.max(0, Math.floor(box[0] / CELL) - 2), x1 = Math.min(p.cols - 1, Math.floor(box[2] / CELL) + 2);
  const y0 = Math.max(0, Math.floor(box[1] / CELL) - 2), y1 = Math.min(p.rows - 1, Math.floor(box[3] / CELL) + 2);
  let sum = 0, n = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const o = (y * p.cols + x) * 3;
      sum += Math.abs(p.rgb[o] - q.rgb[o]) + Math.abs(p.rgb[o + 1] - q.rgb[o + 1]) + Math.abs(p.rgb[o + 2] - q.rgb[o + 2]);
      n += 3;
    }
  return n ? sum / n : 0;
};
/** The mean channel difference over the whole picture. */
export const change = (p, q) => {
  let sum = 0;
  for (let i = 0; i < p.rgb.length; i++) sum += Math.abs(p.rgb[i] - q.rgb[i]);
  return sum / p.rgb.length;
};
