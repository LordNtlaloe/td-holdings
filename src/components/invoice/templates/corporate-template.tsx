// components/invoice/templates/corporate-template.tsx
import { format } from "date-fns";
import { MapPin, Phone, Mail, Globe, Landmark, Building2, User, Tag, CreditCard } from "lucide-react";
import type { InvoicePrintViewProps } from "./invoice-print-view";

// Fixed values not present in the current invoice data model.
// Update these if they ever change, or wire them up to real fields later.
const VAT_RATE = 0.15; // 15%
const PAYMENT_TERMS = "Net 30";
const BANK_DETAILS = {
  bankName: "Standard Lesotho Bank",
  accountNumber: "9087654321",
  branchCode: "090167",
};

export function CorporateTemplate({ invoice }: InvoicePrintViewProps) {
  const anyInvoice = invoice as any;

  const subtotal = invoice.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unitPrice,
    0
  );
  const vatAmount = +(subtotal * VAT_RATE).toFixed(2);

  const customerName = invoice.customer?.name ?? invoice.customerName ?? "Walk-in customer";
  const customerAddress = anyInvoice.customer?.address as string | undefined;
  const vatNumber = anyInvoice.customer?.vatNumber as string | undefined;
  const shipTo = anyInvoice.shipTo as
    | { name?: string; address?: string; line2?: string; line3?: string }
    | undefined;

  return (
    <div className="bg-white p-8 text-[13px]">
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
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
            <polygon points="26,4 46,15 46,37 26,48 6,37 6,15" fill="#2563eb" />
            <polygon points="26,4 46,15 26,26 6,15" fill="#3b82f6" />
            <polygon points="26,26 46,15 46,37 26,48" fill="#1d4ed8" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-indigo-900">
              {invoice.store?.name}
            </h1>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              {invoice.store?.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{invoice.store.address}</span>
                </div>
              )}
              {invoice.store?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{invoice.store.phone}</span>
                </div>
              )}
              {anyInvoice.store?.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{anyInvoice.store.email}</span>
                </div>
              )}
              {anyInvoice.store?.website && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{anyInvoice.store.website}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-3xl font-extrabold uppercase tracking-wide text-indigo-700">
            {invoice.docType === "quotation" && "Quotation"}
            {invoice.docType === "proforma" && "Proforma"}
            {invoice.docType === "invoice" && "Invoice"}
          </h2>

          <table className="ml-auto mt-4">
            <tbody>
              <tr>
                <td className="pr-8 py-0.5 text-left font-bold">Invoice #</td>
                <td className="py-0.5 text-right">{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="pr-8 py-0.5 text-left font-bold">Invoice Date</td>
                <td className="py-0.5 text-right">
                  {format(new Date(invoice.createdAt), "PPP")}
                </td>
              </tr>
              {invoice.validUntil && (
                <tr>
                  <td className="pr-8 py-0.5 text-left font-bold">Due Date</td>
                  <td className="py-0.5 text-right">
                    {format(new Date(invoice.validUntil), "PPP")}
                  </td>
                </tr>
              )}
              <tr>
                <td className="pr-8 py-0.5 text-left font-bold">Terms</td>
                <td className="py-0.5 text-right">{PAYMENT_TERMS}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <hr className="mt-6 border-gray-300" />

      {/* Bill To + Ship To */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-bold text-indigo-900">Bill To</p>
          <p className="mt-1 font-medium">{customerName}</p>
          {customerAddress && <p className="text-muted-foreground">{customerAddress}</p>}
          {invoice.customerPhone && (
            <p className="text-muted-foreground">{invoice.customerPhone}</p>
          )}
          {vatNumber && <p className="text-muted-foreground">VAT No.: {vatNumber}</p>}
        </div>
        <div className="rounded-md bg-indigo-50 p-4">
          <p className="text-sm font-bold text-indigo-900">Ship To</p>
          <p className="mt-1 font-medium">{shipTo?.name ?? customerName}</p>
          {shipTo?.line2 && <p className="text-muted-foreground">{shipTo.line2}</p>}
          {shipTo?.address ? (
            <p className="text-muted-foreground">{shipTo.address}</p>
          ) : (
            <p className="text-muted-foreground">Same as billing address</p>
          )}
          {shipTo?.line3 && <p className="text-muted-foreground">{shipTo.line3}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-left text-white">
              <th className="p-3 font-semibold">Description</th>
              <th className="p-3 text-right font-semibold">Qty</th>
              <th className="p-3 text-right font-semibold">Unit Price</th>
              <th className="p-3 text-right font-semibold">
                VAT ({Math.round(VAT_RATE * 100)}%)
              </th>
              <th className="p-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => {
              const lineTotal = item.quantity * item.unitPrice;
              const lineVat = +(lineTotal * VAT_RATE).toFixed(2);
              return (
                <tr
                  key={item._id}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="p-3">
                    <p className="font-medium">{item.product?.name ?? "Unknown"}</p>
                    {(item.size || item.color || item.variant) && (
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color, item.variant].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right">M{item.unitPrice.toFixed(2)}</td>
                  <td className="p-3 text-right">M{lineVat.toFixed(2)}</td>
                  <td className="p-3 text-right">M{lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>M{subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span>-M{invoice.discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT ({Math.round(VAT_RATE * 100)}%)</span>
            <span>M{vatAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t-2 border-gray-300 pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-indigo-700">M{invoice.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment instructions + Bank Details */}
      <div className="mt-8 rounded-md bg-indigo-50 p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm font-bold text-indigo-900">Payment Instructions</p>
          {/* Decorative mark */}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">Bank Name</p>
              <p className="text-muted-foreground">{BANK_DETAILS.bankName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">Branch Code</p>
              <p className="text-muted-foreground">{BANK_DETAILS.branchCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">Account Name</p>
              <p className="text-muted-foreground">{invoice.store?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">Reference</p>
              <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">Account No.</p>
              <p className="text-muted-foreground">{BANK_DETAILS.accountNumber}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-bold text-indigo-900">Notes</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center gap-4">
        <hr className="flex-1 border-gray-300" />
        <p className="text-xs text-muted-foreground">Thank you for your business!</p>
        <hr className="flex-1 border-gray-300" />
      </div>
    </div>
  );
}