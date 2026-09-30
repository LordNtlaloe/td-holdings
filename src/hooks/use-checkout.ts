import { useState } from "react";
import { toast } from "sonner";
import type { CartLine, CompletedSale, PaymentSplit } from "#/types/pos";
import { buildReceiptDiscounts, formatCurrency } from "#/lib/pos/utils";

type StoreLike = { _id: string; name: string; phone?: string | null; address?: string | null } | null | undefined;
type UserLike = { name?: string | null; email?: string | null } | null | undefined;

/**
 * Pull an id out of a create/find response.
 *
 * These endpoints answer with a single-key wrapper (`{ sale: {...} }`,
 * `{ customer: {...} }`) and the API client only unwraps *array*-valued
 * wrappers, so the promise resolves to the wrapper object rather than the id.
 * The checkout previously assumed the response *was* the id, so it passed the
 * literal string "[object Object]" as a sale id and printing from the POS
 * failed with "Sale not found".
 */
function readId(response: any, entity: "sale" | "customer"): string {
    if (typeof response === "string") return response;

    const wrapped = response?.[entity];
    const id = response?.id ?? response?._id ?? wrapped?.id ?? wrapped?._id;

    if (!id) {
        throw new Error(`The ${entity} was saved but the server did not return its id`);
    }

    return String(id);
}

type UseCheckoutArgs = {
    storeId: string | null;
    cart: CartLine[];
    netTotal: number;
    cartItemCount: number;
    customerName: string;
    payments: PaymentSplit[];
    totalAmountReceived: number;
    totalChangeDue: number;
    myStore: StoreLike;
    activeStores: { _id: string; name: string; phone?: string | null; address?: string | null }[];
    currentUser: UserLike;
    storePrintSettings: { printAgentId?: string | null } | null | undefined;
    createSale: (args: any) => Promise<any>;
    findOrCreateCustomer: (args: any) => Promise<any>;
    recordPurchase: (args: any) => Promise<any>;
    printReceipt: (args: any) => Promise<any>;
    clearCart: () => void;
    resetPayments: () => void;
};

export function useCheckout({
    storeId,
    cart,
    netTotal,
    cartItemCount,
    customerName,
    payments,
    totalAmountReceived,
    totalChangeDue,
    myStore,
    activeStores,
    currentUser,
    storePrintSettings,
    createSale,
    findOrCreateCustomer,
    recordPurchase,
    printReceipt,
    clearCart,
    resetPayments,
}: UseCheckoutArgs) {
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
    const [receiptPrinted, setReceiptPrinted] = useState(false);

    const isPrinterConfigured = !!storePrintSettings?.printAgentId;

    const handleCheckout = async () => {
        if (!storeId) {
            toast.error("Select a store first");
            return;
        }
        if (cart.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(totalPayment - netTotal) > 0.01) {
            toast.error(
                `Payment total (${formatCurrency(totalPayment)}) does not match sale total (${formatCurrency(netTotal)})`
            );
            return;
        }

        for (const payment of payments) {
            if (payment.method === "Cash") {
                if (!payment.amountReceived || payment.amountReceived < payment.amount) {
                    toast.error(
                        `Cash payment of ${formatCurrency(payment.amount)} requires amount received >= ${formatCurrency(payment.amount)}`
                    );
                    return;
                }
            }
            if (payment.amount <= 0) {
                toast.error("Each payment amount must be greater than zero");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            let resolvedCustomerId: string | undefined;
            let resolvedCustomerName: string | null = null;

            if (customerName.trim()) {
                resolvedCustomerId = readId(
                    await findOrCreateCustomer({ name: customerName.trim() }),
                    "customer"
                );
                resolvedCustomerName = customerName.trim();
            }

            const createdSale = await createSale({
                storeId: storeId as any,
                customerId: resolvedCustomerId ? (resolvedCustomerId as any) : undefined,
                payments: payments.map((p) => ({
                    method: p.method,
                    amount: p.amount,
                    amountReceived: p.method === "Cash" ? p.amountReceived : undefined,
                    changeDue: p.method === "Cash" ? p.changeDue : undefined,
                })),
                items: cart.map((line) => ({
                    productId: line.productId as any,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    size: line.size,
                    color: line.color,
                    variant: line.variant,
                    departmentName: line.departmentName,
                    manualDiscount: line.manualDiscount || 0,
                })),
            });
            const saleId = readId(createdSale, "sale");

            if (resolvedCustomerId) {
                await recordPurchase({ customerId: resolvedCustomerId as any, amount: netTotal });
            }

            let receiptDiscounts: ReturnType<typeof buildReceiptDiscounts> = [];
            try {
                receiptDiscounts = buildReceiptDiscounts(cart);
            } catch {
                // receiptDiscounts stays empty — non-fatal
            }

            const cashierName = currentUser?.name || currentUser?.email || "Unknown";
            const currentStore = myStore ?? activeStores.find((s) => s._id === storeId);

            const paymentLabel =
                payments.length === 1
                    ? payments[0].method
                    : payments.map((p) => p.method).join(" + ");

            setCompletedSale({
                saleId,
                storeName: currentStore?.name ?? "Store",
                storePhone: currentStore?.phone ?? null,
                storeAddress: currentStore?.address ?? null,
                customerName: resolvedCustomerName,
                cashierName,
                paymentMethod: paymentLabel,
                payments,
                items: cart,
                discounts: receiptDiscounts,
                total: netTotal,
                itemCount: cartItemCount,
                completedAt: Date.now(),
                amountReceived: totalAmountReceived,
                changeDue: totalChangeDue,
            });

            setReceiptPrinted(false);
            toast.success(`Sale completed — ${cartItemCount} item(s), ${formatCurrency(netTotal)}`);
            clearCart();
            resetPayments();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to complete sale");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = async () => {
        if (!completedSale) return;

        const agentId = storePrintSettings?.printAgentId;

        if (!agentId) {
            toast.error(
                "No printer configured for this store. Please set up a printer in store settings.",
                {
                    action: {
                        label: "Go to Settings",
                        onClick: () => {
                            window.location.href = "/dashboard/stores/settings";
                        },
                    },
                }
            );
            return;
        }

        try {
            const receiptItems = completedSale.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                sku: item.sku,
                size: item.size,
                color: item.color,
                variant: item.variant,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                availableQuantity: item.availableQuantity,
                departmentId: item.departmentId,
                departmentName: item.departmentName,
            }));

            const result = await printReceipt({
                saleId: completedSale.saleId,
                storeName: completedSale.storeName,
                storePhone: completedSale.storePhone || undefined,
                storeAddress: completedSale.storeAddress || undefined,
                customerName: completedSale.customerName || undefined,
                cashierName: completedSale.cashierName || undefined,
                paymentMethod: completedSale.paymentMethod,
                amountReceived: completedSale.amountReceived,
                changeDue: completedSale.changeDue,
                items: receiptItems,
                discounts: completedSale.discounts,
                total: completedSale.total,
                itemCount: completedSale.itemCount,
                completedAt: completedSale.completedAt,
                agentId,
            });

            if (result.success && result.sent !== false) {
                setReceiptPrinted(true);
                toast.success("Receipt printed successfully!");
            } else {
                toast.error(`Failed to print receipt: ${result.error || "Unknown error"}`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to print receipt");
        }
    };

    const closeCheckoutDialog = () => {
        setCheckoutOpen(false);
        setCompletedSale(null);
        setReceiptPrinted(false);
        resetPayments();
    };

    return {
        checkoutOpen,
        setCheckoutOpen,
        isSubmitting,
        completedSale,
        receiptPrinted,
        isPrinterConfigured,
        handleCheckout,
        handlePrint,
        closeCheckoutDialog,
    };
}