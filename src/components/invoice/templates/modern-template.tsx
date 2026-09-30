// components/invoice/templates/modern-template.tsx
import { format } from "date-fns";
import type { InvoicePrintViewProps } from "./invoice-print-view";

export function ModernTemplate({ invoice }: InvoicePrintViewProps) {
  const subtotal = invoice.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="bg-white p-8">
      <style>{`
        @media print {
          .invoice-print-area { padding: 0 !important; }
        }
      `}</style>

      {/* Header with gradient banner */}
      <div className="-mx-8 -mt-8 rounded-b-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white print:mx-0 print:mt-0 print:rounded-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{invoice.store?.name}</h1>
            <p className="mt-1 text-sm text-white/80">{invoice.store?.address}</p>
            <p className="text-sm text-white/80">{invoice.store?.phone}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-5 py-3 text-right backdrop-blur">
            <h2 className="text-2xl font-bold uppercase tracking-wide">
              {invoice.docType === "quotation" && "Quotation"}
              {invoice.docType === "proforma" && "Proforma"}
              {invoice.docType === "invoice" && "Invoice"}
            </h2>
            <p className="mt-1 font-mono text-sm text-white/80">#{invoice.invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Billed To
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {invoice.customer?.name ?? invoice.customerName ?? "Walk-in customer"}
          </p>
          {invoice.customerPhone && (
            <p className="text-sm text-gray-500">{invoice.customerPhone}</p>
          )}
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Date Issued
          </p>
          <p className="mt-1 font-semibold text-gray-900">
            {format(new Date(invoice.createdAt), "PPP")}
          </p>
          {invoice.validUntil && (
            <>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Valid Until
              </p>
              <p className="text-sm text-gray-700">
                {format(new Date(invoice.validUntil), "PPP")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900 text-left text-sm text-white">
              <th className="p-3 font-medium">Description</th>
              <th className="p-3 text-right font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Price</th>
              <th className="p-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => (
              <tr
                key={item._id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="p-3">
                  <p className="font-medium text-gray-900">
                    {item.product?.name ?? "Unknown"}
                  </p>
                  {(item.size || item.color || item.variant) && (
                    <p className="text-xs text-gray-400">
                      {[item.size, item.color, item.variant].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="p-3 text-right font-mono text-gray-700">{item.quantity}</td>
                <td className="p-3 text-right font-mono text-gray-700">
                  R{item.unitPrice.toFixed(2)}
                </td>
                <td className="p-3 text-right font-mono font-medium text-gray-900">
                  R{(item.quantity * item.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-72 space-y-2 rounded-xl bg-gray-50 p-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="font-mono text-gray-800">R{subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-sm text-purple-500">
              <span>Discount</span>
              <span className="font-mono">-R{invoice.discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-lg font-bold text-gray-900">
            <span>Total</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              R{invoice.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Notes
          </p>
          <p className="mt-1 text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}