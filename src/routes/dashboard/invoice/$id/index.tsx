import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useApiMutation, useApiQuery } from "#/lib/api/hooks";
import POSLayout from "#/layouts/pos/pos-layout";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { InvoiceLifecycle } from "#/components/invoice/invoice-lifecycle";
import { InvoiceStockCheck, getShortages } from "#/components/invoice/invoice-stock-check";
import { InvoiceDocument } from "#/components/invoice/invoice-document";
import { useInvoiceTemplate } from "#/hooks/use-invoice-template";
import { TEMPLATE_LABELS, type InvoiceTemplate } from "#/types/invoice-template-types";

export const Route = createFileRoute("/dashboard/invoice/$id/")({
  component: RouteComponent,
});

type PendingAction = "proforma" | "invoice" | "pay" | "sale" | "cancel";

// The lifecycle step each action moves the document to (cancel moves nowhere).
const TARGET_STEP: Record<PendingAction, number | null> = { proforma: 1, invoice: 2, pay: 3, sale: 4, cancel: null };

function ActionButton({
  active,
  busy,
  loadingLabel,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { active: boolean; busy: boolean; loadingLabel: string }) {
  return (
    <Button {...props} disabled={disabled || busy} aria-busy={active}>
      {active && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {active ? loadingLabel : children}
    </Button>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-busy="true" aria-label="Loading document">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-140 rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { selectedTemplate, setSelectedTemplate } = useInvoiceTemplate();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const { data: invoice, isLoading } = useApiQuery<any>("invoice.getInvoice", "/api/invoices/" + id);

  const invalidate = ["invoice.getInvoice", "invoice.listInvoices"];
  const markAsPaid = useApiMutation("invoice.markAsPaid", "PATCH", "/api/invoices/" + id + "/pay", invalidate);
  const cancelInvoice = useApiMutation("invoice.cancelInvoice", "PATCH", "/api/invoices/" + id + "/cancel", invalidate);
  const convertDocType = useApiMutation("invoice.convertDocType", "POST", "/api/invoices/" + id + "/convert", invalidate);
  const convertToSale = useApiMutation("invoice.convertToSale", "POST", "/api/invoices/" + id + "/convert-to-sale", invalidate);

  // One action at a time: every action button is disabled while one is running, and the
  // spinner stays until the request (and any navigation to the new document) has finished.
  const runAction = async (name: PendingAction, action: () => Promise<unknown>) => {
    if (pending) return;
    setPending(name);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setPending(null);
    }
  };

  if (isLoading) {
    return (
      <POSLayout>
        <DetailSkeleton />
      </POSLayout>
    );
  }

  if (!invoice || !invoice.status) {
    return (
      <POSLayout>
        <div className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Document not found</p>
          <Button variant="outline" asChild>
            <Link to="/dashboard/invoice">Back to list</Link>
          </Button>
        </div>
      </POSLayout>
    );
  }

  const unpaid = invoice.status === "unpaid";
  const hasShortage = getShortages(invoice).length > 0;
  const busy = pending !== null;
  const convertTo = (toDocType: "proforma" | "invoice") =>
    runAction(toDocType, async () => {
      const newId = await convertDocType({ invoiceId: invoice._id, toDocType });
      await navigate({ to: "/dashboard/invoice/$id", params: { id: newId as string } });
    });

  return (
    <POSLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "cancelled" ? "destructive" : "secondary"}>
              {invoice.status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard/invoice">Back to list</Link>
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {unpaid && invoice.docType === "quotation" && (
              <ActionButton variant="outline" active={pending === "proforma"} busy={busy} loadingLabel="Converting..." onClick={() => convertTo("proforma")}>
                Convert to proforma
              </ActionButton>
            )}
            {unpaid && invoice.docType === "proforma" && (
              <ActionButton variant="outline" active={pending === "invoice"} busy={busy} loadingLabel="Converting..." onClick={() => convertTo("invoice")}>
                Convert to invoice
              </ActionButton>
            )}
            {unpaid && invoice.docType !== "quotation" && (
              <ActionButton
                variant="outline"
                active={pending === "pay"}
                busy={busy}
                loadingLabel="Marking as paid..."
                onClick={() => runAction("pay", () => markAsPaid({ invoiceId: invoice._id }))}
              >
                Mark as paid
              </ActionButton>
            )}
            {invoice.docType === "invoice" && invoice.status === "paid" && !invoice.convertedToSaleId && (
              <ActionButton
                active={pending === "sale"}
                busy={busy}
                loadingLabel="Converting to sale..."
                disabled={hasShortage}
                title={hasShortage ? "Not enough stock for one or more items" : undefined}
                onClick={() =>
                  runAction("sale", async () => {
                    await convertToSale({ invoiceId: invoice._id });
                    toast.success("Converted to a sale and stock updated");
                  })
                }
              >
                Convert to sale
              </ActionButton>
            )}
            {unpaid && (
              <ActionButton
                variant="outline"
                className="border-destructive/40 text-destructive hover:text-destructive"
                active={pending === "cancel"}
                busy={busy}
                loadingLabel="Cancelling..."
                onClick={() => runAction("cancel", () => cancelInvoice({ invoiceId: invoice._id }))}
              >
                Cancel
              </ActionButton>
            )}
          </div>
        </div>

        <div className="print:hidden">
          <InvoiceLifecycle invoice={invoice} pendingStep={pending ? TARGET_STEP[pending] : null} />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
          <InvoiceDocument invoice={invoice} template={selectedTemplate} />

          <aside className="space-y-6 print:hidden">
            <InvoiceStockCheck invoice={invoice} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {invoice.convertedFrom && (
                  <p>
                    Created from{" "}
                    <Link to="/dashboard/invoice/$id" params={{ id: invoice.convertedFrom.id }} className="font-medium underline">
                      {invoice.convertedFrom.invoiceNumber}
                    </Link>
                  </p>
                )}
                <p className="text-muted-foreground">
                  Created{invoice.createdByName ? ` by ${invoice.createdByName}` : ""} · {format(new Date(invoice.createdAt), "d MMM yyyy")}
                </p>
                {invoice.paidAt && (
                  <p className="text-muted-foreground">Paid · {format(new Date(invoice.paidAt), "d MMM yyyy")}</p>
                )}
                {invoice.convertedToSaleId && <p className="text-muted-foreground">Converted to a sale</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as InvoiceTemplate)}>
                  <SelectTrigger aria-label="Template">
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
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </POSLayout>
  );
}