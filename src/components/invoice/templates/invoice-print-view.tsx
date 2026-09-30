// components/invoice/invoice-print-view.tsx
import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import type { InvoiceTemplate } from "#/types/invoice-template-types";
import { InvoiceTemplateSelector } from "../invoice-template-selector";
import { ClassicTemplate } from "./classic-template";
import { CorporateTemplate } from "./corporate-template";
import { ElegantTemplate } from "./elegant-template";
import { MinimalTemplate } from "./minimal-template";
import { ModernTemplate } from "./modern-template";


export interface InvoicePrintViewProps {
  invoice: any;
}

const TEMPLATE_COMPONENTS: Record<InvoiceTemplate, React.ComponentType<InvoicePrintViewProps>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  corporate: CorporateTemplate,
  elegant: ElegantTemplate,
};

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>("modern");

  const TemplateComponent = TEMPLATE_COMPONENTS[selectedTemplate];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .invoice-print-area .print-actions { display: none !important; }
        }
      `}</style>

      <div className="print-actions mb-4 flex items-center justify-between">
        <Badge
          variant={
            invoice.status === "paid"
              ? "default"
              : invoice.status === "cancelled"
              ? "destructive"
              : "secondary"
          }
        >
          {invoice.status}
        </Badge>
        <div className="flex items-center gap-2">
          <InvoiceTemplateSelector
            selected={selectedTemplate}
            onSelect={setSelectedTemplate}
          />
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="invoice-print-area rounded-md border bg-white print:border-0 print:p-0">
        <TemplateComponent invoice={invoice} />
      </div>
    </div>
  );
}