/**
 * Receipt rendering + delivery — the original Convex print configuration.
 *
 * This is a faithful port of `convex/print.ts` (and the print actions in
 * `convex/stores.ts`) onto the Turso-backed Hono API. The rendering pipeline,
 * the receipt layout, the logo handling and the Fly.io relay contract are all
 * unchanged from the Convex implementation — only the runtime differs:
 *
 *   Convex action  →  Hono route handler
 *   ctx.runQuery   →  a Drizzle select
 *   process.env    →  the same process.env, loaded by `../env.ts`
 *
 * Delivery still goes through the relay:
 *
 *   API  ──POST /print/:agentId──▶  Fly.io relay  ──WebSocket──▶  Electron till
 *                                   (Bearer secret)                (thermal printer)
 *
 * The relay expects `{ receiptData: <base64>, paymentMethod }` and forwards the
 * bytes verbatim to the Electron agent registered under that agent id.
 */

import React from "react";
import {
  render,
  Printer,
  Text,
  Row,
  Line,
  Br,
  Cut,
  Image,
} from "react-thermal-printer";
import { Jimp } from "jimp";

// ===============================
// CONSTANTS
// ===============================

const LOGO_URL =
  "https://res.cloudinary.com/ntlaloe-org/image/upload/w_384,f_png/v1782201264/TD_Holdings_mm9zfc.png";
const LOGO_MAX_WIDTH = 240;

// Set these in the environment (`.env`):
//   RELAY_URL    = https://td-print-relay.fly.dev
//   RELAY_SECRET = <the same secret the relay + till agents use>
export const RELAY_URL = (process.env.RELAY_URL || "").trim();
export const RELAY_SECRET = (process.env.RELAY_SECRET || "").trim();

if (!RELAY_URL || !RELAY_SECRET) {
  console.warn(
    "RELAY_URL or RELAY_SECRET is not set — printing will fail until both are configured."
  );
}

// ===============================
// HELPERS
// ===============================

export function formatCurrency(amount: number) {
  return `R${amount.toFixed(2)}`;
}

function isTyreDepartment(departmentName: string) {
  return departmentName?.toLowerCase().includes("tyre") ?? false;
}

function hasTyreItems(items: ReceiptItem[]): boolean {
  return items.some((item) => isTyreDepartment(item.departmentName));
}

async function nodeImageReader(src: string): Promise<{
  data: Uint8Array;
  width: number;
  height: number;
}> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch logo: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const image = await Jimp.read(inputBuffer);

  if (image.width > LOGO_MAX_WIDTH) {
    image.resize({ w: LOGO_MAX_WIDTH });
  }

  return {
    data: new Uint8Array(image.bitmap.data),
    width: image.bitmap.width,
    height: image.bitmap.height,
  };
}

function getShortName(fullName: string): string {
  if (!fullName) return "";
  const nameWithoutTitle = fullName.split(",")[0].trim();
  const nameParts = nameWithoutTitle.split(" ");
  if (nameParts.length > 1 && nameParts[0].endsWith(".")) {
    return `${nameParts[0]} ${nameParts[1]}`;
  }
  return nameParts[0] || fullName;
}

// ===============================
// TYPES
// ===============================

export type ReceiptItem = {
  productId: string;
  name: string;
  sku: string;
  size?: string;
  color?: string;
  variant?: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
  departmentId: string;
  departmentName: string;
};

export type SaleDiscount = {
  productId: string;
  discountAmount: number;
  reason?: string;
};

export type PrintReceiptArgs = {
  saleId: string;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  customerName?: string;
  cashierName?: string;
  paymentMethod: string;
  amountReceived?: number;
  changeDue?: number;
  items: ReceiptItem[];
  discounts: SaleDiscount[];
  total: number;
  itemCount: number;
  completedAt: number;
  agentId: string;
};

// ===============================
// RELAY HELPER
// ===============================

/**
 * Sends rendered ESC/POS bytes to a specific till via the Fly.io relay.
 * The relay forwards this over WebSocket to the matching Electron agent,
 * which writes it to the shared thermal printer.
 *
 * Throws on any non-2xx response so the caller's try/catch can report a
 * clear error back to the POS UI (e.g. "till offline" vs "bad auth").
 */
export async function sendToRelay(
  receiptBytes: Uint8Array,
  agentId: string,
  paymentMethod: string
): Promise<string> {
  if (!RELAY_URL || !RELAY_SECRET) {
    throw new Error(
      "Print relay is not configured — RELAY_URL/RELAY_SECRET missing in environment"
    );
  }

  const base64Data = Buffer.from(receiptBytes).toString("base64");

  const response = await fetch(`${RELAY_URL}/print/${agentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RELAY_SECRET}`,
    },
    body: JSON.stringify({
      receiptData: base64Data,
      paymentMethod,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Relay error (${response.status}): ${responseText}`);
  }

  return responseText;
}

// ===============================
// RECEIPT RENDERING
// ===============================

/**
 * Builds the receipt React tree and renders it to ESC/POS bytes.
 * Layout, header selection and totals are identical to `convex/print.ts`.
 */
export async function renderReceipt(args: PrintReceiptArgs): Promise<Uint8Array> {
  const children: React.ReactNode[] = [];

  const items = args.items as ReceiptItem[];
  const discounts = args.discounts as SaleDiscount[];
  const hasTyre = hasTyreItems(items);

  const discountByProduct: Record<string, number> = {};
  for (const d of discounts) {
    discountByProduct[d.productId] = d.discountAmount;
  }

  const totalDiscount = discounts.reduce((sum, d) => sum + d.discountAmount, 0);

  let headerName: string;
  let headerLabel: string;

  if (hasTyre) {
    headerName = args.storeName.toUpperCase();
    headerLabel = "STORE";
  } else {
    const departmentNames = new Set(items.map((item) => item.departmentName));
    headerName = Array.from(departmentNames).join(", ").toUpperCase();
    headerLabel = "DEPARTMENT";
  }

  // ── LOGO ──────────────────────────────────────────────────────────
  try {
    children.push(
      React.createElement(Image, {
        align: "center",
        src: LOGO_URL,
        reader: async () => nodeImageReader(LOGO_URL),
      })
    );
    children.push(React.createElement(Br, null));
  } catch (error) {
    console.warn("Failed to load logo:", error);
  }

  // ── HEADER ────────────────────────────────────────────────────────
  children.push(
    React.createElement(
      Text,
      { align: "center", size: { width: 2, height: 2 } },
      headerName
    )
  );
  children.push(
    React.createElement(Text, { align: "center" }, `${headerLabel} RECEIPT`)
  );
  if (args.storeAddress) {
    children.push(
      React.createElement(Text, { align: "center" }, args.storeAddress)
    );
  }
  if (args.storePhone) {
    children.push(
      React.createElement(Text, { align: "center" }, `Tel: ${args.storePhone}`)
    );
  }
  children.push(React.createElement(Line, { character: "=" }));
  children.push(React.createElement(Br, null));

  // ── DATE & TRANSACTION ID ─────────────────────────────────────────
  children.push(
    React.createElement(
      Text,
      { align: "center" },
      new Date(args.completedAt).toLocaleString("en-ZA")
    )
  );
  children.push(
    React.createElement(
      Text,
      { align: "center" },
      `Transaction ID: ${args.saleId.slice(-8)}`
    )
  );
  children.push(React.createElement(Br, null));
  children.push(React.createElement(Line, null));
  children.push(React.createElement(Br, null));

  // ── TRANSACTION DETAILS ───────────────────────────────────────────
  children.push(
    React.createElement(Text, { align: "center" }, "TRANSACTION DETAILS")
  );
  children.push(React.createElement(Br, null));

  if (args.cashierName) {
    const shortCashierName = getShortName(args.cashierName);
    children.push(
      React.createElement(Text, null, `Cashier: ${shortCashierName}`)
    );
  }

  if (args.customerName) {
    const shortCustomerName = getShortName(args.customerName);
    children.push(
      React.createElement(Text, null, `Customer: ${shortCustomerName}`)
    );
  }

  children.push(
    React.createElement(Text, null, `Payment: ${args.paymentMethod}`)
  );

  if (args.paymentMethod === "Cash" && args.amountReceived !== undefined) {
    children.push(
      React.createElement(
        Text,
        null,
        `Amount Received: ${formatCurrency(args.amountReceived)}`
      )
    );
    if (args.changeDue !== undefined && args.changeDue > 0) {
      children.push(
        React.createElement(
          Text,
          null,
          `Change Due: ${formatCurrency(args.changeDue)}`
        )
      );
    }
  }

  children.push(React.createElement(Br, null));
  children.push(React.createElement(Line, null));

  // ── ITEMS LIST ────────────────────────────────────────────────────
  children.push(
    React.createElement(Text, { align: "center" }, "ITEMS PURCHASED")
  );
  children.push(React.createElement(Br, null));

  for (const line of items) {
    const optionLabel = [line.size, line.color, line.variant]
      .filter(Boolean)
      .join(" / ");
    const itemName = `${line.name}${optionLabel ? ` (${optionLabel})` : ""}`;
    const lineTotal = line.unitPrice * line.quantity;

    let lineDiscount = 0;
    const productDiscount = discountByProduct[line.productId];
    if (productDiscount !== undefined) {
      const totalQtyForProduct = items
        .filter((i) => i.productId === line.productId)
        .reduce((sum, i) => sum + i.quantity, 0);
      lineDiscount = (productDiscount * line.quantity) / totalQtyForProduct;
    }

    children.push(
      React.createElement(Text, null, itemName.substring(0, 32).toUpperCase())
    );
    children.push(
      React.createElement(Row, {
        left: `${line.quantity} x ${formatCurrency(line.unitPrice)}`,
        right: formatCurrency(lineTotal),
      })
    );
    if (lineDiscount > 0) {
      children.push(
        React.createElement(Row, {
          left: `  Discount:`,
          right: `-${formatCurrency(lineDiscount)}`,
        })
      );
    }
    children.push(React.createElement(Br, null));
  }

  // ── TOTALS ────────────────────────────────────────────────────────
  children.push(React.createElement(Line, null));
  children.push(React.createElement(Br, null));
  children.push(
    React.createElement(Text, { align: "center", bold: true }, "TOTALS")
  );
  children.push(React.createElement(Br, null));

  children.push(
    React.createElement(Row, {
      left: "Item Count:",
      right: args.itemCount.toString(),
    })
  );

  const subtotal = args.total + totalDiscount;
  children.push(
    React.createElement(Row, {
      left: "Subtotal:",
      right: formatCurrency(subtotal),
    })
  );

  if (totalDiscount > 0) {
    children.push(
      React.createElement(Row, {
        left: "Total Discounts:",
        right: `-${formatCurrency(totalDiscount)}`,
      })
    );
  }

  children.push(
    React.createElement(Row, {
      left: "TOTAL AMOUNT:",
      right: formatCurrency(args.total),
    })
  );

  children.push(React.createElement(Br, null));
  children.push(React.createElement(Line, null));
  children.push(
    React.createElement(
      Text,
      { align: "center" },
      `PAYMENT: ${args.paymentMethod}`
    )
  );

  if (args.paymentMethod === "Cash" && args.amountReceived !== undefined) {
    children.push(
      React.createElement(
        Text,
        { align: "center" },
        `Received: ${formatCurrency(args.amountReceived)}`
      )
    );
    if (args.changeDue !== undefined && args.changeDue > 0) {
      children.push(
        React.createElement(
          Text,
          { align: "center" },
          `Change: ${formatCurrency(args.changeDue)}`
        )
      );
    }
  }

  children.push(React.createElement(Br, null));
  children.push(React.createElement(Line, null));

  // ── FOOTER ────────────────────────────────────────────────────────
  children.push(React.createElement(Br, null));
  children.push(
    React.createElement(Text, { align: "center" }, "THANK YOU FOR SHOPPING WITH US")
  );
  children.push(
    React.createElement(Text, { align: "center" }, "Quality • Service • Trust")
  );
  children.push(React.createElement(Br, null));
  children.push(
    React.createElement(
      Text,
      { align: "center" },
      "Please keep this receipt for returns/exchanges"
    )
  );
  children.push(React.createElement(Br, null));
  children.push(React.createElement(Cut, null));

  const receipt = React.createElement(Printer, {
    type: "epson" as const,
    width: 42,
    characterSet: "korea" as const,
    children,
  });

  return await render(receipt);
}

// ===============================
// RELAY HEALTH
// ===============================

/**
 * Asks the relay which till agents are currently connected.
 * Mirrors the `GET /health` probe from the original `testPrintConnection`.
 */
export async function fetchConnectedAgents(): Promise<string[]> {
  if (!RELAY_URL || !RELAY_SECRET) {
    throw new Error("Relay not configured");
  }

  const healthResponse = await fetch(`${RELAY_URL}/health`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${RELAY_SECRET}`,
    },
  });

  if (!healthResponse.ok) {
    throw new Error(`Relay health check failed (${healthResponse.status})`);
  }

  const healthData = (await healthResponse.json()) as { connectedAgents?: string[] };
  return healthData.connectedAgents || [];
}