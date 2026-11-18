import { X } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { Label } from "#/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { formatCurrency } from "#/lib/pos/utils";
import { TEMPLATE_LABELS, type InvoiceTemplate } from "#/types/invoice-template-types";
import type { InvoiceLine, StockShortage } from "#/hooks/use-invoice-cart";
import type { DocType } from "./doc-types-tab";

interface InvoiceCartPanelProps {
  docType: DocType;
  nextNumber?: string;
  cart: InvoiceLine[];
  shortages: StockShortage[];
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  validUntilDays: number | null;
  onValidUntilDaysChange: (value: number | null) => void;
  discount: number;
  onDiscountChange: (value: number) => void;
  template: InvoiceTemplate;
  onTemplateChange: (value: InvoiceTemplate) => void;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onUpdatePrice: (key: string, unitPrice: number) => void;
  onRemove: (key: string) => void;
  netTotal: number;
  onSaveAndPrint: () => void;
  isSubmitting: boolean;
}

const DOC_LABEL: Record<DocType, string> = {
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  invoice: "Invoice",
};

const VALID_FOR_OPTIONS = [7, 14, 30, 60, 90];

export function InvoiceCartPanel(props: InvoiceCartPanelProps) {
  const {
    docType, nextNumber, cart, shortages, customerName, onCustomerNameChange, customerPhone,
    onCustomerPhoneChange, notes, onNotesChange, validUntilDays, onValidUntilDaysChange, discount,
    onDiscountChange, template, onTemplateChange, onUpdateQuantity, onUpdatePrice, onRemove,
    netTotal, onSaveAndPrint, isSubmitting,
  } = props;

  return (
    <Card className="flex h-fit flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">{DOC_LABEL[docType]}</CardTitle>
        {nextNumber && <span className="text-sm text-muted-foreground">{nextNumber} (auto)</span>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input aria-label="Customer name" placeholder="Customer name" value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} />
          <Input aria-label="Customer phone" placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => onCustomerPhoneChange(e.target.value)} />
        </div>

        <div className="space-y-2">
          {cart.length === 0 && (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Pick products to add them here
            </p>
          )}
          {cart.map((line) => {
            const options = [line.size, line.color, line.variant].filter(Boolean).join(" / ");
            return (
              <div key={line.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <div className="min-w-28 flex-1">
                  <p className="text-sm font-semibold">
                    {line.name}
                    {options && <span className="ml-1 text-xs font-normal text-muted-foreground">({options})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{line.sku}</p>
                </div>
                <Input
                  aria-label={`Quantity for ${line.name}`}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => onUpdateQuantity(line.key, Number(e.target.value))}
                  className="w-16 text-center"
                />
                <Input
                  aria-label={`Unit price for ${line.name}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => onUpdatePrice(line.key, Number(e.target.value))}
                  className="w-24 text-right"
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${line.name}`} onClick={() => onRemove(line.key)}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          })}
        </div>

        {shortages.length > 0 && (
          <div className="space-y-1 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {shortages.map((s) => (
              <p key={s.productId}>
                {s.name}: {s.requested} requested, {s.available} in stock.
              </p>
            ))}
            <p>You can still save this document, but converting it to a sale is blocked until stock is received.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="invoice-discount">Discount</Label>
          <Input id="invoice-discount" type="number" min={0} step="0.01" value={discount} onChange={(e) => onDiscountChange(Number(e.target.value))} className="w-28 text-right" />
        </div>

        {docType !== "invoice" && (
          <div className="flex items-center justify-between gap-3">
            <Label>Valid for</Label>
            <Select value={validUntilDays ? String(validUntilDays) : "none"} onValueChange={(v) => onValidUntilDaysChange(v === "none" ? null : Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_FOR_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} days
                  </SelectItem>
                ))}
                <SelectItem value="none">No expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Textarea aria-label="Notes" placeholder="Notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} />

        <div className="flex items-center justify-between gap-3">
          <Label>Print template</Label>
          <Select value={template} onValueChange={(v) => onTemplateChange(v as InvoiceTemplate)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TEMPLATE_LABELS) as InvoiceTemplate[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TEMPLATE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xl font-bold">
          <span>Net total</span>
          <span>{formatCurrency(netTotal)}</span>
        </div>

        <Button className="w-full" size="lg" onClick={onSaveAndPrint} disabled={isSubmitting || cart.length === 0}>
          {isSubmitting ? "Saving..." : "Save & print"}
        </Button>
      </CardContent>
    </Card>
  );
}