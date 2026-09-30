import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApiQuery, useApiMutation } from '#/lib/api/hooks';
import { useEffect, useMemo, useState } from "react";
import POSLayout from "#/layouts/pos/pos-layout";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";

import { useInvoiceCart } from "#/hooks/use-invoice-cart";
import { toast } from "sonner";
import { DocTypeTabs, type DocType } from "#/components/invoice/doc-types-tab";
import { InvoiceCartPanel } from "#/components/invoice/invoice-cart-panel";

export const Route = createFileRoute("/dashboard/invoice/new/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState<DocType>("quotation");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntilDays, setValidUntilDays] = useState<number | null>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // getMyStore returns null for super_admin/admin (they aren't tied to one
  // store), so only fetch the full store list in that case — same pattern
  // as the POS page.
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

  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments');
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const { data: products } = useApiQuery<any>('products.getActiveProducts', '/api/products/active');
  const createInvoice = useApiMutation('invoice.createInvoice', 'POST', '/api/invoices', ['invoice.listInvoices']);

  const {
    cart,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    cartTotal,
    discountTotal,
    setDiscountTotal,
    netTotal,
  } = useInvoiceCart();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (departmentId && p.departmentId !== departmentId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, search, departmentId]);

  const handleSaveAndPrint = async () => {
    if (!storeId) {
      toast.error("Select a store first");
      return;
    }
    setIsSubmitting(true);
    try {
      const validUntil =
        docType !== "invoice" && validUntilDays
          ? Date.now() + validUntilDays * 24 * 60 * 60 * 1000
          : undefined;

      const id = await createInvoice({
        storeId: storeId as any,
        docType,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        validUntil,
        discountTotal: discountTotal || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
          variant: item.variant,
        })),
      });

      navigate({ to: "/dashboard/invoice/$id", params: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <POSLayout>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
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
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search products by name or SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={departmentId ?? "all"}
              onValueChange={(v) => setDepartmentId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments?.map((department: any) => (
                  <SelectItem key={department._id} value={department._id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredProducts.map((product: any) => (
              <button
                key={product._id}
                onClick={() => addToCart(product, product.sellingPrice)}
                className="rounded-md border p-3 text-left transition-colors hover:border-primary"
              >
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku}</p>
                <p className="mt-1 text-sm font-semibold">R{product.sellingPrice.toFixed(2)}</p>
              </button>
            ))}
            {products && filteredProducts.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No products match your search
              </p>
            )}
          </div>
        </div>

        <InvoiceCartPanel
          docType={docType}
          cart={cart}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          notes={notes}
          onNotesChange={setNotes}
          validUntilDays={validUntilDays}
          onValidUntilDaysChange={setValidUntilDays}
          onUpdateQuantity={updateQuantity}
          onUpdatePrice={updatePrice}
          onRemove={removeFromCart}
          discountTotal={discountTotal}
          onDiscountChange={setDiscountTotal}
          cartTotal={cartTotal}
          netTotal={netTotal}
          onSaveAndPrint={handleSaveAndPrint}
          isSubmitting={isSubmitting}
        />
      </div>
    </POSLayout>
  );
}