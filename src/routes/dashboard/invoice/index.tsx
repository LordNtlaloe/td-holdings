import { createFileRoute, Link } from "@tanstack/react-router";
import { useApiQuery } from '#/lib/api/hooks';
import { useEffect, useMemo, useState } from "react";
import POSLayout from "#/layouts/pos/pos-layout";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { DocTypeTabs, type DocType } from "#/components/invoice/doc-types-tab";

export const Route = createFileRoute("/dashboard/invoice/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [docType, setDocType] = useState<DocType>("quotation");
  const [storeId, setStoreId] = useState<string | null>(null);

  const { data: myStore } = useApiQuery<any>('stores.getMyStore', '/api/stores/my');
  const { data: activeStoresList } = useApiQuery<any>(
    'stores.getActiveStores',
    '/api/stores/active',
    undefined,
    myStore === null
  );
  const activeStores = useMemo(
    () => activeStoresList?.filter((s: any) => s.isActive) ?? [],
    [activeStoresList]
  );

  useEffect(() => {
    if (myStore) setStoreId(myStore._id);
  }, [myStore]);

  const { data: invoices } = useApiQuery<any>(
    'invoice.listInvoices',
    '/api/invoices/list/' + (storeId || '') + '/' + docType,
    undefined,
    !!storeId
  );

  return (
    <POSLayout>
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <DocTypeTabs value={docType} onChange={setDocType} />
            {myStore === null && (
              <Select value={storeId ?? undefined} onValueChange={setStoreId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {activeStores.map((store: any) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button asChild>
            <Link to="/dashboard/invoice/new">New document</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {invoices?.map((invoice: any) => (
                <tr key={invoice._id} className="border-t">
                  <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="p-3">{invoice.customerName ?? "Walk-in"}</td>
                  <td className="p-3">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">R{invoice.totalAmount.toFixed(2)}</td>
                  <td className="p-3">
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
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
    <Link
      to="/dashboard/invoice/$id"
      params={{
        id: invoice._id,
      }}
    >
      View
    </Link>
  </Button>
                  </td>
                </tr>
              ))}
              {invoices?.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No documents yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </POSLayout>
  );
}