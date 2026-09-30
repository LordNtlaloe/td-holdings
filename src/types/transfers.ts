import type { Doc, Id } from "./entities"

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled'

export interface TransferWithStores extends Doc<'transfers'> {
    fromStore: Doc<'stores'> | null
    toStore: Doc<'stores'> | null
}

export interface DraftItem {
    productId: string
    quantityRequested: number
}

export interface ReceiveDraftItem {
    transferItemId: Id<'transferItems'>
    productName: string
    quantityRequested: number
    quantityReceived: number
    discrepancyReason: string
}

export interface TransferStats {
    pending: number
    inTransit: number
    received: number
    cancelled: number
}

export interface TransferChartStats {
    statusDistribution: Array<{ label: string; value: number; color: string }>
    storeDistribution: Array<{ label: string; value: number }>
    activityData: Array<{
        label: string
        Created: number
        Shipped: number
        Received: number
        Cancelled: number
    }>
}