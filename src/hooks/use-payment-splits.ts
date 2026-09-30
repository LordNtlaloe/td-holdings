import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PaymentMethod, PaymentSplit } from "#/types/pos";

const ALL_METHODS: PaymentMethod[] = [
    "Cash",
    "Card",
    "Mpesa",
    "Ecocash",
    "Bank Transfer",
    "Mobile Payment",
    "Credit",
    "Voucher",
];

export function usePaymentSplits() {
    const [payments, setPayments] = useState<PaymentSplit[]>([
        { method: "Cash", amount: 0, amountReceived: 0, changeDue: 0 },
    ]);
    const [isSplitPayment, setIsSplitPayment] = useState(false);

    const addPaymentSplit = () => {
        const usedMethods = payments.map((p) => p.method);
        const availableMethods = ALL_METHODS.filter((m) => !usedMethods.includes(m));

        if (availableMethods.length === 0) {
            toast.error("All payment methods are already added");
            return;
        }

        setPayments([
            ...payments,
            {
                method: availableMethods[0],
                amount: 0,
                ...(availableMethods[0] === "Cash" ? { amountReceived: 0, changeDue: 0 } : {}),
            },
        ]);
    };

    const removePaymentSplit = (index: number) => {
        if (payments.length <= 1) {
            toast.error("At least one payment method is required");
            return;
        }
        setPayments(payments.filter((_, i) => i !== index));
    };

    const updatePaymentSplit = (index: number, field: keyof PaymentSplit, value: any) => {
        const updated = [...payments];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "amountReceived" && updated[index].method === "Cash") {
            const amount = updated[index].amount || 0;
            const received = value || 0;
            updated[index].changeDue = Math.max(0, received - amount);
        }
        if (field === "amount" && updated[index].method === "Cash") {
            const amount = value || 0;
            const received = updated[index].amountReceived || 0;
            updated[index].changeDue = Math.max(0, received - amount);
        }

        setPayments(updated);
    };

    const resetPayments = () => {
        setPayments([{ method: "Cash", amount: 0, amountReceived: 0, changeDue: 0 }]);
        setIsSplitPayment(false);
    };

    const totalPaymentAmount = useMemo(
        () => payments.reduce((sum, p) => sum + p.amount, 0),
        [payments]
    );

    const totalAmountReceived = useMemo(
        () => payments.reduce((sum, p) => sum + (p.amountReceived || p.amount), 0),
        [payments]
    );

    const totalChangeDue = useMemo(
        () => payments.reduce((sum, p) => sum + (p.changeDue || 0), 0),
        [payments]
    );

    return {
        payments,
        setPayments,
        isSplitPayment,
        setIsSplitPayment,
        addPaymentSplit,
        removePaymentSplit,
        updatePaymentSplit,
        resetPayments,
        totalPaymentAmount,
        totalAmountReceived,
        totalChangeDue,
    };
}