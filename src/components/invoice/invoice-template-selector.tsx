// components/invoice/invoice-template-selector.tsx
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { cn } from "#/lib/utils";
import { type InvoiceTemplate, TEMPLATE_LABELS, TEMPLATE_DESCRIPTIONS } from "#/types/invoice-template-types";

interface InvoiceTemplateSelectorProps {
  selected: InvoiceTemplate;
  onSelect: (template: InvoiceTemplate) => void;
  trigger?: React.ReactNode;
}

const TEMPLATE_PREVIEWS: Record<InvoiceTemplate, string> = {
  modern: "bg-gradient-to-r from-blue-500 to-purple-500",
  classic: "bg-gradient-to-r from-gray-700 to-gray-900",
  minimal: "bg-gradient-to-r from-slate-400 to-slate-600",
  corporate: "bg-gradient-to-r from-indigo-600 to-blue-600",
  elegant: "bg-gradient-to-r from-rose-400 to-pink-600",
};

export function InvoiceTemplateSelector({
  selected,
  onSelect,
  trigger,
}: InvoiceTemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const templates: InvoiceTemplate[] = ["modern", "classic", "minimal", "corporate", "elegant"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <span>Template: {TEMPLATE_LABELS[selected]}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose Invoice Template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {templates.map((template) => (
            <button
              key={template}
              onClick={() => {
                onSelect(template);
                setOpen(false);
              }}
              className={cn(
                "group relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-lg",
                selected === template
                  ? "border-primary ring-2 ring-primary ring-offset-2"
                  : "border-transparent hover:border-muted"
              )}
            >
              <div className="space-y-3">
                <div
                  className={cn(
                    "h-20 rounded-md",
                    TEMPLATE_PREVIEWS[template]
                  )}
                />
                <div>
                  <p className="font-medium">{TEMPLATE_LABELS[template]}</p>
                  <p className="text-xs text-muted-foreground">
                    {TEMPLATE_DESCRIPTIONS[template]}
                  </p>
                </div>
              </div>
              {selected === template && (
                <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}