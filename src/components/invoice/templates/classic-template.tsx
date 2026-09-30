// components/invoice/templates/classic-template.tsx
import { format } from "date-fns";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Truck,
  StickyNote,
  Landmark,
  CreditCard,
  Building2,
  Tag,
} from "lucide-react";
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

export function ClassicTemplate({ invoice }: InvoicePrintViewProps) {
  const anyInvoice = invoice as any;

  const subtotal = invoice.items.reduce(
    (sum: number, item: any) => sum + item.quantity * item.unitPrice,
    0
  );
  const vatAmount = +(subtotal * VAT_RATE).toFixed(2);

  const storeName = invoice.store?.name ?? "";
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
    <div className="bg-white p-6 text-[13px] leading-tight text-gray-800">
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-900 text-sm font-bold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-950">{storeName}</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
              {invoice.docType === "quotation" && "Quotation"}
              {invoice.docType === "proforma" && "Proforma"}
              {invoice.docType === "invoice" && "Invoice Services"}
            </p>
          </div>
        </div>

        <h2 className="text-3xl font-black tracking-wide text-blue-950">
          {invoice.docType === "quotation" && "QUOTATION"}
          {invoice.docType === "proforma" && "PROFORMA"}
          {invoice.docType === "invoice" && "INVOICE"}
        </h2>
      </div>

      {/* Contact info + invoice meta */}
      <div className="mt-3 flex items-start justify-between">
        <div className="space-y-1">
          {invoice.store?.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-900" />
              <span>{invoice.store.address}</span>
            </div>
          )}
          {invoice.store?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-blue-900" />
              <span>{invoice.store.phone}</span>
            </div>
          )}
          {anyInvoice.store?.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-blue-900" />
              <span>{anyInvoice.store.email}</span>
            </div>
          )}
          {anyInvoice.store?.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-blue-900" />
              <span>{anyInvoice.store.website}</span>
            </div>
          )}
        </div>

        <table>
          <tbody>
            <tr>
              <td className="pr-3 py-0 text-gray-500">Invoice No.</td>
              <td className="py-0">:</td>
              <td className="pl-2 py-0 font-bold text-blue-900">{invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td className="pr-3 py-0 text-gray-500">Invoice Date</td>
              <td className="py-0">:</td>
              <td className="pl-2 py-0">{format(new Date(invoice.createdAt), "d MMMM yyyy")}</td>
            </tr>
            {invoice.validUntil && (
              <tr>
                <td className="pr-3 py-0 text-gray-500">Due Date</td>
                <td className="py-0">:</td>
                <td className="pl-2 py-0">
                  {format(new Date(invoice.validUntil), "d MMMM yyyy")}
                </td>
              </tr>
            )}
            <tr>
              <td className="pr-3 py-0 text-gray-500">Payment Terms</td>
              <td className="py-0">:</td>
              <td className="pl-2 py-0">{PAYMENT_TERMS}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billed To + Ship To */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded bg-gray-50 p-3">
          <p className="mb-1 inline-block rounded bg-blue-900 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Bill To
          </p>
          <div className="mt-2 flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
            <div>
              <p className="font-bold text-gray-900">{customerName}</p>
              {customerAddress && <p className="text-gray-600">{customerAddress}</p>}
              {invoice.customerPhone && (
                <p className="text-gray-600">{invoice.customerPhone}</p>
              )}
              {vatNumber && <p className="text-gray-600">VAT No.: {vatNumber}</p>}
            </div>
          </div>
        </div>

        <div className="rounded bg-gray-50 p-3">
          <p className="mb-1 inline-block rounded bg-yellow-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Ship To
          </p>
          <div className="mt-2 flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div>
              <p className="font-bold text-gray-900">{shipTo?.name ?? customerName}</p>
              {shipTo?.line2 && <p className="text-gray-600">{shipTo.line2}</p>}
              {shipTo?.address ? (
                <p className="text-gray-600">{shipTo.address}</p>
              ) : (
                <p className="text-gray-500">Same as billing address</p>
              )}
              {shipTo?.line3 && <p className="text-gray-600">{shipTo.line3}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-950 text-left text-white">
              <th className="p-2 font-semibold">#</th>
              <th className="p-2 font-semibold">Description</th>
              <th className="p-2 text-right font-semibold">Qty</th>
              <th className="p-2 text-right font-semibold">Unit Price</th>
              <th className="p-2 text-right font-semibold">
                VAT ({Math.round(VAT_RATE * 100)}%)
              </th>
              <th className="p-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => {
              const lineTotal = item.quantity * item.unitPrice;
              const lineVat = +(lineTotal * VAT_RATE).toFixed(2);
              return (
                <tr
                  key={item._id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="p-2 text-gray-500">{index + 1}</td>
                  <td className="p-2">
                    <p className="font-semibold text-gray-900">
                      {item.product?.name ?? "Unknown"}
                    </p>
                    {(item.size || item.color || item.variant) && (
                      <p className="text-xs text-gray-500">
                        {[item.size, item.color, item.variant].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">M{item.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right">M{lineVat.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold text-blue-900">
                    M{lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-3 flex justify-end">
        <div className="w-72">
          <div className="flex justify-between px-2 py-1 uppercase text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">M{subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between px-2 py-1 uppercase text-gray-600">
              <span>Discount</span>
              <span className="font-semibold text-gray-900">
                -M{invoice.discountTotal.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t px-2 py-1 uppercase text-gray-600">
            <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
            <span className="font-semibold text-gray-900">M{vatAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded bg-blue-950 px-3 py-2 text-white">
            <span className="text-sm font-bold uppercase tracking-wide">Total Due</span>
            <span className="text-xl font-black text-yellow-400">
              M{invoice.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Note + Payment Details */}
      <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-4">
        <div className="rounded bg-yellow-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">Note</p>
          <div className="mt-2 flex items-start gap-2">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <p className="text-gray-600">
              {invoice.notes ?? "Thank you for your business!"} Please make payment within{" "}
              {PAYMENT_TERMS.replace("Net ", "").replace(" Days", "")} days of invoice date.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-950">
            Payment Details
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 shrink-0 text-blue-900" />
              <div>
                <p className="font-bold text-gray-900">Bank Name</p>
                <p className="text-gray-600">{BANK_DETAILS.bankName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-blue-900" />
              <div>
                <p className="font-bold text-gray-900">Branch Code</p>
                <p className="text-gray-600">{BANK_DETAILS.branchCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-blue-900" />
              <div>
                <p className="font-bold text-gray-900">Account Name</p>
                <p className="text-gray-600">{invoice.store?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-blue-900" />
              <div>
                <p className="font-bold text-gray-900">Reference</p>
                <p className="text-gray-600">{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-blue-900" />
              <div>
                <p className="font-bold text-gray-900">Account No.</p>
                <p className="text-gray-600">{BANK_DETAILS.accountNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 -mx-6 -mb-6 flex items-center gap-3 bg-blue-950 px-6 py-3 text-white print:mx-0 print:mb-0">
        <p className="text-sm font-bold text-yellow-400">Thank you!</p>
        <div className="h-6 w-px bg-white/30" />
        <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
          We appreciate your business
        </p>
      </div>
    </div>
  );
}