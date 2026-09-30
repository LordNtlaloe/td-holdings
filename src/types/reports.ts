// components/reports/types.ts

// ─────────────────────────────────────────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

export interface FilterOptions {
    storeId?: string;
    departmentId?: string;
    categoryId?: string;
    customerId?: string;
    supplierId?: string;
    status?: string;
    dateRange?: DateRange;
    from?: number;
    to?: number;
    limit?: number;
    threshold?: number;
    days?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI & DASHBOARD TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface KPI {
    label: string;
    value: number | string;
    change?: number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

export interface ExecutiveDashboardData {
    salesToday: number;
    revenueToday: number;
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    stockValue: number;
    pendingTransfers: number;
    lowStockItems: number;
    topProduct: {
        name: string;
        quantity: number;
    } | null;
    topCustomer: {
        name: string;
        totalSpent: number;
    } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportColumn {
    key: string;
    header: string;
    accessor?: (row: any) => React.ReactNode;
    className?: string;
}

export interface ReportData {
    columns: ReportColumn[];
    rows: any[];
    summary?: {
        label: string;
        value: number | string;
    }[];
}

export interface ChartData {
    label: string;
    value: number;
    [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DailySalesReportData {
    totalRevenue: number;
    totalSales: number;
    averageSale: number;
    byStore: {
        storeId: string;
        storeName: string;
        revenue: number;
        count: number;
    }[];
}

export interface SalesByProductData {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
}

export interface TopSellingProduct {
    name: string;
    quantity: number;
    revenue: number;
}

export interface SlowMovingProduct {
    name: string;
    sku: string;
    quantity: number;
}

export interface SalesByCategoryData {
    name: string;
    quantity: number;
    revenue: number;
}

export interface SalesByDepartmentData {
    name: string;
    quantity: number;
    revenue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TopCustomer {
    name: string;
    email?: string;
    phone?: string;
    totalSpent: number;
    visitCount: number;
    lastPurchaseAt?: number;
    loyaltyPoints: number;
}

export interface InactiveCustomer {
    name: string;
    email?: string;
    phone?: string;
    totalSpent: number;
    lastPurchaseAt?: number;
    visitCount: number;
}

export interface CustomerVisitFrequency {
    label: string;
    count: number;
}

export interface CustomerPurchaseReportData {
    name: string;
    email?: string;
    phone?: string;
    totalSpent: number;
    visitCount: number;
    lastPurchaseAt?: number;
    loyaltyPoints: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrentStockReportItem {
    storeName: string;
    productName: string;
    sku: string;
    quantity: number;
    value: number;
    reorderLevel: number;
    belowReorder: boolean;
}

export interface StockValuationData {
    totalValue: number;
    byStore: {
        storeName: string;
        value: number;
    }[];
}

export interface LowStockReportItem {
    storeName: string;
    productName: string;
    sku: string;
    quantity: number;
    reorderLevel: number;
}

export interface OutOfStockReportItem {
    storeName: string;
    productName: string;
    sku: string;
    quantity: number;
}

export interface BatchReportItem {
    batchNumber: string;
    productName: string;
    sku: string;
    storeName: string;
    quantity: number;
    costPrice: number;
    totalValue: number;
    receivedAt: number;
}

export interface InventoryByDepartmentData {
    name: string;
    quantity: number;
    value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PurchaseReportItem {
    storeName: string;
    supplierName: string;
    totalAmount: number;
    status: 'received' | 'pending' | 'cancelled';
    createdAt: number;
}

export interface PurchasesBySupplierData {
    name: string;
    email?: string;
    phone?: string;
    total: number;
    count: number;
}

export interface SupplierPurchaseHistoryItem {
    supplierName: string;
    batchNumber: string;
    productName: string;
    sku: string;
    quantity: number;
    costPrice: number;
    totalCost: number;
    purchaseDate?: number;
}

export interface PurchaseHistoryItem {
    batchNumber: string;
    productName: string;
    sku: string;
    quantity: number;
    costPrice: number;
    totalCost: number;
    purchaseDate?: number;
}

export interface InventoryCostReportData {
    totalCost: number;
    byStore: {
        storeName: string;
        cost: number;
    }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferHistoryItem {
    transferId: string;
    fromStore: string;
    toStore: string;
    status: 'pending' | 'in_transit' | 'received' | 'cancelled';
    notes?: string;
    createdAt: number;
    receivedAt?: number;
}

export interface PendingTransfer {
    transferId: string;
    fromStore: string;
    toStore: string;
    notes?: string;
    createdAt: number;
}

export interface ReceivedTransfer {
    transferId: string;
    fromStore: string;
    toStore: string;
    notes?: string;
    createdAt: number;
    receivedAt?: number;
}

export interface TransferDiscrepancy {
    productName: string;
    fromStore: string;
    toStore: string;
    expectedQty: number;
    receivedQty: number;
    difference: number;
    reason: string;
    reportedBy: string;
    reportedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerEntry {
    _id: string;
    storeId: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string;
    referenceType?: 'sale' | 'purchase' | 'manual';
    saleId?: string;
    purchaseId?: string;
    date: number;
}

export interface IncomeReportData {
    total: number;
    entries: LedgerEntry[];
    byCategory: {
        category: string;
        amount: number;
    }[];
}

export interface ExpenseReportData {
    total: number;
    entries: LedgerEntry[];
    byCategory: {
        category: string;
        amount: number;
    }[];
}

export interface ProfitAndLossData {
    income: number;
    expenses: number;
    profit: number;
    byStore: {
        storeName: string;
        income: number;
        expenses: number;
        profit: number;
    }[];
}

export interface CashFlowData {
    moneyIn: number;
    moneyOut: number;
    net: number;
    timeline: {
        date: string;
        moneyIn: number;
        moneyOut: number;
        net: number;
    }[];
}

export interface ExpenseByCategoryData {
    category: string;
    amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'manager' | 'cashier';
    storeName: string;
    isActive: boolean;
    status: 'active' | 'suspended' | 'banned';
}

export interface EmployeesByStoreData {
    storeName: string;
    count: number;
}

export interface EmployeesByRoleData {
    role: string;
    count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UserActivity {
    userName: string;
    role: string;
    action: string;
    entityType?: string;
    description?: string;
    createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE & ENTITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Store {
    _id: string;
    name: string;
    type: 'central' | 'branch';
    address?: string;
    phone: string;
    xCoordinates: string;
    yCoordinates: string;
    isActive: boolean;
}

export interface Department {
    _id: string;
    name: string;
    description?: string;
}

export interface Category {
    _id: string;
    name: string;
    departmentId: string;
    description?: string;
}

export interface Customer {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
    notes?: string;
    loyaltyPoints?: number;
    totalSpent?: number;
    lastPurchaseAt?: number;
    visitCount?: number;
    createdAt?: number;
}

export interface Supplier {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportSettings {
    showSummaryCards: boolean;
    showCharts: boolean;
    showTable: boolean;
    dateFormat: string;
    currencyFormat: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterComponentProps {
    className?: string;
    placeholder?: string;
}

export interface DateRangeFilterProps extends FilterComponentProps {
    dateRange: DateRange;
    onDateRangeChange: (range: DateRange) => void;
    presets?: { label: string; range: DateRange }[];
}

export interface StoreFilterProps extends FilterComponentProps {
    stores: Store[];
    selectedStore?: string;
    onStoreChange: (storeId?: string) => void;
}

export interface DepartmentFilterProps extends FilterComponentProps {
    departments: Department[];
    selectedDepartment?: string;
    onDepartmentChange: (departmentId?: string) => void;
}

export interface CategoryFilterProps extends FilterComponentProps {
    categories: Category[];
    selectedCategory?: string;
    onCategoryChange: (categoryId?: string) => void;
}

export interface StatusFilterProps extends FilterComponentProps {
    statuses: string[];
    selectedStatus?: string;
    onStatusChange: (status?: string) => void;
}

export interface CustomerFilterProps extends FilterComponentProps {
    customers: Customer[];
    selectedCustomer?: string;
    onCustomerChange: (customerId?: string) => void;
}

export interface SupplierFilterProps extends FilterComponentProps {
    suppliers: Supplier[];
    selectedSupplier?: string;
    onSupplierChange: (supplierId?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT/PRINT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportOptions {
    format: 'csv' | 'pdf' | 'excel' | 'json';
    filename?: string;
    data?: any;
    columns?: ReportColumn[];
}

export interface PrintOptions {
    title?: string;
    subtitle?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesLineChartData {
    date: string;
    sales: number;
    revenue: number;
}

export interface RevenueBarChartData {
    label: string;
    revenue: number;
}

export interface CategoryPieChartData {
    name: string;
    value: number;
}

export interface TopProductsChartData {
    name: string;
    quantity: number;
    revenue: number;
}

export interface StockMovementChartData {
    date: string;
    incoming: number;
    outgoing: number;
    balance: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StatusType = 'pending' | 'in_transit' | 'received' | 'cancelled' | 'completed' | 'refunded' | 'voided';

export type RoleType = 'super_admin' | 'admin' | 'manager' | 'cashier';

export type StoreType = 'central' | 'branch';

export type LedgerType = 'income' | 'expense';

export type ReferenceType = 'sale' | 'purchase' | 'manual';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}

export interface SearchOptions {
    query: string;
    fields: string[];
}