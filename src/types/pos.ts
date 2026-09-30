export type SizePricing = {
    size: string;
    costPrice: number;
    sellingPrice: number;
};

export type Product = {
    _id: string;
    name: string;
    sku: string;
    sellingPrice: number;
    sizes?: string[];
    colors?: string[];
    variants?: string[];
    sizePricing?: SizePricing[];
    isActive: boolean;
    departmentId: string;
};

export type InventoryItem = {
    inventoryId: string;
    productId: string;
    product: Product | null;
    quantity: number;
    /** Per-size stock for products whose price varies by size. */
    sizes?: Array<{ size: string; quantity: number }>;
    reorderLevel?: number;
};

export type CartLine = {
    productId: string;
    name: string;
    sku: string;
    size?: string;
    color?: string;
    variant?: string;
    unitPrice: number;
    quantity: number;
    availableQuantity: number;
    departmentId: string;
    departmentName: string;
    manualDiscount?: number;
};

export type PaymentMethod =
    | "Cash"
    | "Card"
    | "Mpesa"
    | "Ecocash"
    | "Bank Transfer"
    | "Mobile Payment"
    | "Credit"
    | "Voucher";

export type PaymentSplit = {
    method: PaymentMethod;
    amount: number;
    amountReceived?: number;
    changeDue?: number;
};

export type SaleDiscount = {
    productId: string;
    discountAmount: number;
    reason?: string;
};

export type CompletedSale = {
    saleId: string;
    storeName: string;
    storePhone: string | null;
    storeAddress: string | null;
    customerName: string | null;
    cashierName: string | null;
    paymentMethod: string;
    payments: PaymentSplit[];
    items: CartLine[];
    discounts: SaleDiscount[];
    total: number;
    itemCount: number;
    completedAt: number;
    amountReceived?: number;
    changeDue?: number;
};