import { Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import type { InvoiceCartItem } from "#/hooks/use-invoice-cart";
import type { DocType } from "./doc-types-tab";

interface InvoiceCartPanelProps {
  docType: DocType;
  cart: InvoiceCartItem[];
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  validUntilDays: number | null;
  onValidUntilDaysChange: (value: number | null) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, unitPrice: number) => void;
  onRemove: (index: number) => void;
  discountTotal: number;
  onDiscountChange: (value: number) => void;
  cartTotal: number;
  netTotal: number;
  onSaveAndPrint: () => void;
  isSubmitting: boolean;
}

const DOC_LABEL: Record<DocType, string> = {
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  invoice: "Invoice",
};

export function InvoiceCartPanel({
  docType,
  cart,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  notes,
  onNotesChange,
  validUntilDays,
  onValidUntilDaysChange,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  discountTotal,
  onDiscountChange,
  cartTotal,
  netTotal,
  onSaveAndPrint,
  isSubmitting,
}: InvoiceCartPanelProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{DOC_LABEL[docType]}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <div className="space-y-2">
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
          />
          <Input
            placeholder="Customer phone (optional)"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {cart.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No items added yet
            </p>
          )}
          {cart.map((item, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md border p-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sku}
                  {item.size ? ` · ${item.size}` : ""}
                  {item.color ? ` · ${item.color}` : ""}
                  {item.variant ? ` · ${item.variant}` : ""}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onUpdateQuantity(index, Number(e.target.value))}
                className="w-16"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => onUpdatePrice(index, Number(e.target.value))}
                className="w-24"
              />
              <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {docType !== "invoice" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Valid for</span>
            <Input
              type="number"
              min={1}
              className="w-20"
              value={validUntilDays ?? ""}
              onChange={(e) =>
                onValidUntilDaysChange(e.target.value ? Number(e.target.value) : null)
              }
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        )}

        <Textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </CardContent>

      <div className="space-y-2 border-t p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>R{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={discountTotal}
            onChange={(e) => onDiscountChange(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>R{netTotal.toFixed(2)}</span>
        </div>
        <Button className="w-full" disabled={cart.length === 0 || isSubmitting} onClick={onSaveAndPrint}>
          {isSubmitting ? "Saving..." : `Save & Print ${DOC_LABEL[docType]}`}
        </Button>
      </div>
    </Card>
  );
}