import { createFileRoute } from "@tanstack/react-router";
import { useApiQuery, useApiMutation, usePrintReceipt } from '#/lib/api/hooks';
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent } from "#/components/ui/dialog";
import POSLayout from "#/layouts/pos/pos-layout";

import { usePosCart } from "#/hooks/use-pos";
import { usePaymentSplits } from "#/hooks/use-payment-splits";
import { useCheckout } from "#/hooks/use-checkout"

import { ProductBrowser } from "#/components/pos/product-browser";
import { CartPanel } from "#/components/pos/cart-panel";
import { VariantPickerDialog } from "#/components/pos/variant-picker-dialog";
import { CheckoutDialog } from "#/components/pos/checkout-dialog";
import { ReceiptDialog } from "#/components/pos/receipt-dialog";

import type { InventoryItem } from "#/types/pos";
import { needsVariantPicker, resolvePrice } from "#/lib/pos/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pos/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const [pickerItem, setPickerItem] = useState<InventoryItem | null>(null);
  const [pickerSize, setPickerSize] = useState<string | null>(null);
  const [pickerColor, setPickerColor] = useState<string | null>(null);
  const [pickerVariant, setPickerVariant] = useState<string | null>(null);

  const { data: myStore } = useApiQuery<any>('stores.getMyStore', '/api/stores/my');
  const { data: activeStoresList } = useApiQuery<any>(
    'stores.getActiveStores',
    '/api/stores/active',
    undefined,
    myStore === null
  );
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments');
  const { data: currentUser } = useApiQuery<any>('users.getCurrentUser', '/api/users/current');
  const { data: inventory } = useApiQuery<InventoryItem[]>(
    'inventory.getInventoryByStore',
    '/api/inventory/store/' + (storeId || ''),
    undefined,
    !!storeId
  );

  const { data: storePrintSettings } = useApiQuery<any>(
    'stores.getStorePrintSettings',
    '/api/stores/' + (storeId || '') + '/print-settings',
    undefined,
    !!storeId
  );

  const createSale = useApiMutation('sales.createSale', 'POST', '/api/sales', ['sales.allCompletedSales']);
  const findOrCreateCustomer = useApiMutation('customers.findOrCreateByName', 'POST', '/api/customers/find-or-create', ['customers.getAllCustomers']);
  const recordPurchase = useApiMutation('customers.recordPurchase', 'PATCH', '/api/customers/record-purchase', ['customers.getAllCustomers']);
  const printReceipt = usePrintReceipt();

  const activeStores = useMemo(
    () => activeStoresList?.filter((s: any) => s.isActive) ?? [],
    [activeStoresList]
  );

  useEffect(() => {
    if (myStore) setStoreId(myStore._id);
  }, [myStore]);

  const filteredProducts = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((item) => {
      if (item.quantity <= 0) return false;
      if (!item.product) return false;
      if (departmentId && item.product.departmentId !== departmentId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = item.product.name.toLowerCase().includes(q);
        const matchesSku = item.product.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }, [inventory, departmentId, search]);

  const cartApi = usePosCart(departments);
  const {
    cart,
    addToCart,
    updateCartQuantity,
    updateCartPrice,
    updateCartDiscount,
    removeFromCart,
    clearCart,
    cartQuantityForProduct,
    cartTotal,
    discountTotal,
    netTotal,
    cartItemCount,
  } = cartApi;

  const paymentsApi = usePaymentSplits();
  const {
    payments,
    setPayments,
    isSplitPayment,
    setIsSplitPayment,
    addPaymentSplit,
    removePaymentSplit,
    updatePaymentSplit,
    resetPayments,
    totalPaymentAmount,
    totalAmountReceived,
    totalChangeDue,
  } = paymentsApi;

  const clearCartAndCustomer = () => {
    clearCart();
    setCustomerName("");
  };

  const checkoutApi = useCheckout({
    storeId,
    cart,
    netTotal,
    cartItemCount,
    customerName,
    payments,
    totalAmountReceived,
    totalChangeDue,
    myStore,
    activeStores,
    currentUser,
    storePrintSettings,
    createSale,
    findOrCreateCustomer,
    recordPurchase,
    printReceipt,
    clearCart: clearCartAndCustomer,
    resetPayments,
  });
  const {
    checkoutOpen,
    setCheckoutOpen,
    isSubmitting,
    completedSale,
    receiptPrinted,
    isPrinterConfigured,
    handleCheckout,
    handlePrint,
    closeCheckoutDialog,
  } = checkoutApi;

  const handleProductClick = (item: InventoryItem) => {
    if (!item.product) return;
    const alreadyInCart = cartQuantityForProduct(item.productId);
    if (alreadyInCart >= item.quantity) {
      toast.error(`Only ${item.quantity} of "${item.product.name}" available`);
      return;
    }
    if (needsVariantPicker(item.product)) {
      setPickerItem(item);
      setPickerSize(item.product.sizes?.[0] ?? null);
      setPickerColor(item.product.colors?.[0] ?? null);
      setPickerVariant(item.product.variants?.[0] ?? null);
    } else {
      addToCart(item, item.product.sellingPrice, {});
    }
  };

  const closePicker = () => {
    setPickerItem(null);
    setPickerSize(null);
    setPickerColor(null);
    setPickerVariant(null);
  };

  const confirmPickerSelection = () => {
    if (!pickerItem?.product) return;
    const product = pickerItem.product;
    if (product.sizes?.length && !pickerSize) {
      toast.error("Select a size");
      return;
    }
    if (product.colors?.length && !pickerColor) {
      toast.error("Select a color");
      return;
    }
    if (product.variants?.length && !pickerVariant) {
      toast.error("Select a variant");
      return;
    }
    const unitPrice = resolvePrice(product, pickerSize ?? undefined);
    addToCart(pickerItem, unitPrice, {
      size: pickerSize ?? undefined,
      color: pickerColor ?? undefined,
      variant: pickerVariant ?? undefined,
    });
    closePicker();
  };

  const handleCheckoutDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (completedSale && !receiptPrinted) {
        if (
          confirm(
            "You haven't printed the receipt. Are you sure you want to close without printing?"
          )
        ) {
          closeCheckoutDialog();
        }
        return;
      }
      closeCheckoutDialog();
    } else {
      if (payments.length === 1) {
        const singlePayment = payments[0];
        setPayments([
          {
            ...singlePayment,
            amount: netTotal,
            ...(singlePayment.method === "Cash"
              ? { amountReceived: netTotal, changeDue: 0 }
              : {}),
          },
        ]);
      } else {
        const perPayment = netTotal / payments.length;
        setPayments(
          payments.map((p, i) => ({
            ...p,
            amount:
              i === payments.length - 1
                ? netTotal - perPayment * (payments.length - 1)
                : perPayment,
            ...(p.method === "Cash" ? { amountReceived: p.amountReceived || 0, changeDue: 0 } : {}),
          }))
        );
      }
      setCheckoutOpen(true);
    }
  };

  const handleSelectSinglePayment = () => {
    setIsSplitPayment(false);
    setPayments([
      { method: "Cash", amount: netTotal, amountReceived: netTotal, changeDue: 0 },
    ]);
  };

  const handleSelectSplitPayment = () => {
    setIsSplitPayment(true);
    const perPayment = netTotal / 2;
    setPayments([
      { method: "Cash", amount: perPayment, amountReceived: perPayment, changeDue: 0 },
      { method: "Mpesa", amount: perPayment },
    ]);
  };

  return (
    <POSLayout>
      <div className="grid grid-cols-1 gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-[1fr_380px]">
        <ProductBrowser
          myStore={myStore}
          activeStores={activeStores}
          storeId={storeId}
          onStoreChange={(value) => {
            setStoreId(value);
            clearCart();
          }}
          isPrinterConfigured={isPrinterConfigured}
          search={search}
          onSearchChange={setSearch}
          departmentId={departmentId}
          onDepartmentChange={setDepartmentId}
          departments={departments}
          inventory={inventory}
          filteredProducts={filteredProducts}
          cartQuantityForProduct={cartQuantityForProduct}
          onProductClick={handleProductClick}
        />

        <CartPanel
          cart={cart}
          storeId={storeId}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          onClearCart={clearCartAndCustomer}
          onUpdateQuantity={updateCartQuantity}
          onUpdatePrice={updateCartPrice}
          onUpdateDiscount={updateCartDiscount}
          onRemove={removeFromCart}
          cartItemCount={cartItemCount}
          cartTotal={cartTotal}
          discountTotal={discountTotal}
          netTotal={netTotal}
          onCheckout={() => handleCheckoutDialogOpenChange(true)}
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

      <Dialog open={checkoutOpen} onOpenChange={handleCheckoutDialogOpenChange}>
        <DialogContent className="max-w-2xl">
          {!completedSale ? (
            <CheckoutDialog
              cartItemCount={cartItemCount}
              cartTotal={cartTotal}
              discountTotal={discountTotal}
              netTotal={netTotal}
              customerName={customerName}
              isSplitPayment={isSplitPayment}
              onSelectSinglePayment={handleSelectSinglePayment}
              onSelectSplitPayment={handleSelectSplitPayment}
              payments={payments}
              onPaymentChange={updatePaymentSplit}
              onRemovePayment={removePaymentSplit}
              onAddPayment={addPaymentSplit}
              totalPaymentAmount={totalPaymentAmount}
              isSubmitting={isSubmitting}
              onCancel={() => setCheckoutOpen(false)}
              onConfirm={handleCheckout}
            />
          ) : (
            <ReceiptDialog
              completedSale={completedSale}
              receiptPrinted={receiptPrinted}
              onClose={closeCheckoutDialog}
              onPrint={handlePrint}
            />
          )}
        </DialogContent>
      </Dialog>
    </POSLayout>
  );
}