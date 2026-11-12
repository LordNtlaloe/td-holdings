export { SalesStatCards } from './sales-stat-cards'
export { SalesFilters } from './sales-filter'
export { SalesTable } from './sales-table'
export { SaleDetailSheet } from './sales-detail-sheet'
export { ConfirmActionDialog } from './confirm-action-dialog'
export { SalesCharts } from "./sales-chart"
export * from './sales-utils'
export * from "./sales-breakdown-card"
export * from "./sales-history-card"
export { SalesByProduct } from './sales-by-product'
export { ProductPerformance } from './product-performance'
export type { SalesFiltersType, Sale, SaleItem, BatchAllocation, SalesStats, SaleStatus } from '#/types/sales'

// Sales dashboard (mirrors the expenses organization — see components/expenses)
export { SalesTrendChart, SalesLegend, type SalesPoint } from './sales-trend-chart'
export { SalesDailyBarsChart, type SalesDayBar } from './sales-daily-bars'
export { SalesTodayPanel } from './sales-today-panel'
export { SalesBreakdown } from './sales-breakdown'
export { RecentSalesPeriods, type RecentSalesRow } from './sales-recent-periods'
export { SalesList } from './sales-list'
export { summarizeSales, bucketIndex, type SaleLike, type SalesSummary, type SalesBucket } from './sales-summary-utils'