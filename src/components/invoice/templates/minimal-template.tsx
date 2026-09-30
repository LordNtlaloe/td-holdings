// components/invoice/templates/minimal-template.tsx
import { format } from "date-fns";
import type { InvoicePrintViewProps } from "./invoice-print-view";

export function MinimalTemplate({ invoice }: InvoicePrintViewProps) {
  const subtotal = invoice.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="bg-white px-10 py-10">
      <style>{`
        @media print {
          .invoice-print-area { padding: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            {invoice.docType === "quotation" && "Quotation"}
            {invoice.docType === "proforma" && "Proforma Invoice"}
            {invoice.docType === "invoice" && "Invoice"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {invoice.store?.name}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-gray-900">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-sm text-gray-400">
            {format(new Date(invoice.createdAt), "PPP")}
          </p>
        </div>
      </div>

      <div className="mt-8 h-px w-full bg-gray-100" />

      {/* Info row */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400">From</p>
          <p className="mt-2 text-gray-900">{invoice.store?.address}</p>
          <p className="text-gray-500">{invoice.store?.phone}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400">Billed to</p>
          <p className="mt-2 text-gray-900">
            {invoice.customer?.name ?? invoice.customerName ?? "Walk-in customer"}
          </p>
          {invoice.customerPhone && (
            <p className="text-gray-500">{invoice.customerPhone}</p>
          )}
        </div>
        {invoice.validUntil && (
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">Valid until</p>
            <p className="mt-2 text-gray-900">
              {format(new Date(invoice.validUntil), "PPP")}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mt-10">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-gray-400">
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 text-right font-medium">Qty</th>
              <th className="pb-3 text-right font-medium">Price</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any) => (
              <tr key={item._id} className="border-t border-gray-100">
                <td className="py-3">
                  <p className="text-gray-900">{item.product?.name ?? "Unknown"}</p>
                  {(item.size || item.color || item.variant) && (
                    <p className="text-xs text-gray-400">
                      {[item.size, item.color, item.variant].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="py-3 text-right font-mono text-gray-700">{item.quantity}</td>
                <td className="py-3 text-right font-mono text-gray-700">
                  R{item.unitPrice.toFixed(2)}
                </td>
                <td className="py-3 text-right font-mono text-gray-900">
                  R{(item.quantity * item.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-60 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="font-mono text-gray-700">R{subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Discount</span>
              <span className="font-mono text-gray-700">
                -R{invoice.discountTotal.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-900 pt-2 text-base font-semibold text-gray-900">
            <span>Total</span>
            <span className="font-mono">R{invoice.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-10 border-t border-gray-100 pt-6">
          <p className="text-xs uppercase tracking-widest text-gray-400">Notes</p>
          <p className="mt-1 text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}