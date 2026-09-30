import { Receipt, ShoppingCart, User } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { CustomerInput } from "#/components/pos/customer-selector";
import { CartLineItem } from "#/components/pos/cart-line-item";
import type { CartLine } from "#/types/pos";
import { formatCurrency } from "#/lib/pos/utils";

type CartPanelProps = {
    cart: CartLine[];
    storeId: string | null;
    customerName: string;
    onCustomerNameChange: (value: string) => void;
    onClearCart: () => void;
    onUpdateQuantity: (key: string, quantity: number) => void;
    onUpdatePrice: (key: string, unitPrice: number) => void;
    onUpdateDiscount: (key: string, discount: number) => void;
    onRemove: (key: string) => void;
    cartItemCount: number;
    cartTotal: number;
    discountTotal: number;
    netTotal: number;
    onCheckout: () => void;
};

export function CartPanel({
    cart,
    storeId,
    customerName,
    onCustomerNameChange,
    onClearCart,
    onUpdateQuantity,
    onUpdatePrice,
    onUpdateDiscount,
    onRemove,
    cartItemCount,
    cartTotal,
    discountTotal,
    netTotal,
    onCheckout,
}: CartPanelProps) {
    return (
        <div className="flex h-fit flex-col gap-4 rounded-lg border p-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                </h2>
                {cart.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={onClearCart}>
                        Clear
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm">
                    <User className="h-3 w-3" />
                    Customer (Optional)
                </Label>
                <CustomerInput value={customerName} onChange={onCustomerNameChange} disabled={!storeId} />
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                {cart.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Cart is empty — click a product to add it
                    </p>
                )}

                {cart.map((line) => (
                    <CartLineItem
                        key={`${line.productId}::${line.size ?? ""}::${line.color ?? ""}::${line.variant ?? ""}`}
                        line={line}
                        onUpdateQuantity={onUpdateQuantity}
                        onUpdatePrice={onUpdatePrice}
                        onUpdateDiscount={onUpdateDiscount}
                        onRemove={onRemove}
                    />
                ))}
            </div>

            <div className="space-y-1 border-t pt-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Items</span>
                    <span>{cartItemCount}</span>
                </div>
                {discountTotal > 0 && (
                    <>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-green-600">
                            <span>Discounts</span>
                            <span>−{formatCurrency(discountTotal)}</span>
                        </div>
                    </>
                )}
                <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(netTotal)}</span>
                </div>
            </div>

            <Button size="lg" className="w-full" disabled={cart.length === 0 || !storeId} onClick={onCheckout}>
                <Receipt className="mr-2 h-4 w-4" />
                Checkout
            </Button>
        </div>
    );
}