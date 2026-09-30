export { DashboardStatCards } from './dashboard-stat-cards'
export { DashboardCharts } from './dashboard-charts'
export { DashboardTables } from './dashboard-tables'
export { DashboardAlerts } from './dashboard-alerts'
export {
    DashboardCustomersTab,
    DashboardFinancialsTab,
    DashboardInventoryTab,
} from './dashboard-extra-tabs'

// Re-export the type so the page can import it from one place
export type { DashboardData } from '#/types/dashboard'