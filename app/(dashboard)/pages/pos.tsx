import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import POSLayout from '@/layouts/pos/pos-layout';
import { type BreadcrumbItem } from '@/types';
import ProductList from '@/components/products/ProductList';
import PaymentDialog from '@/components/products/PaymentDialog';
import { Receipt, PageProps } from '@/lib/types';
import { PosProvider, usePos } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { MdReceipt } from 'react-icons/md';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS',
        href: '/pos',
    },
];

export default function POS() {
    const { props } = usePage<PageProps>();

    return (
        <PosProvider>
            <POSContent {...props} />
        </PosProvider>
    );
}

function POSContent(props: PageProps) {
    const { filtered_products: products = [], auth, employee } = props;
    const { 
        cart,
        clearCart, 
        openPaymentDialog, 
        closePaymentDialog, 
        isPaymentDialogVisible,
        calculateTotals
    } = usePos();

    const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const { total } = calculateTotals();

    const branchName = auth.user.role === 'manager'
        ? 'All Branches'
        : employee?.branch?.branch_name || 'Branch';

    const branchLocation = auth.user.role === 'manager'
        ? 'All Branches'
        : employee?.branch?.branch_location || 'Branch';

    const handleProcessPaymentSuccess = (receiptData: Receipt) => {
        setCurrentReceipt(receiptData);
        setShowReceipt(true);
        clearCart();
    };

    const handleOpenPayment = () => {
        if (cart.length === 0) {
            alert('Please add items to cart before checkout');
            return;
        }
        openPaymentDialog();
    };

    return (
        <POSLayout breadcrumbs={breadcrumbs}>
            <Head>
                <title>POS</title>
            </Head>
            <div className="container mx-auto px-5">
                <div className="flex lg:flex-row flex-col-reverse gap-4">
                    <ProductList
                        products={products || []}
                        branchName={branchName}
                        user={auth.user}
                    />
                    
                    <div className="lg:sticky lg:top-4 lg:h-fit">
                        <Button 
                            className="w-full mb-4"
                            onClick={handleOpenPayment}
                            disabled={total <= 0}
                        >
                            Checkout (M{total.toFixed(2)})
                        </Button>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && currentReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Order Receipt</h2>
                            <MdReceipt className="text-2xl" />
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            <p><span className="font-medium">Order #:</span> {currentReceipt.id}</p>
                            <p><span className="font-medium">Date:</span> {new Date(currentReceipt.date).toLocaleString()}</p>
                            <p><span className="font-medium">Cashier:</span> {currentReceipt.cashier}</p>
                            <p><span className="font-medium">Branch:</span> {currentReceipt.branch}</p>
                        </div>

                        <div className="border-t border-b py-4 my-4">
                            <h3 className="font-medium mb-2">Items:</h3>
                            {currentReceipt.items.map(item => (
                                <div key={item.id} className="flex justify-between py-1">
                                    <span>{item.product.product_name} × {item.quantity}</span>
                                    <span>M{(item.product.product_price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Subtotal:</span>
                                <span>M{currentReceipt.items.reduce((sum, item) => sum + (item.product.product_price * item.quantity), 0).toFixed(2)}</span>
                            </div>
                            {currentReceipt.items.some(item => item.discount > 0) && (
                                <div className="flex justify-between text-red-500">
                                    <span className="font-medium">Discount:</span>
                                    <span>-M{currentReceipt.items.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total:</span>
                                <span>M{currentReceipt.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <Button 
                            className="w-full mt-6"
                            onClick={() => setShowReceipt(false)}
                        >
                            Close Receipt
                        </Button>
                    </div>
                </div>
            )}

            <PaymentDialog
                open={isPaymentDialogVisible}
                onClose={closePaymentDialog}
                onSuccess={handleProcessPaymentSuccess}
                branchId={employee?.branch?.id ?? 0}
                cashierId={auth.user.id}
                branchName={branchName}
                branchLocation={branchLocation}
                cashierName={auth.user.name}
            />
        </POSLayout>
    );
}