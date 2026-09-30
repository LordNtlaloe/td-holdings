// hooks/use-invoice-template.ts
import { useState, useEffect } from "react";
import { type InvoiceTemplate } from "#/types/invoice-template-types";

const STORAGE_KEY = "invoice-template-preference";

export function useInvoiceTemplate() {
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as InvoiceTemplate) || "modern";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedTemplate);
  }, [selectedTemplate]);

  return { selectedTemplate, setSelectedTemplate };
}