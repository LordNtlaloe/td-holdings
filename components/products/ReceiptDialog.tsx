import React from 'react';
import { FaPhone, FaEnvelope, FaPrint } from 'react-icons/fa';
import { MdReceipt, MdPerson, MdRestaurant, MdAccessTime } from 'react-icons/md';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';

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
    branch_name?: string;
    cashier_name?: string;
    customer_name?: string;
    order_type?: string;
}

interface ReceiptProps {
    order: Order;
    branchName: string;
    cashierName: string;
    onPrintComplete?: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ order, branchName, cashierName, onPrintComplete }) => {
    const receiptRef = React.useRef<HTMLDivElement>(null);

    // Fix: Using correct type for useReactToPrint
    const handlePrint = useReactToPrint({
        // Fix: Changed 'content' to 'contentRef' which returns a reference
        contentRef: () => receiptRef.current,
        onAfterPrint: onPrintComplete,
        pageStyle: `
            @page {
                size: 80mm 200mm;
                margin: 5mm;
            }
            @media print {
                body {
                    width: 80mm;
                }
                .no-print {
                    display: none;
                }
            }
        `,
        documentTitle: `Receipt_${order.id}`
    });

    const formattedDate = new Date(order.order_date).toLocaleString();

    return (
        <div className="flex flex-col items-center p-4">
            <div
                ref={receiptRef}
                className="w-80 rounded bg-gray-50 px-6 pt-8 shadow-lg print:shadow-none print:border print:border-gray-200"
            >
                {/* Logo and Business Info */}
                <div className="flex flex-col justify-center items-center gap-2">
                    <h4 className="font-semibold text-lg">Your Restaurant Name</h4>
                    <p className="text-xs">{branchName}</p>
                </div>

                {/* Order Details */}
                <div className="flex flex-col gap-3 border-b py-6 text-xs">
                    <p className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                            <MdReceipt />
                            Receipt No.:
                        </span>
                        <span>#{order.id}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                            <MdRestaurant />
                            Order Type:
                        </span>
                        <span>{order.order_type || 'Dine-in'}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                            <MdPerson />
                            Cashier:
                        </span>
                        <span>{cashierName}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                            <MdPerson />
                            Customer:
                        </span>
                        <span>{order.customer_name || 'Walk-in'}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                            <MdAccessTime />
                            Date:
                        </span>
                        <span>{formattedDate}</span>
                    </p>
                </div>

                {/* Items Table */}
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
                            {order.items.map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr className="flex">
                                        <td className="flex-1 py-1">{item.product.product_name}</td>
                                        <td className="min-w-[44px]">{item.quantity}</td>
                                        <td className="min-w-[44px]">M{(item.price * item.quantity).toFixed(2)}</td>
                                    </tr>
                                    {item.discount > 0 && (
                                        <tr className="flex py-1">
                                            <td className="flex-1 text-red-500 pl-4">Discount</td>
                                            <td className="min-w-[44px]"></td>
                                            <td className="min-w-[44px] text-red-500">-M{item.discount.toFixed(2)}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    <div className="border-b border border-dashed"></div>
                    <div className="flex justify-between py-2 font-semibold">
                        <span>Total:</span>
                        <span>M{order.total_amount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="py-4 justify-center items-center flex flex-col gap-2 text-xs pb-6">
                    <p className="flex gap-2 items-center">
                        <FaEnvelope /> info@example.com
                    </p>
                    <p className="flex gap-2 items-center">
                        <FaPhone /> +266 1234 5678
                    </p>
                    <p className="text-center text-gray-500 mt-2">
                        Thank you for your purchase!
                    </p>
                </div>
            </div>

            {/* Print Button - hidden when printing */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    handlePrint();
                }}
                className="no-print mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center gap-2"
            >
                <FaPrint /> Print Receipt
            </button>
        </div>
    );
};

export function generateReceiptPdf({ order, branchName, cashierName }: ReceiptProps) {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297] // A4 height for longer receipts
    });

    // Set initial position
    let yPos = 10;

    // Add header
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Your Restaurant Name', 40, yPos, { align: 'center' });
    yPos += 5;

    pdf.setFontSize(10);
    pdf.text(branchName, 40, yPos, { align: 'center' });
    yPos += 10;

    // Add order details
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Receipt No.:', 5, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`#${order.id}`, 30, yPos);
    yPos += 5;

    pdf.setTextColor(100, 100, 100);
    pdf.text('Order Type:', 5, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(order.order_type || 'Dine-in', 30, yPos);
    yPos += 5;

    pdf.setTextColor(100, 100, 100);
    pdf.text('Cashier:', 5, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(cashierName, 30, yPos);
    yPos += 5;

    pdf.setTextColor(100, 100, 100);
    pdf.text('Customer:', 5, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(order.customer_name || 'Walk-in', 30, yPos);
    yPos += 5;

    pdf.setTextColor(100, 100, 100);
    pdf.text('Date:', 5, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(new Date(order.order_date).toLocaleString(), 30, yPos);
    yPos += 10;

    // Add items table header
    pdf.setDrawColor(0, 0, 0);
    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    pdf.setFontSize(8);
    pdf.text('Product', 5, yPos);
    pdf.text('Qty', 50, yPos);
    pdf.text('Total', 75, yPos, { align: 'right' });
    yPos += 3;

    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    // Add items
    order.items.forEach((item) => {
        pdf.text(`${item.product.product_name}`, 5, yPos);
        pdf.text(`${item.quantity}`, 50, yPos);
        pdf.text(`M${(item.price * item.quantity).toFixed(2)}`, 75, yPos, { align: 'right' });
        yPos += 5;

        if (item.discount > 0) {
            pdf.setTextColor(255, 0, 0);
            pdf.text(`Discount`, 5, yPos);
            pdf.text(`-M${item.discount.toFixed(2)}`, 75, yPos, { align: 'right' });
            pdf.setTextColor(0, 0, 0);
            yPos += 5;
        }
    });

    yPos += 5;
    pdf.line(5, yPos, 75, yPos);
    yPos += 5;

    // Add totals
    pdf.setFontSize(10);
    pdf.text('Total:', 5, yPos);
    pdf.text(`M${order.total_amount.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 10;

    // Add footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('info@example.com', 40, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('+266 1234 5678', 40, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('Thank you for your purchase!', 40, yPos, { align: 'center' });

    return pdf;
}

export function saveReceiptPdf(props: ReceiptProps) {
    const pdf = generateReceiptPdf(props);
    pdf.save(`receipt-${props.order.id}.pdf`);
}