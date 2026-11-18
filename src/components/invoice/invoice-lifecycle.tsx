import { Badge } from "#/components/ui/badge";
import { Card, CardContent } from "#/components/ui/card";
import { cn } from "#/lib/utils";

const STEPS = [
    { label: "Quotation", hint: "quote" },
    { label: "Proforma", hint: "confirm" },
    { label: "Invoice", hint: "next" },
    { label: "Paid", hint: "payment" },
    { label: "Sale", hint: "stock deducted" },
] as const;

function currentStep(invoice: any): number {
    if (invoice.convertedToSaleId) return 4;
    if (invoice.docType === "quotation") return 0;
    if (invoice.docType === "proforma") return 1;
    return invoice.status === "paid" ? 3 : 2;
}

export function InvoiceLifecycle({ invoice, pendingStep = null }: { invoice: any; pendingStep?: number | null }) {
    const current = currentStep(invoice);
    const cancelled = invoice.status === "cancelled";

    const sublabel = (index: number) => {
        if (index === pendingStep) return "updating...";
        if (index === current) return `${invoice.invoiceNumber} · current`;
        if (index < current) {
            const source = invoice.convertedFrom;
            return index === current - 1 && source?.invoiceNumber ? `${source.invoiceNumber} · done` : "done";
        }
        return STEPS[index].hint;
    };

    return (
        <Card>
            <CardContent className="space-y-3 p-5">
                <ol className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {STEPS.map((step, index) => {
                        const reached = !cancelled && index <= current;
                        return (
                            <li key={step.label} className="space-y-1.5">
                                <div
                                    className={cn(
                                        "h-1.5 rounded-full transition-colors",
                                        index === pendingStep ? "animate-pulse bg-primary/50" : reached ? "bg-primary" : "bg-muted"
                                    )}
                                />
                                <p className={cn("text-sm", !cancelled && index === current ? "font-bold text-primary" : "font-medium")}>
                                    {step.label}
                                </p>
                                <p className="text-xs text-muted-foreground">{sublabel(index)}</p>
                            </li>
                        );
                    })}
                </ol>
                {cancelled && <Badge variant="destructive">Cancelled</Badge>}
            </CardContent>
        </Card>
    );
}