import type { Id } from "./entities"

export type SaleStatus = 'completed' | 'refunded' | 'voided' | 'cancelled'

export interface Sale {
    _id: Id<'sales'>
    _creationTime: number
    createdAt: number
    storeId: Id<'stores'>
    customerId?: Id<'customers'>
    store?: {
        _id: Id<'stores'>
        name: string
    }
    customer?: {
        _id: Id<'customers'>
        name: string
    }
    items: SaleItem[]
    status: SaleStatus
    totalAmount: number
    paymentMethod: string
    paymentSplits?: string        // JSON string of PaymentSplit[]
    amountReceived?: number
    changeDue?: number
    discountTotal?: number
    cancelledAt?: number
    cancelledBy?: Id<'users'>
    cancelledReason?: string
    originalSaleId?: Id<'sales'>
    departments?: string[]        // injected by joinSaleDetails
}


export interface SaleItem {
    _id: Id<'saleItems'>
    productId: Id<'products'>
    product?: {
        _id: Id<'products'>
        name: string
    }
    quantity: number
    unitPrice: number
    size?: string
    color?: string
    variant?: string
    batches?: BatchAllocation[]
}

export interface BatchAllocation {
    batchId: string
    batchNumber?: string
    quantity: number
}

export interface SalesStats {
    /** Completed transactions in the period. */
    salesCount: number
    /** Total item quantity sold — the volume counterpart to revenue. */
    unitsSold: number
    /** Average units per completed transaction (basket size). */
    itemsPerSale: number
    /** Distinct products that sold at least one unit. */
    uniqueProducts: number
    refundCount: number
    voidCount: number
    cancelledCount: number
}

export interface SalesFiltersType {
    status: string
    store: string
    search: string
    dateFrom: string
    dateTo: string
}

export interface CancelledSale {
    _id: Id<'cancelledSales'>
    originalSaleId: Id<'sales'>
    cancelledSaleId: Id<'sales'>
    cancelledAt: number
    cancelledBy: Id<'users'>
    reason?: string
    originalData: string
    // Enriched fields
    cancelledByName?: string
    storeName?: string
    originalTotal?: number
    originalSale?: Sale
    cancelledSale?: Sale
}