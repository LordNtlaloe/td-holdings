// components/invoice/invoice-template-types.ts
export type InvoiceTemplate = 
  | "modern"
  | "classic"
  | "minimal"
  | "corporate"
  | "elegant";

export const TEMPLATE_LABELS: Record<InvoiceTemplate, string> = {
  modern: "Modern",
  classic: "Classic",
  minimal: "Minimal",
  corporate: "Corporate",
  elegant: "Elegant",
};

export const TEMPLATE_DESCRIPTIONS: Record<InvoiceTemplate, string> = {
  modern: "Clean with accent colors and modern layout",
  classic: "Traditional invoice with bordered sections",
  minimal: "Simple and clean with minimal styling",
  corporate: "Professional with company branding focus",
  elegant: "Sophisticated with decorative elements",
};