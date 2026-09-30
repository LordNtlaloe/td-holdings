import { useMemo, useState } from "react";
import type { Id } from "#/types/entities";

export type InvoiceCartItem = {
  productId: Id<"products">;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
  variant?: string;
};

type ProductLike = {
  _id: Id<"products">;
  name: string;
  sku: string;
};

export function useInvoiceCart() {
  const [cart, setCart] = useState<InvoiceCartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState(0);

  const addToCart = (
    product: ProductLike,
    unitPrice: number,
    opts: { size?: string; color?: string; variant?: string } = {}
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product._id &&
          item.size === opts.size &&
          item.color === opts.color &&
          item.variant === opts.variant
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          unitPrice,
          quantity: 1,
          ...opts,
        },
      ];
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, quantity } : item)));
  };

  const updatePrice = (index: number, unitPrice: number) => {
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, unitPrice } : item)));
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountTotal(0);
  };

  const cartQuantityForProduct = (productId: Id<"products">) =>
    cart.filter((item) => item.productId === productId).reduce((sum, i) => sum + i.quantity, 0);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );
  const netTotal = useMemo(() => cartTotal - discountTotal, [cartTotal, discountTotal]);
  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return {
    cart,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    cartQuantityForProduct,
    cartTotal,
    discountTotal,
    setDiscountTotal,
    netTotal,
    cartItemCount,
  };
}