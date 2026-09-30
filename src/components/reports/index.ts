// components/reports/index.ts

// ─────────────────────────────────────────────────────────────────────────────
// FILTER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { DateRangeFilter } from "./filters/date-range-filter";
export { StoreFilter } from "./filters/store-filters";
export { DepartmentFilter } from "./filters/department-filters";
export { CategoryFilter } from "./filters/category-filters";
export { StatusFilter } from "./filters/status-filters";
export { CustomerFilter } from "./filters/customer-filters";
export { SupplierFilter } from "./filters/supplier-filters";

// ─────────────────────────────────────────────────────────────────────────────
// CHART COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { SalesLineChart } from "./charts/sales-line-chart";
export { RevenueBarChart } from "./charts/revenue-bar-chart";
export { CategoryPieChart } from "./charts/category-pie-chart";
export { TopProductsChart } from "./charts/top-products-chart";
export { StockMovementChart } from "./charts/stock-movement-chart";

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { KPICard } from "./cards/kpi-card";
export { SummaryCardsRow } from "./cards/summary-card";
export { ReportTable } from "./tables/reports-table";
export { ChartCard } from "./cards/report-charts-card";
export { StockLevelBadge } from "./badges/low-stock-badge";
export { TransferStatusBadge } from "./badges/transfer-status-badge";
export { ActivityTimeline } from "./activity-timeline";

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { ProfitLossCard } from "./cards/profit-loss-card";
export { ExpenseBreakdownCard } from "./cards/expense-breakdown-card";
export { InventoryValueCard } from "./cards/inventory-value-card";

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT & PRINT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { ExportDropdown } from "./export-dropdown";
export { PrintButton } from "./print-button";

// ─────────────────────────────────────────────────────────────────────────────
// PDF COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { PDFTemplate } from "./pdf/pdf-template";
export { PDFHeader } from "./pdf/pdf-header";
export { PDFSummary } from "./pdf/pdf-summary"
export { PDFTable } from "./pdf/pdf-table";
export { PDFFooter } from "./pdf/pdf-footer";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export { ReportSkeleton } from "./reports-skeleton";
export { EmptyReportState } from "./empty-reports-state";

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export { ReportSettingsModal } from "./report-settings-modal";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export * from "#/types/reports";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export * from "./report-utils";