import type { ComponentType } from "react";
import { ModernTemplate } from "./templates/modern-template";
import { ClassicTemplate } from "./templates/classic-template";
import { MinimalTemplate } from "./templates/minimal-template";
import { CorporateTemplate } from "./templates/corporate-template";
import { ElegantTemplate } from "./templates/elegant-template";
import type { InvoiceTemplate } from "#/types/invoice-template-types";

const TEMPLATES: Record<InvoiceTemplate, ComponentType<{ invoice: any }>> = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
    corporate: CorporateTemplate,
    elegant: ElegantTemplate,
};

/** The printable paper only. Controls (print button, template picker) live on the page around it. */
export function InvoiceDocument({ invoice, template }: { invoice: any; template: InvoiceTemplate }) {
    const Template = TEMPLATES[template];
    return (
        <>
            <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
            <div className="invoice-print-area overflow-hidden rounded-xl border bg-white print:rounded-none print:border-0">
                <Template invoice={invoice} />
            </div>
        </>
    );
}