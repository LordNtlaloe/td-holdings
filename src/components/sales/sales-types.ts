export type SaleStatus = "completed" | "refunded" | "voided" | "cancelled";

export interface SaleItemRecord {
    productName?: string;
    departmentName?: string | null;
    quantity?: number;
    unitPrice?: number;
    size?: string;
    color?: string;
    variant?: string;
    product?: { _id?: string; name?: string; sku?: string } | null;
}

export interface SaleRecord {
    _id: string;
    totalAmount: number;
    createdAt: number;
    status: SaleStatus;
    paymentMethod?: string | null;
    store?: { _id?: string; name?: string; address?: string; phone?: string } | null;
    customer?: { _id?: string; name?: string; phone?: string; email?: string } | null;
    items?: SaleItemRecord[];
    discountTotal?: number;
    amountReceived?: number;
    changeDue?: number;
    paymentSplits?: string;
    cancelledAt?: number;
    cancelledReason?: string;
}

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
    completed: "Completed",
    refunded: "Refunded",
    voided: "Voided",
    cancelled: "Cancelled",
};

export const SALE_STATUS_BADGE: Record<SaleStatus, string> = {
    completed: "bg-[#e7f6ec] text-[#0f6b3a]",
    refunded: "bg-[#fff1e6] text-[#9a3d00]",
    voided: "bg-[#eef0f3] text-[#3d4452]",
    cancelled: "bg-[#fdecec] text-[#b3261e]",
};
