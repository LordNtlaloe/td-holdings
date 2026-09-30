/**
 * Receipt layout for thermal printers.
 *
 * A receipt is built once as a list of blocks, then rendered either to plain
 * text (for previews/tests with no hardware) or to ESC/POS bytes. Keeping one
 * definition means the preview can never drift from what actually prints.
 */

import { EscPos, toPrintableAscii, twoColumnRow, wrapText, type EscPosAlign } from "./escpos.ts";
import { LOGO_DATA, LOGO_HEIGHT, LOGO_WIDTH } from "./logo-data.ts";

export type ReceiptBlock =
  | { kind: "text"; value: string; align?: EscPosAlign; bold?: boolean; height?: number; indent?: number }
  | { kind: "row"; label: string; value: string; bold?: boolean }
  | { kind: "rule"; character?: string }
  | { kind: "raster"; widthDots: number; heightDots: number; data: Buffer }
  | { kind: "feed"; lines?: number }
  | { kind: "cut" }
  | { kind: "cashDrawer" };

export interface ReceiptItem {
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  size?: string | null;
  color?: string | null;
  variant?: string | null;
}

export interface ReceiptInput {
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  /* Department the sale belongs to. Printed in the header, beneath the logo. */
  department?: string | null;
  saleId: string;
  createdAt: number;
  paymentMethod: string;
  paymentSplits?: Array<{ method: string; amount: number }> | null;
  amountReceived?: number | null;
  changeDue?: number | null;
  discountTotal?: number | null;
  items: ReceiptItem[];
  cashierName?: string | null;
  customerName?: string | null;
  currency?: string;
  footer?: string;
  /* Cash sales pop the drawer; card sales must not. */
  openCashDrawer?: boolean;
  /* Print the company logo above the store name; on unless set to false. */
  logo?: boolean;
}

/** `R1,500.00` — comma thousands separator, full stop before the cents. */
export function formatAmount(value: number, currency = "R"): string {
  const amount = Number.isFinite(value) ? value : 0;
  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${currency}${grouped}.${fraction}`;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanPart(part?: string | null): string | null {
  const value = String(part ?? "").trim();
  if (!value) return null;
  return ["n/a", "na", "-", "none", "null", "undefined"].includes(value.toLowerCase())
    ? null
    : value;
}

/**
 * ` (White - 1m)` — colour, then size, then variant, skipping whatever is unset.
 *
 * Returned as a suffix so it prints on the product-name line. The leading space
 * is only present when there is something to append. Variant is kept because it
 * carries real data ("Adult's", "Men's") and often appears alongside a size.
 */
function attributeSuffix(item: ReceiptItem): string {
  const parts = [cleanPart(item.color), cleanPart(item.size), cleanPart(item.variant)].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length ? ` (${parts.join(" - ")})` : "";
}

/** Assemble the block list for a completed sale. */
export function buildReceiptBlocks(input: ReceiptInput): ReceiptBlock[] {
  const currency = input.currency ?? "R";
  const blocks: ReceiptBlock[] = [];

  // The logo sits above everything, including the store name.
  if (input.logo !== false) {
    blocks.push({
      kind: "raster",
      widthDots: LOGO_WIDTH,
      heightDots: LOGO_HEIGHT,
      data: LOGO_DATA,
    });
    blocks.push({ kind: "feed", lines: 1 });
  }

  // The department the sale belongs to heads the receipt, directly beneath the
  // logo, rather than being repeated against every line item.
  const department = cleanPart(input.department);
  if (department) {
    blocks.push({ kind: "text", value: department, align: "center", bold: true });
  }

  blocks.push({ kind: "text", value: input.storeName, align: "center", bold: true, height: 2 });

  if (input.storeAddress) blocks.push({ kind: "text", value: input.storeAddress, align: "center" });
  if (input.storePhone) blocks.push({ kind: "text", value: input.storePhone, align: "center" });

  blocks.push({ kind: "rule" });
  // Real sale ids are 32 characters, so they are shortened to their last 8 for
  // readability. A short id (such as a test slip's "TEST-0000") is shown whole
  // rather than losing its leading characters.
  const receiptCode = input.saleId.length > 8 ? input.saleId.slice(-8) : input.saleId;
  blocks.push({ kind: "row", label: "Receipt", value: receiptCode.toUpperCase() });
  blocks.push({ kind: "row", label: "Date", value: formatDateTime(input.createdAt) });
  if (input.cashierName) blocks.push({ kind: "row", label: "Served by", value: input.cashierName });
  blocks.push({
    kind: "row",
    label: "Customer",
    value: input.customerName?.trim() || "Walk-in",
  });
  blocks.push({ kind: "rule" });

  if (input.items.length === 0) {
    blocks.push({ kind: "text", value: "No items on this sale", align: "center" });
  }

  let subtotal = 0;
  for (const item of input.items) {
    const lineTotal = item.unitPrice * item.quantity;
    subtotal += lineTotal;

    // Attributes ride along with the product name, e.g. "PVC Edging (White - 1m)".
    // A long suffix simply wraps, since a text block word-wraps.
    blocks.push({ kind: "text", value: `${item.name}${attributeSuffix(item)}` });

    blocks.push({
      kind: "row",
      label: `  ${item.quantity} x ${formatAmount(item.unitPrice, currency)}`,
      value: formatAmount(lineTotal, currency),
    });
  }

  const discount = Number(input.discountTotal ?? 0);
  const total = subtotal - discount;

  blocks.push({ kind: "rule" });
  blocks.push({ kind: "row", label: "Subtotal", value: formatAmount(subtotal, currency) });
  if (discount > 0) {
    blocks.push({ kind: "row", label: "Discount", value: `-${formatAmount(discount, currency)}` });
  }
  blocks.push({ kind: "row", label: "TOTAL", value: formatAmount(total, currency), bold: true });

  const splits = (input.paymentSplits ?? []).filter((split) => Number(split.amount) > 0);
  if (splits.length > 1) {
    blocks.push({ kind: "rule" });
    for (const split of splits) {
      blocks.push({
        kind: "row",
        label: split.method,
        value: formatAmount(Number(split.amount), currency),
      });
    }
  } else {
    blocks.push({ kind: "rule" });
    blocks.push({
      kind: "row",
      label: `Paid (${input.paymentMethod})`,
      value: formatAmount(Number(input.amountReceived ?? total), currency),
    });
  }

  if (input.amountReceived != null && Number(input.changeDue ?? 0) > 0) {
    blocks.push({ kind: "row", label: "Change", value: formatAmount(Number(input.changeDue), currency) });
  }

  blocks.push({ kind: "rule" });
  blocks.push({
    kind: "text",
    value: input.footer ?? "Thank you for your purchase!",
    align: "center",
  });

  blocks.push({ kind: "feed", lines: 3 });
  if (input.openCashDrawer) blocks.push({ kind: "cashDrawer" });
  blocks.push({ kind: "cut" });

  return blocks;
}

/** Plain-text rendering — used for previews and for verifying without hardware. */
export function renderReceiptText(blocks: ReceiptBlock[], width = 32): string {
  const lines: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "text": {
        const value = toPrintableAscii(block.value);
        const indent = block.indent ?? 0;
        if (block.align === "center") {
          for (const line of wrapText(value, width)) {
            lines.push(" ".repeat(Math.max(0, Math.floor((width - line.length) / 2))) + line);
          }
        } else if (indent > 0) {
          // Hanging indent: wrapped continuation lines stay aligned under the
          // first, so the list reads as one block.
          for (const line of wrapText(value, Math.max(1, width - indent))) {
            lines.push(" ".repeat(indent) + line);
          }
        } else {
          lines.push(...wrapText(value, width));
        }
        break;
      }
      case "row":
        lines.push(...twoColumnRow(block.label, block.value, width));
        break;
      case "rule":
        lines.push((block.character ?? "-").repeat(width));
        break;
      case "feed":
        lines.push(...Array.from({ length: block.lines ?? 1 }, () => ""));
        break;
      case "raster": {
        // A bitmap cannot be represented as text, so mark where it prints and
        // keep the preview honest about the layout.
        const marker = `[ LOGO ${block.widthDots}x${block.heightDots} ]`;
        lines.push(
          " ".repeat(Math.max(0, Math.floor((width - marker.length) / 2))) + marker
        );
        break;
      }
      case "cut":
        lines.push("[ CUT ]");
        break;
      case "cashDrawer":
        lines.push("[ OPEN CASH DRAWER ]");
        break;
    }
  }
  return lines.join("\n");
}

/**
 * ESC/POS font A is 12 dots wide, so a receipt's printable width in dots
 * follows from the column count it was asked for.
 */
function paperWidthInDots(columns: number): number {
  return columns * 12;
}

/**
 * Centre a raster image by padding it with blank columns.
 *
 * `ESC a` (align) is not reliably applied to raster graphics by every thermal
 * printer, so the centring is baked into the image instead. That makes the
 * result identical on any printer rather than dependent on its firmware.
 */
function centerRaster(
  data: Buffer,
  widthDots: number,
  heightDots: number,
  paperDots: number
): { widthDots: number; data: Buffer } {
  const stride = Math.ceil(widthDots / 8);
  const paperStride = Math.floor(paperDots / 8);
  const pad = Math.max(0, Math.floor((paperStride - stride) / 2));
  if (pad === 0) return { widthDots, data };

  const totalStride = stride + pad * 2;
  const out = Buffer.alloc(totalStride * heightDots);
  for (let row = 0; row < heightDots; row += 1) {
    data.copy(out, row * totalStride + pad, row * stride, (row + 1) * stride);
  }
  return { widthDots: totalStride * 8, data: out };
}

/** ESC/POS byte stream for the same block list. */
export function renderReceiptEscPos(blocks: ReceiptBlock[], width = 32): Buffer {
  const printer = new EscPos({ width }).init();
  for (const block of blocks) {
    switch (block.kind) {
      case "text": {
        printer
          .align(block.align ?? "left")
          .bold(Boolean(block.bold))
          .size(1, block.height ?? 1);
        const indent = block.indent ?? 0;
        if (indent > 0 && block.align !== "center") {
          const value = toPrintableAscii(block.value);
          for (const line of wrapText(value, Math.max(1, width - indent))) {
            printer.line(" ".repeat(indent) + line);
          }
        } else {
          printer.paragraph(block.value);
        }
        printer.align("left").bold(false).size(1, 1);
        break;
      }
      case "row":
        printer.bold(Boolean(block.bold)).row(block.label, block.value).bold(false);
        break;
      case "rule":
        printer.rule(block.character);
        break;
      case "feed":
        printer.feed(block.lines ?? 1);
        break;
      case "raster": {
        const centered = centerRaster(
          block.data,
          block.widthDots,
          block.heightDots,
          paperWidthInDots(width)
        );
        printer.raster(centered.widthDots, block.heightDots, centered.data);
        break;
      }
      case "cut":
        printer.cut();
        break;
      case "cashDrawer":
        printer.openCashDrawer();
        break;
    }
  }
  return printer.toBuffer();
}
