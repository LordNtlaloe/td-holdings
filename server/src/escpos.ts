/**
 * Minimal ESC/POS encoder for thermal receipt printers.
 *
 * Deliberately dependency-free: thermal printing only needs a handful of
 * control sequences, and hand-rolling them keeps the byte stream predictable
 * and testable without hardware.
 */

const ESC = 0x1b;
const GS = 0x1d;

export type EscPosAlign = "left" | "center" | "right";

export interface EscPosOptions {
  /** Characters per line — 32 for 58mm paper, 48 for 80mm. */
  width?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

// Typographic characters the printers' default code page cannot render.
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201b]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/\u2026/g, "..."],
  [/\u2022/g, "*"],
  [/\u00b7/g, "."],
  [/\u00d7/g, "x"],
  [/\u00a0/g, " "],
  [/\u00b0/g, " deg"],
];

/**
 * Reduce a string to printable ASCII. Anything left unrenderable is dropped
 * rather than sent as garbage bytes — a receipt full of `?` is worse than a
 * missing accent.
 */
export function toPrintableAscii(value: string): string {
  let output = value ?? "";
  for (const [pattern, replacement] of REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output.replace(/[^\x20-\x7e\n]/g, "");
}

/** Greedy word wrap; words longer than the width are hard-split. */
export function wrapText(value: string, width: number): string[] {
  const lines: string[] = [];
  for (const rawLine of String(value ?? "").split("\n")) {
    let current = "";
    for (const word of rawLine.split(/\s+/).filter(Boolean)) {
      if (!current.length) {
        current = word;
      } else if (current.length + 1 + word.length <= width) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
      while (current.length > width) {
        lines.push(current.slice(0, width));
        current = current.slice(width);
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Right-align `value` within `width`, truncating from the left if needed. */
export function rightAlign(value: string, width: number): string {
  if (value.length >= width) return value.slice(value.length - width);
  return " ".repeat(width - value.length) + value;
}

/** One row: `label` on the left, `value` flush right. */
export function twoColumnRow(
  label: string,
  value: string,
  width: number
): string[] {
  const left = toPrintableAscii(label);
  const right = toPrintableAscii(value);
  if (left.length + right.length + 1 <= width) {
    return [left + " ".repeat(width - left.length - right.length) + right];
  }
  const labelLines = wrapText(left, Math.max(1, width - right.length - 1));
  const lastLabel = labelLines.pop() ?? "";
  return [...labelLines, lastLabel + " ".repeat(Math.max(1, width - lastLabel.length - right.length)) + right];
}

export class EscPos {
  readonly width: number;
  private chunks: Buffer[] = [];

  constructor(options: EscPosOptions = {}) {
    this.width = options.width ?? 32;
  }

  private raw(...bytes: number[]): this {
    this.chunks.push(Buffer.from(bytes));
    return this;
  }

  /** ESC @ — reset the printer to its power-on defaults. */
  init(): this {
    return this.raw(ESC, 0x40);
  }

  align(position: EscPosAlign): this {
    const value = position === "center" ? 1 : position === "right" ? 2 : 0;
    return this.raw(ESC, 0x61, value);
  }

  bold(enabled = true): this {
    return this.raw(ESC, 0x45, enabled ? 1 : 0);
  }

  /** GS ! n — character size multipliers, 1..8 per axis. */
  size(widthMultiplier = 1, heightMultiplier = 1): this {
    const w = clamp(widthMultiplier, 1, 8) - 1;
    const h = clamp(heightMultiplier, 1, 8) - 1;
    return this.raw(GS, 0x21, (w << 4) | h);
  }

  text(value: string): this {
    this.chunks.push(Buffer.from(toPrintableAscii(value), "latin1"));
    return this;
  }

  line(value = ""): this {
    return this.text(`${value}\n`);
  }

  /** Horizontal rule, with an optional label such as `-- CARD --`. */
  rule(character = "-"): this {
    return this.line(character.repeat(this.width));
  }

  /** `label` left, `value` flush right, wrapping when it will not fit. */
  row(label: string, value: string): this {
    for (const line of twoColumnRow(label, value, this.width)) this.line(line);
    return this;
  }

  paragraph(value: string): this {
    for (const line of wrapText(toPrintableAscii(value), this.width)) this.line(line);
    return this;
  }

  /** ESC d n — print and feed n lines. */
  feed(lines = 1): this {
    return this.raw(ESC, 0x64, clamp(lines, 0, 255));
  }

  /** GS V — partial cut with a feed first. */
  cut(): this {
    return this.raw(GS, 0x56, 0x42, 0x00);
  }

  /** ESC p — kick the cash drawer wired to the printer. */
  openCashDrawer(): this {
    return this.raw(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  /**
   * GS v 0 — print a 1-bit raster image.
   *
   * This is the only way to put artwork on a thermal printer: the protocol has
   * no font files and no image support, so anything outside the built-in
   * character set (a logo, or a chosen typeface) has to arrive as dots.
   *
   * `data` must hold one bit per dot, most significant bit first, `1` meaning
   * print a dot, with every row padded out to a whole byte — which is exactly
   * the layout of a PBM (`P4`) file body.
   */
  raster(widthDots: number, heightDots: number, data: Buffer): this {
    const stride = Math.ceil(widthDots / 8);
    const required = stride * heightDots;
    if (data.length < required) {
      throw new Error(
        `Raster needs ${required} bytes for ${widthDots}x${heightDots} dots but received ${data.length}`
      );
    }

    this.raw(
      GS,
      0x76, // "v"
      0x30, // literal "0" that completes the GS v 0 command
      0x00, // m — 0 selects normal density
      stride & 0xff,
      (stride >> 8) & 0xff,
      heightDots & 0xff,
      (heightDots >> 8) & 0xff
    );
    this.chunks.push(data.subarray(0, required));
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
