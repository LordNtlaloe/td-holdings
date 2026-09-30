// ─────────────────────────────────────────────────────────────────────────────
// Entity types — TD Inventory
//
// These types describe the rows returned by the Turso (libSQL) backed REST API
// in `server/`. The API client (`src/lib/api/client.ts`) normalises each record
// so that:
//   • `id`           → `_id`
//   • `createdAt`    → `_creationTime`
//   • JSON text columns (`sizes`, `colors`, …) are parsed into arrays/objects
//
// These types are entirely self-contained — there is no external schema codegen.
// ─────────────────────────────────────────────────────────────────────────────

/** Every persisted record carries a string id and a creation timestamp. */
export interface BaseEntity {
    _id: string
    _creationTime: number
    createdAt?: number
    updatedAt?: number
}

export type Role = 'super_admin' | 'admin' | 'manager' | 'cashier'
export type UserStatus = 'active' | 'suspended' | 'banned'

// ─── People ────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
    name: string
    email: string
    role: Role
    storeId?: string | null
    image?: string | null
    status?: UserStatus | null
}

export interface Employee extends BaseEntity {
    userId: string
    storeId: string
    role: Role
    isActive: boolean
}

// ─── Organisation ──────────────────────────────────────────────────────────

export interface Store extends BaseEntity {
    name: string
    type: 'central' | 'branch'
    address?: string | null
    phone: string
    xCoordinates: string
    yCoordinates: string
    isActive: boolean
    printAgentId?: string | null
}

export interface Department extends BaseEntity {
    name: string
    description?: string | null
}

export interface Category extends BaseEntity {
    name: string
    departmentId: string
    description?: string | null
}

export interface StoreDepartment extends BaseEntity {
    storeId: string
    departmentId: string
}

// ─── Catalogue ─────────────────────────────────────────────────────────────

export interface SizePricing {
    size: string
    costPrice: number
    sellingPrice: number
}

export interface Product extends BaseEntity {
    name: string
    sku: string
    categoryId: string
    departmentId: string
    sizes?: string[] | null
    colors?: string[] | null
    variants?: string[] | null
    sizePricing?: SizePricing[] | null
    costPrice: number
    sellingPrice: number
    description?: string | null
    isActive: boolean
}

export interface Supplier extends BaseEntity {
    name: string
    email?: string | null
    phone?: string | null
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export interface Inventory extends BaseEntity {
    storeId: string
    productId: string
    reorderLevel?: number | null
}

export interface Batch extends BaseEntity {
    productId: string
    storeId: string
    batchNumber: string
    /**
     * Size this batch belongs to. Only set for products whose price varies by
     * size (`sizePricing`); null for single-size products.
     */
    size?: string | null
    quantity: number
    costPrice: number
    receivedAt: number
    sellingPrice: number
    expiryDate: number
    expiryStatus: 'expired' | 'near' | 'safe'
    product?: Product | null
    store?: Store | null
}

// ─── Purchasing ────────────────────────────────────────────────────────────

export interface Purchase extends BaseEntity {
    storeId: string
    supplierId?: string | null
    totalAmount: number
    status: 'received' | 'pending' | 'cancelled'
}

export interface PurchaseItem extends BaseEntity {
    purchaseId: string
    productId: string
    quantity: number
    costPrice: number
    batchNumber: string
    batchId?: string | null
}

// ─── Transfers ─────────────────────────────────────────────────────────────

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled'

export interface Transfer extends BaseEntity {
    fromStoreId: string
    toStoreId: string
    status: TransferStatus
    notes?: string | null
    receivedAt?: number | null
}

export interface TransferItem extends BaseEntity {
    transferId: string
    productId: string
    quantityRequested: number
    quantityReceived?: number | null
}

export interface TransferItemBatch extends BaseEntity {
    transferItemId: string
    batchId: string
    side: 'source' | 'destination'
    quantity: number
}

export interface TransferDiscrepancy extends BaseEntity {
    transferItemId: string
    expectedQty: number
    receivedQty: number
    reason: string
    reportedBy: string
    reportedAt: number
}

// ─── Customers ─────────────────────────────────────────────────────────────

export interface Customer extends BaseEntity {
    name: string
    email?: string | null
    phone?: string | null
    isActive?: boolean | null
    notes?: string | null
    loyaltyPoints?: number | null
    totalSpent?: number | null
    lastPurchaseAt?: number | null
    visitCount?: number | null
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export type SaleStatus = 'completed' | 'refunded' | 'voided' | 'cancelled'

export interface Sale extends BaseEntity {
    storeId: string
    customerId?: string | null
    totalAmount: number
    discountTotal?: number | null
    status: SaleStatus
    paymentMethod: string
    paymentSplits?: string | null
    amountReceived?: number | null
    changeDue?: number | null
    cancelledAt?: number | null
    cancelledBy?: string | null
    cancelledReason?: string | null
    originalSaleId?: string | null
    store?: { _id: string; name: string } | null
    customer?: { _id: string; name: string } | null
    items?: SaleItem[]
    departments?: string[]
}

export interface SaleItem extends BaseEntity {
    saleId?: string
    productId: string
    quantity: number
    unitPrice: number
    size?: string | null
    color?: string | null
    variant?: string | null
    originalSaleItemId?: string | null
    product?: { _id: string; name: string } | null
    batches?: BatchAllocation[]
}

export interface BatchAllocation {
    batchId: string
    batchNumber?: string
    quantity: number
}

export interface SaleItemBatch extends BaseEntity {
    saleItemId: string
    batchId: string
    quantity: number
    restoredAt?: number | null
}

export interface SaleDiscount extends BaseEntity {
    saleId: string
    productId: string
    discountAmount: number
    reason?: string | null
}

export interface CancelledSale extends BaseEntity {
    originalSaleId: string
    cancelledSaleId: string
    cancelledAt: number
    cancelledBy: string
    reason?: string | null
    originalData: string
}

export interface SaleEdit extends BaseEntity {
    saleId: string
    editedBy: string
    editedAt: number
    reason: string
    changes: string | Record<string, any>
    originalData: string
    newData: string
}

// ─── Ledger / audit ────────────────────────────────────────────────────────

export interface LedgerEntry extends BaseEntity {
    storeId: string
    type: 'income' | 'expense'
    category: string
    amount: number
    description?: string | null
    referenceType?: 'sale' | 'purchase' | 'manual' | 'cancellation' | null
    saleId?: string | null
    purchaseId?: string | null
    cancelledSaleId?: string | null
    date: number
}

export interface ActivityLog extends BaseEntity {
    userId: string
    role: string
    action: string
    entityType?: string | null
    entityId?: string | null
    description?: string | null
    /** Free-form detail string (alias used by some views). */
    detail?: string | null
    /** Display name of the user who performed the action. */
    performerName?: string | null
    createdAt: number
}

// ─── Invoicing ─────────────────────────────────────────────────────────────

export type InvoiceDocType = 'quotation' | 'proforma' | 'invoice'
export type InvoiceStatus = 'unpaid' | 'paid' | 'cancelled'

export interface Invoice extends BaseEntity {
    storeId: string
    docType: InvoiceDocType
    invoiceNumber: string
    customerId?: string | null
    customerName?: string | null
    customerPhone?: string | null
    status: InvoiceStatus
    totalAmount: number
    discountTotal?: number | null
    validUntil?: number | null
    notes?: string | null
    createdBy: string
    paidAt?: number | null
    convertedFromId?: string | null
    convertedToSaleId?: string | null
    items?: InvoiceItem[]
}

export interface InvoiceItem extends BaseEntity {
    invoiceId: string
    productId: string
    quantity: number
    unitPrice: number
    size?: string | null
    color?: string | null
    variant?: string | null
}

// ─── Pharmacy / clinical ─────────────────────────────────────────────────────

export interface Medication extends BaseEntity {
    name: string
    sku?: string | null
    description?: string | null
    price: number
    quantity: number
    isActive: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
//
// `EntityMap`, `Doc` and `Id` let modules reference an entity by its table name,
// e.g. `Doc<'products'>` is exactly `Product` and `Id<'sales'>` is `string`.
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityMap {
    users: User
    employees: Employee
    stores: Store
    departments: Department
    categories: Category
    storeDepartments: StoreDepartment
    products: Product
    suppliers: Supplier
    inventory: Inventory
    batches: Batch
    purchases: Purchase
    purchaseItems: PurchaseItem
    transfers: Transfer
    transferItems: TransferItem
    transferItemBatches: TransferItemBatch
    transferDiscrepancies: TransferDiscrepancy
    customers: Customer
    sales: Sale
    saleItems: SaleItem
    saleItemBatches: SaleItemBatch
    saleDiscounts: SaleDiscount
    cancelledSales: CancelledSale
    saleEdits: SaleEdit
    ledgerEntries: LedgerEntry
    activityLogs: ActivityLog
    invoices: Invoice
    invoiceItems: InvoiceItem
    medications: Medication
    /** Legacy alias: a batch of stock held at a store. */
    stockBatches: Batch
}

/** A stored document for the given table. */
export type Doc<K extends keyof EntityMap> = EntityMap[K]

/** A document id. Ids are opaque strings in the Turso schema. */
export type Id<_K extends keyof EntityMap = keyof EntityMap> = string
