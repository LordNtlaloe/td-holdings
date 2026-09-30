import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { CartLine, InventoryItem } from "#/types/pos";
import { cartKey, computeFrontendDiscounts } from "#/lib/pos/utils";

export function usePosCart(departments: { _id: string; name: string }[] | undefined) {
  const [cart, setCart] = useState<CartLine[]>([]);

  const cartQuantityForProduct = (productId: string) =>
    cart
      .filter((line) => line.productId === productId)
      .reduce((sum, line) => sum + line.quantity, 0);

  const addToCart = (
    item: InventoryItem,
    unitPrice: number,
    selection: { size?: string; color?: string; variant?: string }
  ) => {
    if (!item.product) return;
    const product = item.product;
    const key = cartKey(item.productId, selection.size, selection.color, selection.variant);
    const alreadyInCart = cartQuantityForProduct(item.productId);

    if (alreadyInCart >= item.quantity) {
      toast.error(`Only ${item.quantity} of "${product.name}" available`);
      return;
    }

    const department = departments?.find((d) => d._id === product.departmentId);
    const departmentName = department?.name || "General";

    setCart((prev) => {
      const existing = prev.find(
        (line) => cartKey(line.productId, line.size, line.color, line.variant) === key
      );
      if (existing) {
        return prev.map((line) =>
          cartKey(line.productId, line.size, line.color, line.variant) === key
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          size: selection.size,
          color: selection.color,
          variant: selection.variant,
          unitPrice,
          quantity: 1,
          availableQuantity: item.quantity,
          departmentId: product.departmentId,
          departmentName,
          manualDiscount: 0,
        },
      ];
    });
  };

  const updateCartQuantity = (key: string, quantity: number) => {
    setCart((prev) =>
      prev.map((line) => {
        if (cartKey(line.productId, line.size, line.color, line.variant) !== key)
          return line;
        const otherLinesQty = prev
          .filter(
            (l) =>
              l.productId === line.productId &&
              cartKey(l.productId, l.size, l.color, l.variant) !== key
          )
          .reduce((sum, l) => sum + l.quantity, 0);
        const maxForThisLine = line.availableQuantity - otherLinesQty;
        if (quantity > maxForThisLine) {
          toast.error(`Only ${maxForThisLine} of "${line.name}" available`);
          return { ...line, quantity: Math.max(1, maxForThisLine) };
        }
        return { ...line, quantity: Math.max(1, quantity) };
      })
    );
  };

  const updateCartPrice = (key: string, unitPrice: number) => {
    setCart((prev) =>
      prev.map((line) =>
        cartKey(line.productId, line.size, line.color, line.variant) === key
          ? { ...line, unitPrice: Math.max(0, unitPrice) }
          : line
      )
    );
  };

  const updateCartDiscount = (key: string, discount: number) => {
    setCart((prev) =>
      prev.map((line) =>
        cartKey(line.productId, line.size, line.color, line.variant) === key
          ? { ...line, manualDiscount: Math.max(0, discount) }
          : line
      )
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) =>
      prev.filter(
        (line) => cartKey(line.productId, line.size, line.color, line.variant) !== key
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart]
  );

  const discountTotal = useMemo(() => computeFrontendDiscounts(cart), [cart]);

  const netTotal = useMemo(
    () => Math.max(0, cartTotal - discountTotal),
    [cartTotal, discountTotal]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  return {
    cart,
    setCart,
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
  };
}