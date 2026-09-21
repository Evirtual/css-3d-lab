/**
 * Puts the colour an H.264 film was written in into the film itself.
 *
 * Chromium's encoder turns the canvas's RGB into YUV with one matrix (it says which on the
 * encoder's output, `meta.decoderConfig.colorSpace`: BT.709, full range, sRGB transfer) but its
 * software H.264 encoder writes an SPS with no colour description in its VUI. A decoder that reads
 * the stream and not the MP4's `colr` box has to guess, and Chromium's software decoder guesses
 * BT.601 — so reds and greens drift and the picture comes out a few levels darker and greener than
 * the canvas (measured: 3.8 levels on a test pattern, 25 on a pink; Edge on Windows, which does
 * read `colr`, was already right). VP9 carries its colour space in every key frame, so a WebM
 * does not have this problem.
 *
 * So the SPS is rewritten to say what the encoder did: video_signal_type with the range and the
 * colour description (primaries, transfer, matrix), everything else in it copied bit for bit.
 * It is done in the decoder config's avcC and in any SPS the key frames carry in-band, so a player
 * that reads either one reads the same thing.
 */

// ITU-T H.273 code points, for the names WebCodecs uses
const PRIMARIES: Record<string, number> = { bt709: 1, bt470bg: 5, smpte170m: 6, bt2020: 9, smpte432: 12 };
const TRANSFER: Record<string, number> = { bt709: 1, smpte170m: 6, linear: 8, 'iec61966-2-1': 13, pq: 16, hlg: 18 };
const MATRIX: Record<string, number> = { rgb: 0, bt709: 1, bt470bg: 5, smpte170m: 6, 'bt2020-ncl': 9 };

export interface AvcColour {
  primaries: number;
  transfer: number;
  matrix: number;
  fullRange: boolean;
}

/** The H.273 numbers for a WebCodecs colour space, or null when any part of it is unknown. */
export function avcColour(cs: VideoColorSpaceInit | undefined | null): AvcColour | null {
  if (!cs?.primaries || !cs.transfer || !cs.matrix || typeof cs.fullRange !== 'boolean') return null;
  const primaries = PRIMARIES[cs.primaries], transfer = TRANSFER[cs.transfer], matrix = MATRIX[cs.matrix];
  if (primaries === undefined || transfer === undefined || matrix === undefined) return null;
  return { primaries, transfer, matrix, fullRange: cs.fullRange };
}

/* ---------------- bits ---------------- */

/** NAL payload → RBSP (the 0x000003 emulation-prevention bytes taken out). */
function unescape(nal: Uint8Array): Uint8Array {
  const out: number[] = [];
  let zeros = 0;
  for (let i = 0; i < nal.length; i++) {
    if (zeros >= 2 && nal[i] === 3) { zeros = 0; continue; }
    out.push(nal[i]!);
    zeros = nal[i] === 0 ? zeros + 1 : 0;
  }
  return Uint8Array.from(out);
}
/** RBSP → NAL payload: 0x03 put back wherever two zeros are followed by a byte of 3 or less. */
function escape(rbsp: Uint8Array): Uint8Array {
  const out: number[] = [];
  let zeros = 0;
  for (const b of rbsp) {
    if (zeros >= 2 && b <= 3) { out.push(3); zeros = 0; }
    out.push(b);
    zeros = b === 0 ? zeros + 1 : 0;
  }
  return Uint8Array.from(out);
}

class Reader {
  pos = 0;
  constructor(readonly bytes: Uint8Array) {}
  bit(): number {
    if (this.pos >= this.bytes.length * 8) throw new Error('SPS ended early');
    const b = (this.bytes[this.pos >> 3]! >> (7 - (this.pos & 7))) & 1;
    this.pos++;
    return b;
  }
  u(n: number): number { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + this.bit(); return v; }
  ue(): number { let z = 0; while (!this.bit()) if (++z > 31) throw new Error('bad exp-Golomb code'); return 2 ** z - 1 + this.u(z); }
  se(): number { const k = this.ue(); return k & 1 ? (k + 1) / 2 : -k / 2; }
}
class Writer {
  private bits: number[] = [];
  bit(b: number): void { this.bits.push(b & 1); }
  u(n: number, v: number): void { for (let i = n - 1; i >= 0; i--) this.bit(Math.floor(v / 2 ** i) & 1); }
  copy(from: Reader, start: number, end: number): void { for (let p = start; p < end; p++) this.bit((from.bytes[p >> 3]! >> (7 - (p & 7))) & 1); }
  /** rbsp_trailing_bits: a stop bit, then zeros to the byte. */
  finish(): Uint8Array {
    this.bit(1);
    while (this.bits.length % 8) this.bit(0);
    const out = new Uint8Array(this.bits.length / 8);
    for (let i = 0; i < this.bits.length; i++) out[i >> 3]! |= this.bits[i]! << (7 - (i & 7));
    return out;
  }
}

const HIGH_PROFILES = new Set([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135]);

/**
 * One SPS NAL unit (header byte included), with its VUI saying this colour. Everything else is
 * copied bit for bit. Throws if the SPS cannot be read.
 */
export function spsWithColour(nal: Uint8Array, colour: AvcColour): Uint8Array {
  if ((nal[0]! & 0x1f) !== 7) throw new Error('not an SPS');
  const rbsp = unescape(nal.subarray(1));
  const r = new Reader(rbsp);
  const profile = r.u(8);
  r.u(16); // constraint flags, level
  r.ue(); // seq_parameter_set_id
  if (HIGH_PROFILES.has(profile)) {
    const chroma = r.ue();
    if (chroma === 3) r.bit();
    r.ue(); r.ue(); r.bit();
    if (r.bit()) {
      for (let i = 0; i < (chroma !== 3 ? 8 : 12); i++) {
        if (!r.bit()) continue;
        let last = 8, next = 8;
        for (let j = 0; j < (i < 6 ? 16 : 64); j++) {
          if (next !== 0) next = (last + r.se() + 256) % 256;
          last = next === 0 ? last : next;
        }
      }
    }
  }
  r.ue(); // log2_max_frame_num_minus4
  const poc = r.ue();
  if (poc === 0) r.ue();
  else if (poc === 1) { r.bit(); r.se(); r.se(); const n = r.ue(); for (let i = 0; i < n; i++) r.se(); }
  r.ue(); r.bit(); r.ue(); r.ue(); // max_num_ref_frames, gaps, width, height
  if (!r.bit()) r.bit(); // frame_mbs_only_flag, mb_adaptive_frame_field_flag
  r.bit(); // direct_8x8_inference_flag
  if (r.bit()) { r.ue(); r.ue(); r.ue(); r.ue(); } // frame cropping

  // the last 1 in the RBSP is its stop bit: everything before it is syntax
  let stop = rbsp.length * 8 - 1;
  while (stop >= 0 && !((rbsp[stop >> 3]! >> (7 - (stop & 7))) & 1)) stop--;

  const w = new Writer();
  const signal = (): void => {
    w.bit(1); // video_signal_type_present_flag
    w.u(3, 5); // video_format: unspecified
    w.bit(colour.fullRange ? 1 : 0);
    w.bit(1); // colour_description_present_flag
    w.u(8, colour.primaries); w.u(8, colour.transfer); w.u(8, colour.matrix);
  };
  const vuiAt = r.pos;
  if (!r.bit()) {
    // no VUI at all: add one that says only the colour
    w.copy(r, 0, vuiAt);
    w.bit(1);
    w.bit(0); w.bit(0); // aspect_ratio_info_present_flag, overscan_info_present_flag
    signal();
    for (let i = 0; i < 6; i++) w.bit(0); // chroma_loc, timing, nal_hrd, vcl_hrd, pic_struct, bitstream_restriction
    w.copy(r, r.pos, stop); // nothing, in a well-formed SPS
    return Uint8Array.from([nal[0]!, ...escape(w.finish())]);
  }
  if (r.bit() && r.u(8) === 255) r.u(32); // aspect ratio, and an explicit one
  if (r.bit()) r.bit(); // overscan
  const at = r.pos;
  if (r.bit()) { r.u(4); if (r.bit()) r.u(24); } // the old signal type, dropped
  w.copy(r, 0, at);
  signal();
  w.copy(r, r.pos, stop);
  return Uint8Array.from([nal[0]!, ...escape(w.finish())]);
}

/** An avcC (AVCDecoderConfigurationRecord) with each of its SPS rewritten. */
export function avcCWithColour(avcC: Uint8Array, colour: AvcColour): Uint8Array {
  const out: number[] = [...avcC.subarray(0, 5)];
  let p = 5;
  const sets = avcC[p]! & 0x1f;
  out.push(avcC[p++]!);
  for (let i = 0; i < sets; i++) {
    const len = (avcC[p]! << 8) | avcC[p + 1]!;
    const sps = spsWithColour(avcC.subarray(p + 2, p + 2 + len), colour);
    out.push(sps.length >> 8, sps.length & 0xff, ...sps);
    p += 2 + len;
  }
  // the PPS and anything after (a High profile's chroma format and bit depths) stay as they are
  for (; p < avcC.length; p++) out.push(avcC[p]!);
  return Uint8Array.from(out);
}

/**
 * A length-prefixed ('avc' format) access unit with any in-band SPS rewritten, or null when it
 * carries none (then the chunk can be passed on as it is).
 */
export function accessUnitWithColour(unit: Uint8Array, colour: AvcColour, lengthSize = 4): Uint8Array | null {
  const parts: Uint8Array[] = [];
  let changed = false;
  for (let p = 0; p + lengthSize <= unit.length;) {
    let len = 0;
    for (let k = 0; k < lengthSize; k++) len = len * 256 + unit[p + k]!;
    const nal = unit.subarray(p + lengthSize, p + lengthSize + len);
    if ((nal[0]! & 0x1f) === 7) {
      const sps = spsWithColour(nal, colour);
      const head = new Uint8Array(lengthSize);
      for (let k = 0, n = sps.length; k < lengthSize; k++) head[lengthSize - 1 - k] = (n / 256 ** k) & 0xff;
      parts.push(head, sps);
      changed = true;
    } else parts.push(unit.subarray(p, p + lengthSize + len));
    p += lengthSize + len;
  }
  if (!changed) return null;
  const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of parts) { out.set(x, o); o += x.length; }
  return out;
}
