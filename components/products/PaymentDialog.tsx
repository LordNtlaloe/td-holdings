import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { usePos } from '@/contexts/CartContext';
import { MdPrint } from 'react-icons/md';
import { useState, useRef } from 'react';
import { useReactToPrint } from "react-to-print";
import { Receipt } from '@/lib/types';

interface PaymentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (receiptData: Receipt) => void;
    branchId: number;
    cashierId: number;
    branchName: string;
    branchLocation: string;
    cashierName: string;
}

interface CartItem {
    id: number;
    product: {
        id: number;
        product_name: string;
        product_price: number;
        product_quantity: number;
    };
    quantity: number;
    discount?: number;
}

interface OrderItem {
    product_id: number;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    product: {
        product_name: string;
    };
}

interface Order {
    id: number;
    total_amount: number;
    order_date: string;
    items: OrderItem[];
    branch: {
        name: string;
        location: string;
    };
    cashier: {
        name: string;
    };
}

export default function PaymentDialog({
    open,
    onClose,
    onSuccess,
    branchId,
    cashierId,
    branchName,
    branchLocation,
    cashierName
}: PaymentDialogProps) {
    const { cart, calculateTotals, clearCart } = usePos();
    const { subtotal, totalDiscount, total } = calculateTotals();
    const [error, setError] = useState('');
    const [orderData, setOrderData] = useState<Order | null>(null);

    const receiptRef = useRef<HTMLDivElement>(null);
    const paymentDialogRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        // pageContent: () => receiptRef.current,
        pageStyle: `
            @page { size: 80mm 100mm; margin: 0; }
            @media print { 
                body { -webkit-print-color-adjust: exact; padding: 10px; }
                * { margin: 0; padding: 0; }
            }
        `,
        onAfterPrint: () => {
            setOrderData(null);
        },
        documentTitle: `Order_${orderData?.id || 'Receipt'}`,
        // removeAfterPrint: true
    });

    const { post, processing, errors } = useForm({
        items: cart.map((item: CartItem) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.product_price,
            discount: item.discount || 0,
        })),
        total: total,
        branch_id: branchId,
        cashier_id: cashierId,
    });

    const handleConfirmAndPrint = () => {
        setError('');

        post(route('orders.process-payment'), {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.order) {
                    const order = page.props.order as Order;
                    const receipt = page.props.receipt as Receipt;
                    setOrderData(order);
                    clearCart();
                    onClose();
                    if (onSuccess) onSuccess(receipt);
                    
                    // Small delay to ensure the receipt component is rendered before printing
                    setTimeout(handlePrint, 100);
                }
            },
            onError: (errors) => {
                console.error('Order processing errors:', errors);
                setError(
                    errors.error ||
                    'Failed to process order. Please check all fields and try again.'
                );
            }
        });
    };

    return (
        <>
            {/* Payment Dialog */}
            <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${open ? '' : 'hidden'}`}>
                <div className="w-80 bg-[#1D1D1D] rounded px-6 pt-8 shadow-lg" ref={paymentDialogRef}>
                    <img src="./images/TD-Logo.png" alt="logo" className="mx-auto w-16 py-4" />
                    <div className="flex flex-col justify-center items-center gap-2">
                        <h4 className="font-semibold">{branchName}</h4>
                        <p className="text-xs">{branchLocation}</p>
                    </div>
                    <div className="flex flex-col gap-3 border-b py-6 text-xs">
                        <p className="flex justify-between">
                            <span className="text-gray-400">Cashier:</span>
                            <span>{cashierName}</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span>{new Date().toLocaleString()}</span>
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 pb-6 pt-2 text-xs">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="flex">
                                    <th className="w-full py-2">Product</th>
                                    <th className="min-w-[44px] py-2">QTY</th>
                                    <th className="min-w-[44px] py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item) => (
                                    <tr key={item.id} className="flex py-1">
                                        <td className="flex-1">{item.product.product_name}</td>
                                        <td className="min-w-[44px]">{item.quantity}</td>
                                        <td className="min-w-[44px]">M{(item.product.product_price * item.quantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border-b border border-dashed"></div>
                        <div className="flex flex-col gap-1 pt-4 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>M{subtotal.toFixed(2)}</span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Discount:</span>
                                    <span>-M{totalDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span>M{total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="pt-4">
                            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                            {Object.keys(errors).length > 0 && (
                                <div className="text-red-500 text-sm mb-2">
                                    {Object.values(errors).map((err, index) => (
                                        <p key={index}>{err}</p>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmAndPrint}
                                    disabled={processing}
                                    className="flex items-center gap-2"
                                >
                                    {processing ? 'Processing...' : (<><MdPrint /> Confirm & Print</>)}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Receipt for Printing */}
            {orderData && (
                <div className="hidden">
                    <div ref={receiptRef} className="p-4 bg-white text-black w-[80mm]">
                        <img src="./images/TD-Logo.png" alt="logo" className="mx-auto w-16 py-4" />
                        <div className="flex flex-col justify-center items-center gap-2">
                            <h4 className="font-semibold">{orderData.branch.name}</h4>
                            <p className="text-xs text-center">{orderData.branch.location}</p>
                        </div>
                        <div className="flex flex-col gap-3 border-b py-6 text-xs">
                            <p className="flex justify-between">
                                <span className="text-gray-400">Cashier:</span>
                                <span>{orderData.cashier.name}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-400">Date:</span>
                                <span>{new Date(orderData.order_date).toLocaleString()}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-400">Order #:</span>
                                <span>{orderData.id}</span>
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pb-6 pt-2 text-xs">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="flex">
                                        <th className="w-full py-2">Product</th>
                                        <th className="min-w-[44px] py-2">QTY</th>
                                        <th className="min-w-[44px] py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderData.items.map((item) => (
                                        <tr key={item.product_id} className="flex py-1">
                                            <td className="flex-1">{item.product.product_name}</td>
                                            <td className="min-w-[44px]">{item.quantity}</td>
                                            <td className="min-w-[44px]">M{(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-b border border-dashed"></div>
                            <div className="flex flex-col gap-1 pt-4 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>M{orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                {orderData.items.some(item => item.discount > 0) && (
                                    <div className="flex justify-between text-red-500">
                                        <span>Discount:</span>
                                        <span>-M{orderData.items.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold">
                                    <span>Total:</span>
                                    <span>M{orderData.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="pt-8 text-center text-xs">
                                <p>Thank you for your purchase!</p>
                                <p className="mt-2">Please come again</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}