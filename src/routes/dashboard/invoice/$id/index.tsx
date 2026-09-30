import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useApiQuery, useApiMutation } from '#/lib/api/hooks';

import POSLayout from "#/layouts/pos/pos-layout";
import { Button } from "#/components/ui/button";
import { InvoicePrintView } from "#/components/invoice/invoice-print-view";

import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/invoice/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useApiQuery<any>('invoice.getInvoice', '/api/invoices/' + id);

  const markAsPaid = useApiMutation('invoice.markAsPaid', 'PATCH', '/api/invoices/' + id + '/pay', ['invoice.getInvoice', 'invoice.listInvoices']);
  const cancelInvoice = useApiMutation('invoice.cancelInvoice', 'PATCH', '/api/invoices/' + id + '/cancel', ['invoice.getInvoice', 'invoice.listInvoices']);
  const convertDocType = useApiMutation('invoice.convertDocType', 'POST', '/api/invoices/' + id + '/convert', ['invoice.getInvoice', 'invoice.listInvoices']);
  const convertToSale = useApiMutation('invoice.convertToSale', 'POST', '/api/invoices/' + id + '/convert-to-sale', ['invoice.getInvoice', 'invoice.listInvoices']);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Action failed"
      );
    }
  };

  if (isLoading) {
    return (
      <POSLayout>
        <div className="p-6 text-sm text-muted-foreground">
          Loading...
        </div>
      </POSLayout>
    );
  }

  if (invoice === null) {
    return (
      <POSLayout>
        <div className="p-6 text-sm text-muted-foreground">
          Document not found
        </div>
      </POSLayout>
    );
  }

  return (
    <POSLayout>
      <div className="flex flex-wrap items-center justify-end gap-2 p-6 pb-0 print:hidden">
        <Button variant="outline" asChild>
          <Link to="/dashboard/invoice">
            Back to list
          </Link>
        </Button>

        {invoice.status === "unpaid" &&
          invoice.docType === "quotation" && (
            <Button
              variant="outline"
              onClick={() =>
                runAction(async () => {
                  const newId = await convertDocType({
                    invoiceId: invoice._id,
                    toDocType: "proforma",
                  });

                  navigate({
                    to: "/dashboard/invoice/$id",
                    params: {
                      id: newId,
                    },
                  });
                })
              }
            >
              Convert to proforma
            </Button>
          )}

        {invoice.status === "unpaid" &&
          invoice.docType === "proforma" && (
            <Button
              variant="outline"
              onClick={() =>
                runAction(async () => {
                  const newId = await convertDocType({
                    invoiceId: invoice._id,
                    toDocType: "invoice",
                  });

                  navigate({
                    to: "/dashboard/invoice/$id",
                    params: {
                      id: newId,
                    },
                  });
                })
              }
            >
              Convert to invoice
            </Button>
          )}

        {invoice.status === "unpaid" &&
          invoice.docType !== "quotation" && (
            <Button
              variant="outline"
              onClick={() =>
                runAction(() =>
                  markAsPaid({
                    invoiceId: invoice._id,
                  })
                )
              }
            >
              Mark as paid
            </Button>
          )}

        {invoice.docType === "invoice" &&
          invoice.status === "paid" &&
          !invoice.convertedToSaleId && (
            <Button
              onClick={() =>
                runAction(() =>
                  convertToSale({
                    invoiceId: invoice._id,
                  })
                )
              }
            >
              Convert to sale
            </Button>
          )}

        {invoice.status === "unpaid" && (
          <Button
            variant="destructive"
            onClick={() =>
              runAction(() =>
                cancelInvoice({
                  invoiceId: invoice._id,
                })
              )
            }
          >
            Cancel
          </Button>
        )}
      </div>

      <InvoicePrintView invoice={invoice} />
    </POSLayout>
  );
}