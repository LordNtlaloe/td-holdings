import { Button } from '@/components/ui/button';
import { usePos } from '@/contexts/CartContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import CartItem from '@/components/products/CartItem';
import PaymentDialog from './PaymentDialog';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function ShoppingCart() {
    const {
        cart,
        openPaymentDialog,
        closePaymentDialog,
        isPaymentDialogVisible,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        applyDiscount,
        removeDiscount,
        calculateTotals,
    } = usePos();

    const { subtotal, totalDiscount, total } = calculateTotals();

    const { props } = usePage<PageProps>();
    const { auth, employee } = props;

    const branchId = employee?.branch?.id ?? 0;
    const branchName = auth.user.role === 'manager' ? 'All Branches' : employee?.branch?.branch_name || 'Branch';
    const cashierId = auth.user.id;
    const cashierName = auth.user.name;

    const [discountAmount, setDiscountAmount] = useState('');

    const handleApplyDiscount = () => {
        const amount = parseFloat(discountAmount);
        if (!isNaN(amount)) {
            // Apply discount but don't let it exceed the subtotal
            const effectiveDiscount = Math.min(amount, subtotal);
            applyDiscount({
                type: 'fixed',
                value: effectiveDiscount,
            });
            setDiscountAmount('');
        }
    };

    return (
        <div className="w-full p-5 bg-white dark:bg-[#1D1D1D] rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Current Order</h2>

            <ScrollArea className="h-[calc(100vh-300px)]">
                {cart.length > 0 ? (
                    cart.map((item) => (
                        <CartItem
                            key={item.id}
                            item={item}
                            onIncrease={() => increaseQuantity(item.product.id)}
                            onDecrease={() => decreaseQuantity(item.product.id)}
                            onRemove={() => removeFromCart(item.product.id)}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-4">Your cart is empty</p>
                )}
            </ScrollArea>

            <Separator className="my-4" />

            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>M{subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                    <>
                        <div className="flex justify-between text-red-500">
                            <span>Discount:</span>
                            <span>-M{totalDiscount.toFixed(2)}</span>
                        </div>
                        <Button
                            variant="link"
                            className="text-red-500 p-0 h-auto"
                            onClick={removeDiscount}
                        >
                            Remove Discount
                        </Button>
                    </>
                )}
                <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total:</span>
                    <span>M{total.toFixed(2)}</span>
                </div>
            </div>

            {/* Fixed Amount Discount Input */}
            <div className="mt-4 space-y-2">
                <Label htmlFor="discount">Apply Discount (Fixed Amount)</Label>
                <div className="flex gap-2">
                    <Input
                        id="discount"
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="Enter discount amount"
                        className="flex-1"
                        min="0"
                        step="0.01"
                    />
                    <Button
                        variant="outline"
                        onClick={handleApplyDiscount}
                        disabled={!discountAmount || cart.length === 0}
                    >
                        Apply
                    </Button>
                </div>
                {discountAmount && parseFloat(discountAmount) > subtotal && (
                    <p className="text-sm text-red-500">
                        Discount cannot exceed subtotal. Will be capped at M{subtotal.toFixed(2)}
                    </p>
                )}
            </div>

            <Button
                className="w-full mt-4"
                onClick={openPaymentDialog}
                disabled={cart.length === 0}
            >
                Process Payment
            </Button>

            {isPaymentDialogVisible && (
                <PaymentDialog
                    open={isPaymentDialogVisible}
                    onSuccess={() => console.log("Payment Successful")}
                    onClose={closePaymentDialog}
                    branchId={branchId}
                    cashierId={cashierId}
                    branchName={branchName}
                    cashierName={cashierName}
                />
            )}
        </div>
    );
}