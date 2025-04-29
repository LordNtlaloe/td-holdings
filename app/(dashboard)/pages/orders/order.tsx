import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { BreadcrumbItem } from '@/types';
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import OrdersLayout from '@/layouts/orders/layout';


interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    product: {
        id: number;
        product_name: string;
        product_image?: string;
    };
}

interface Order {
    id: number;
    total_amount: number;
    status: string;
    order_date: string;
    items: OrderItem[];
    branch: {
        branch_name: string;
    };
    cashier: {
        name: string;
    };
    payment_method?: string;
    payment_reference?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Orders', href: '/orders' },
    { title: 'Order Details', href: '' },
];


export default function OrderShow() {
    const { order } = usePage<{ order: Order }>().props;
    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Order #${order.id}`} />
            <OrdersLayout>
                <div className="container mx-auto py-6" ref={contentRef}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Order #{order.id}</h1>
                            <p className="text-slate-300">
                                {format(new Date(order.order_date), 'MMMM dd, yyyy - hh:mm a')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant={
                                order.status === 'completed' ? 'default' :
                                    order.status === 'pending' ? 'secondary' :
                                        'destructive'
                            }>
                                {order.status}
                            </Badge>
                            <Badge variant="outline">
                                {order.items.length} items
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#2D2D2D] p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Branch Information</h3>
                            <p className="text-slate-300">{order.branch.branch_name}</p>
                        </div>

                        <div className="bg-[#2D2D2D] p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Cashier</h3>
                            <p className="text-slate-300">{order.cashier.name}</p>
                        </div>

                        <div className="bg-[#2D2D2D] p-6 rounded-lg shadow">
                            <h3 className="font-semibold text-lg mb-4">Payment</h3>
                            <p className="text-slate-300">
                                {order.payment_method || 'Not specified'}
                                {order.payment_reference && (
                                    <span className="text-slate-300 ml-2">
                                        ({order.payment_reference})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className=" rounded-lg shadow overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="font-semibold text-xl">Order Items</h2>
                        </div>

                        <div className="divide-y">
                            {order.items.map((item) => (
                                <div key={item.id} className="p-6 flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-32 h-32  rounded-lg overflow-hidden">
                                        {item.product.product_image ? (
                                            <img
                                                src={item.product.product_image}
                                                alt={item.product.product_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                No image
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">{item.product.product_name}</h3>
                                                <p className="text-slate-300">Product ID: {item.product.id}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-slate-300">Price</p>
                                                    <p className="font-medium">M{item.price.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-slate-300">Qty</p>
                                                    <p className="font-medium">{item.quantity}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {item.discount > 0 && (
                                                <div className="text-right">
                                                    <p className="text-slate-300">Discount</p>
                                                    <p className="text-red-500 font-medium">-M{item.discount.toFixed(2)}</p>
                                                </div>
                                            )}
                                            <div className="text-right">
                                                <p className="text-slate-300">Subtotal</p>
                                                <p className="font-medium">M{item.subtotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t">
                            <div className="flex justify-end">
                                <div className="w-full md:w-1/3 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-white">Subtotal:</span>
                                        <span className="font-medium">
                                            M{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white">Discounts:</span>
                                        <span className="text-red-500">
                                            -M{order.items.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t flex justify-between">
                                        <span className="font-semibold">Total:</span>
                                        <span className="font-bold text-lg">
                                            M{order.total_amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4">
                        <Link href={route('orders')}>
                            <Button variant="outline">Back to Orders</Button>
                        </Link>
                        <Button onClick={() => reactToPrintFn()}>
                            Print Receipt
                        </Button>
                    </div>
                </div>
            </OrdersLayout>
        </AppLayout>
    );
}