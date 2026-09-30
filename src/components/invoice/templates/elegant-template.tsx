// components/invoice/templates/elegant-template.tsx
import { format } from "date-fns";
import { MapPin, Phone, Mail, Globe, CreditCard } from "lucide-react";
import type { InvoicePrintViewProps } from "./invoice-print-view";

// Fixed values not present in the current invoice data model.
// Update these if they ever change, or wire them up to real fields later.
const VAT_RATE = 0.15; // 15%
const PAYMENT_TERMS = "Net 14 Days";
const BANK_DETAILS = {
  bankName: "Standard Lesotho Bank",
  accountNumber: "9087654321",
  branchCode: "090167",
};

export function ElegantTemplate({ invoice }: InvoicePrintViewProps) {
  const anyInvoice = invoice as any;

  const subtotal = invoice.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unitPrice,
    0
  );
  const vatAmount = +(subtotal * VAT_RATE).toFixed(2);

  const storeName = invoice.store?.name ?? "";
  const [firstWord, ...restWords] = storeName.split(" ");
  const restOfName = restWords.join(" ");
  const initials = storeName
    .split(" ")
    .map((w: string) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const customerName = invoice.customer?.name ?? invoice.customerName ?? "Walk-in customer";
  const customerAddress = anyInvoice.customer?.address as string | undefined;
  const vatNumber = anyInvoice.customer?.vatNumber as string | undefined;
  const shipTo = anyInvoice.shipTo as
    | { name?: string; address?: string; line2?: string; line3?: string }
    | undefined;

  return (
    <div className="relative overflow-hidden bg-white p-6 pb-10 text-[13px] leading-tight">
      <style>{`
        @media print {
          .invoice-print-area { padding: 0 !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <svg width="40" height="40" viewBox="0 0 56 56" className="shrink-0">
            <polygon points="0,0 28,0 4,56 0,56" fill="#111827" />
            <polygon points="28,0 56,0 56,56 24,56" fill="#dc2626" />
            <text
              x="28"
              y="38"
              textAnchor="middle"
              fontSize="26"
              fontWeight="800"
              fill="white"
              fontFamily="sans-serif"
            >
              {initials}
            </text>
          </svg>
          <div>
            <h1 className="text-lg font-black leading-none tracking-tight">
              <span className="text-gray-900">{firstWord} </span>
              <span className="text-red-600">{restOfName}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-10 w-px bg-gray-300" />
          <h2 className="text-3xl font-black uppercase tracking-wide text-gray-900">
            {invoice.docType === "quotation" && "Quote"}
            {invoice.docType === "proforma" && "Proforma"}
            {invoice.docType === "invoice" && "Invoice"}
          </h2>
        </div>
      </div>

      {/* Contact info + invoice meta */}
      <div className="mt-3 flex items-start justify-between">
        <div className="space-y-0.5 text-gray-700">
          {invoice.store?.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-600" />
              <span>{invoice.store.address}</span>
            </div>
          )}
          {invoice.store?.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-red-600" />
              <span>{invoice.store.phone}</span>
            </div>
          )}
          {anyInvoice.store?.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-red-600" />
              <span>{anyInvoice.store.email}</span>
            </div>
          )}
          {anyInvoice.store?.website && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-red-600" />
              <span>{anyInvoice.store.website}</span>
            </div>
          )}
        </div>

        <table>
          <tbody>
            <tr>
              <td className="pr-3 py-0 font-semibold text-gray-500">Invoice No.</td>
              <td className="py-0 font-bold text-red-600">: {invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td className="pr-3 py-0 font-semibold text-gray-500">Invoice Date</td>
              <td className="py-0">: {format(new Date(invoice.createdAt), "d MMMM yyyy")}</td>
            </tr>
            {invoice.validUntil && (
              <tr>
                <td className="pr-3 py-0 font-semibold text-gray-500">Due Date</td>
                <td className="py-0">: {format(new Date(invoice.validUntil), "d MMMM yyyy")}</td>
              </tr>
            )}
            <tr>
              <td className="pr-3 py-0 font-semibold text-gray-500">Payment Terms</td>
              <td className="py-0">: {PAYMENT_TERMS}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billed To + Ship To */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-900">Billed To</p>
          <div className="mt-0.5 h-0.5 w-5 bg-red-600" />
          <p className="mt-1 font-bold text-gray-900">{customerName}</p>
          {customerAddress && <p className="text-gray-600">{customerAddress}</p>}
          {invoice.customerPhone && <p className="text-gray-600">{invoice.customerPhone}</p>}
          {vatNumber && <p className="text-gray-600">VAT No.: {vatNumber}</p>}
        </div>
        <div className="rounded bg-gray-50 p-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-900">Ship To</p>
          <div className="mt-0.5 h-0.5 w-5 bg-red-600" />
          <p className="mt-1 font-bold text-gray-900">{shipTo?.name ?? customerName}</p>
          {shipTo?.line2 && <p className="text-gray-600">{shipTo.line2}</p>}
          {shipTo?.address ? (
            <p className="text-gray-600">{shipTo.address}</p>
          ) : (
            <p className="text-gray-500">Same as billing address</p>
          )}
          {shipTo?.line3 && <p className="text-gray-600">{shipTo.line3}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900 text-left text-white">
              <th className="p-1.5 font-semibold">#</th>
              <th className="p-1.5 font-semibold">Description</th>
              <th className="p-1.5 text-right font-semibold">Qty</th>
              <th className="p-1.5 text-right font-semibold">Unit Price</th>
              <th className="p-1.5 text-right font-semibold">
                VAT ({Math.round(VAT_RATE * 100)}%)
              </th>
              <th className="p-1.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => {
              const lineTotal = item.quantity * item.unitPrice;
              const lineVat = +(lineTotal * VAT_RATE).toFixed(2);
              return (
                <tr key={item._id} className="border-b border-gray-200">
                  <td className="p-1.5 text-gray-500">{index + 1}</td>
                  <td className="p-1.5">
                    <p className="font-semibold text-gray-900">
                      {item.product?.name ?? "Unknown"}
                    </p>
                    {(item.size || item.color || item.variant) && (
                      <p className="text-xs text-gray-500">
                        {[item.size, item.color, item.variant].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="p-1.5 text-right">{item.quantity}</td>
                  <td className="p-1.5 text-right">M{item.unitPrice.toFixed(2)}</td>
                  <td className="p-1.5 text-right">M{lineVat.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-bold text-red-600">
                    M{lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-2 flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-0.5 uppercase text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">M{subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between py-0.5 uppercase text-gray-600">
              <span>Discount</span>
              <span className="font-semibold text-gray-900">
                -M{invoice.discountTotal.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between py-0.5 uppercase text-gray-600">
            <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
            <span className="font-semibold text-gray-900">M{vatAmount.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-gray-900 pt-1.5">
            <span className="text-sm font-bold uppercase text-gray-900">Total Due</span>
            <span className="text-xl font-black text-red-600">
              M{invoice.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes + Bank Details */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-900">Notes</p>
          <div className="mt-0.5 h-0.5 w-5 bg-red-600" />
          <p className="mt-1 text-gray-600">{invoice.notes ?? "Thank you for your business!"}</p>
          <p className="text-gray-600">
            Please make payment within {PAYMENT_TERMS.replace("Net ", "").replace(" Days", "")}{" "}
            days of invoice date.
          </p>
        </div>
        <div className="rounded border border-gray-200 p-2.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-red-600" />
            <p className="font-bold text-red-600">Bank Details</p>
          </div>
          <div className="mt-1 space-y-0 text-gray-700">
            <p>
              <span className="font-bold text-gray-900">Bank Name: </span>
              {BANK_DETAILS.bankName}
            </p>
            <p>
              <span className="font-bold text-gray-900">Account Name: </span>
              {invoice.store?.name}
            </p>
            <p>
              <span className="font-bold text-gray-900">Account No.: </span>
              {BANK_DETAILS.accountNumber}
            </p>
            <p>
              <span className="font-bold text-gray-900">Branch Code: </span>
              {BANK_DETAILS.branchCode}
            </p>
            <p>
              <span className="font-bold text-gray-900">Reference: </span>
              {invoice.invoiceNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <div className="h-px w-16 bg-gray-300" />
        <p className="font-serif text-lg italic text-red-600">Thank You</p>
        <div className="h-px w-16 bg-gray-300" />
      </div>
      <p className="mt-0.5 text-center text-xs uppercase tracking-[0.25em] text-gray-500">
        For Your Business
      </p>

      {/* Diagonal footer bar */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        height="14"
        viewBox="0 0 1000 14"
        preserveAspectRatio="none"
      >
        <polygon points="0,14 0,0 260,0 180,14" fill="#dc2626" />
        <polygon points="180,14 260,0 1000,0 1000,14" fill="#111827" />
      </svg>
    </div>
  );
}