import { useMemo, useState } from "react";
import type { InventoryItem } from "#/types/pos";
import { cartKey } from "#/lib/pos/utils";

export type InvoiceLine = {
  key: string;
  productId: string;
  name: string;
  sku: string;
  size?: string;
  color?: string;
  variant?: string;
  unitPrice: number;
  quantity: number;
  /** Units in stock when the line was added (store inventory). */
  availableQuantity: number;
};

export type StockShortage = { productId: string; name: string; requested: number; available: number };

/**
 * Cart for quotations, proformas and invoices. Unlike the POS cart it does NOT cap
 * quantity at stock: a document can be written for more than is on the shelf, and the
 * shortage is flagged instead (and blocks converting to a sale later).
 */
export function useInvoiceCart() {
  const [cart, setCart] = useState<InvoiceLine[]>([]);
  const [discount, setDiscount] = useState(0);

  const addToCart = (
    item: InventoryItem,
    unitPrice: number,
    opts: { size?: string; color?: string; variant?: string } = {}
  ) => {
    if (!item.product) return;
    const product = item.product;
    const key = cartKey(item.productId, opts.size, opts.color, opts.variant);
    setCart((prev) => {
      if (prev.some((l) => l.key === key)) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          ...opts,
          unitPrice,
          quantity: 1,
          availableQuantity: item.quantity,
        },
      ];
    });
  };

  const removeFromCart = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const updateQuantity = (key: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return removeFromCart(key);
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  };

  const updatePrice = (key: string, unitPrice: number) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, unitPrice: Math.max(0, unitPrice) } : l)));

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const cartQuantityForProduct = (productId: string) =>
    cart.filter((l) => l.productId === productId).reduce((sum, l) => sum + l.quantity, 0);

  const cartTotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const discountTotal = Math.min(Math.max(discount, 0), cartTotal);
  const netTotal = cartTotal - discountTotal;

  // Lines of the same product (different sizes/colours) share one stock pool.
  const shortages = useMemo<StockShortage[]>(() => {
    const byProduct = new Map<string, StockShortage>();
    for (const l of cart) {
      const existing = byProduct.get(l.productId);
      if (existing) existing.requested += l.quantity;
      else byProduct.set(l.productId, { productId: l.productId, name: l.name, requested: l.quantity, available: l.availableQuantity });
    }
    return [...byProduct.values()].filter((s) => s.requested > s.available);
  }, [cart]);

  return {
    cart,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    cartQuantityForProduct,
    cartTotal,
    discount,
    setDiscount,
    discountTotal,
    netTotal,
    shortages,
  };
}