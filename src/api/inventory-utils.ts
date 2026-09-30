/**
 * Single source of truth for "is this inventory row low on stock?".
 *
 * This used to live in two places with two different rules — the dashboard
 * required a *truthy* `reorderLevel` (so `0`/unset were skipped) while
 * `/api/inventory/low-stock` defaulted it to `0` (so an unset level made
 * `0 <= 0` true). The same product could therefore be reported as low stock on
 * the dashboard and as "everything is fine" on the Inventory page.
 *
 * A row is low when a reorder level is configured and stock is at or below it,
 * or whenever the product is completely out of stock.
 */
export function isLowStock(quantity: number, reorderLevel?: number | null): boolean {
  if (quantity <= 0) return true;
  return reorderLevel != null && reorderLevel > 0 && quantity <= reorderLevel;
}
