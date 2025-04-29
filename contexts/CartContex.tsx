import { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '@/lib/types';
import { toast } from 'sonner';

type DiscountType = {
    type: 'percentage' | 'fixed';
    value: number;
} | null;

type PosContextType = {
    cart: CartItem[];
    discount: DiscountType;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    increaseQuantity: (productId: number) => void;
    decreaseQuantity: (productId: number) => void;
    clearCart: () => void;
    openPaymentDialog: () => void;
    closePaymentDialog: () => void;
    isPaymentDialogVisible: boolean;
    applyDiscount: (discount: DiscountType) => void;
    removeDiscount: () => void;
    calculateTotals: () => {
        subtotal: number;
        totalDiscount: number;
        total: number;
    };
};

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState<DiscountType>(null);
    const [isPaymentDialogVisible, setIsPaymentDialogVisible] = useState(false);

    const addToCart = (product: Product) => {
        if (product.product_quantity <= 0) {
            toast.error("Out of Stock", {
                description: `${product.product_name} is currently out of stock.`,
            });
            return;
        }

        setCart(prev => {
            const existingItem = prev.find(item => item.product.id === product.id);

            if (existingItem) {
                if (existingItem.quantity + 1 > product.product_quantity) {
                    toast.error("Insufficient Stock", {
                        description: `Only ${product.product_quantity} units available.`,
                    });
                    return prev;
                }
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [...prev, { id: Date.now(), product, quantity: 1, discount: 0 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const increaseQuantity = (productId: number) => {
        setCart(prev => {
            const item = prev.find(item => item.product.id === productId);
            if (!item) return prev;

            if (item.quantity + 1 > item.product.product_quantity) {
                toast.error("Insufficient Stock", {
                    description: `Only ${item.product.product_quantity} units available.`,
                });
                return prev;
            }

            return prev.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        });
    };

    const decreaseQuantity = (productId: number) => {
        setCart(prev =>
            prev.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(null);
    };

    const openPaymentDialog = () => setIsPaymentDialogVisible(true);
    const closePaymentDialog = () => setIsPaymentDialogVisible(false);

    const applyDiscount = (newDiscount: DiscountType) => {
        setDiscount(newDiscount);
        if (newDiscount) {
            toast.success("Discount Applied", {
                description: `Discount of ${newDiscount.value}${newDiscount.type === 'percentage' ? '%' : ''} has been applied.`,
            });
        }
    };

    const removeDiscount = () => {
        setDiscount(null);
        toast.info("Discount Removed");
    };

    const calculateTotals = () => {
        const subtotal = cart.reduce(
            (sum, item) => sum + item.product.product_price * item.quantity,
            0
        );

        let totalDiscount = 0;

        if (discount) {
            if (discount.type === 'percentage') {
                totalDiscount = subtotal * (Math.min(discount.value, 100) / 100);
            } else {
                totalDiscount = Math.min(discount.value, subtotal);
            }
        }

        const total = subtotal - totalDiscount;

        return { subtotal, totalDiscount, total };
    };

    return (
        <PosContext.Provider
            value={{
                cart,
                discount,
                addToCart,
                removeFromCart,
                increaseQuantity,
                decreaseQuantity,
                clearCart,
                openPaymentDialog,
                closePaymentDialog,
                isPaymentDialogVisible,
                applyDiscount,
                removeDiscount,
                calculateTotals,
            }}
        >
            {children}
        </PosContext.Provider>
    );
}

export function usePos() {
    const context = useContext(PosContext);
    if (!context) {
        throw new Error('usePos must be used within a PosProvider');
    }
    return context;
}
