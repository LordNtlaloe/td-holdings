import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApiMutation, useApiQuery } from "#/lib/api/hooks";
import POSLayout from "#/layouts/pos/pos-layout";
import { useInvoiceCart } from "#/hooks/use-invoice-cart";
import { useInvoiceTemplate } from "#/hooks/use-invoice-template";
import { DocTypeTabs, type DocType } from "#/components/invoice/doc-types-tab";
import { InvoiceProductPicker } from "#/components/invoice/invoice-product-picker";
import { InvoiceCartPanel } from "#/components/invoice/invoice-cart-panel";
import { VariantPickerDialog } from "#/components/pos/variant-picker-dialog";
import type { InventoryItem } from "#/types/pos";
import { needsVariantPicker, resolvePrice } from "#/lib/pos/utils";

export const Route = createFileRoute("/dashboard/invoice/new/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { selectedTemplate, setSelectedTemplate } = useInvoiceTemplate();

  const [docType, setDocType] = useState<DocType>("quotation");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntilDays, setValidUntilDays] = useState<number | null>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerItem, setPickerItem] = useState<InventoryItem | null>(null);
  const [pickerSize, setPickerSize] = useState<string | null>(null);
  const [pickerColor, setPickerColor] = useState<string | null>(null);
  const [pickerVariant, setPickerVariant] = useState<string | null>(null);

  const { data: myStore } = useApiQuery<any>("stores.getMyStore", "/api/stores/my");
  const { data: activeStoresList } = useApiQuery<any>("stores.getActiveStores", "/api/stores/active", undefined, myStore === null);
  const { data: departments } = useApiQuery<any>("departments.getAllDepartments", "/api/departments");
  const { data: inventory } = useApiQuery<InventoryItem[]>(
    "inventory.getInventoryByStore",
    "/api/inventory/store/" + (storeId || ""),
    undefined,
    !!storeId
  );
  const { data: nextNumber } = useApiQuery<string>("invoice.nextNumber", "/api/invoices/next-number/" + docType);

  const createInvoice = useApiMutation("invoice.createInvoice", "POST", "/api/invoices", [
    "invoice.listInvoices",
    "invoice.nextNumber",
  ]);

  const activeStores = useMemo(() => activeStoresList?.filter((s: any) => s.isActive) ?? [], [activeStoresList]);

  useEffect(() => {
    if (myStore) setStoreId(myStore._id);
  }, [myStore]);

  const {
    cart, addToCart, updateQuantity, updatePrice, removeFromCart, clearCart,
    cartQuantityForProduct, discount, setDiscount, discountTotal, netTotal, shortages,
  } = useInvoiceCart();

  // Same products as the POS (store inventory with live stock). Out-of-stock items stay
  // visible so a quotation can still be written for them.
  const items = useMemo(() => {
    if (!inventory) return [];
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      if (!item.product) return false;
      if (departmentId && item.product.departmentId !== departmentId) return false;
      if (q && !item.product.name.toLowerCase().includes(q) && !item.product.sku.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inventory, departmentId, search]);

  const handleStoreChange = (id: string) => {
    if (id !== storeId) clearCart(); // stock is per store
    setStoreId(id);
  };

  const closePicker = () => {
    setPickerItem(null);
    setPickerSize(null);
    setPickerColor(null);
    setPickerVariant(null);
  };

  const handleProductClick = (item: InventoryItem) => {
    if (!item.product) return;
    if (needsVariantPicker(item.product)) {
      setPickerItem(item);
      setPickerSize(item.product.sizes?.[0] ?? null);
      setPickerColor(item.product.colors?.[0] ?? null);
      setPickerVariant(item.product.variants?.[0] ?? null);
    } else {
      addToCart(item, item.product.sellingPrice);
    }
  };

  const confirmPickerSelection = () => {
    if (!pickerItem?.product) return;
    const product = pickerItem.product;
    if (product.sizes?.length && !pickerSize) return void toast.error("Select a size");
    if (product.colors?.length && !pickerColor) return void toast.error("Select a color");
    if (product.variants?.length && !pickerVariant) return void toast.error("Select a variant");
    addToCart(pickerItem, resolvePrice(product, pickerSize ?? undefined), {
      size: pickerSize ?? undefined,
      color: pickerColor ?? undefined,
      variant: pickerVariant ?? undefined,
    });
    closePicker();
  };

  const handleSaveAndPrint = async () => {
    if (!storeId) return void toast.error("Select a store first");
    if (cart.length === 0) return void toast.error("Add at least one item");
    setIsSubmitting(true);
    try {
      const validUntil =
        docType !== "invoice" && validUntilDays ? Date.now() + validUntilDays * 24 * 60 * 60 * 1000 : undefined;

      const id = await createInvoice({
        storeId: storeId as any,
        docType,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        validUntil,
        discountTotal: discountTotal || undefined,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          size: l.size,
          color: l.color,
          variant: l.variant,
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
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <DocTypeTabs value={docType} onChange={setDocType} />
          <InvoiceProductPicker
            myStore={myStore}
            activeStores={activeStores}
            storeId={storeId}
            onStoreChange={handleStoreChange}
            search={search}
            onSearchChange={setSearch}
            departmentId={departmentId}
            onDepartmentChange={setDepartmentId}
            departments={departments}
            inventory={inventory}
            items={items}
            cartQuantityForProduct={cartQuantityForProduct}
            onProductClick={handleProductClick}
          />
        </div>

        <InvoiceCartPanel
          docType={docType}
          nextNumber={typeof nextNumber === "string" ? nextNumber : undefined}
          cart={cart}
          shortages={shortages}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          notes={notes}
          onNotesChange={setNotes}
          validUntilDays={validUntilDays}
          onValidUntilDaysChange={setValidUntilDays}
          discount={discount}
          onDiscountChange={setDiscount}
          template={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          onUpdateQuantity={updateQuantity}
          onUpdatePrice={updatePrice}
          onRemove={removeFromCart}
          netTotal={netTotal}
          onSaveAndPrint={handleSaveAndPrint}
          isSubmitting={isSubmitting}
        />
      </div>

      <VariantPickerDialog
        pickerItem={pickerItem}
        pickerSize={pickerSize}
        pickerColor={pickerColor}
        pickerVariant={pickerVariant}
        onSizeChange={setPickerSize}
        onColorChange={setPickerColor}
        onVariantChange={setPickerVariant}
        onClose={closePicker}
        onConfirm={confirmPickerSelection}
      />
    </POSLayout>
  );
}