import { createFileRoute } from '@tanstack/react-router'
import { useDashboard } from '#/lib/api/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'
import AppLayout from '#/layouts/app-layout'
import {
  DashboardStatCards,
  DashboardCharts,
  DashboardTables,
  DashboardAlerts,
  DashboardCustomersTab,
  DashboardFinancialsTab,
  DashboardInventoryTab,
  type DashboardData,
} from '#/components/dashboard'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: queryData, isLoading } = useDashboard()
  const typedData = queryData as DashboardData | undefined

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </AppLayout>
    )
  }

  if (!typedData) {
    return (
      <AppLayout>
        <div className="p-16 text-center text-muted-foreground">
          <p>No dashboard data available.</p>
        </div>
      </AppLayout>
    )
  }

  if (typedData.scope === 'none') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-2 p-16 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p>No employee record found for your account — contact an admin to get assigned to a store.</p>
        </div>
      </AppLayout>
    )
  }

  const isGlobal = typedData.scope === 'global'
  const data = typedData!;
  const isCashier = data.role === 'cashier'

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isGlobal
              ? `Overview across all stores · ${data.stats.activeStores} active`
              : 'Overview for your store'}
          </p>
        </div>

        {/* Alerts banner — shown when there's anything to flag */}
        {data.alerts.length > 0 && (
          <DashboardAlerts alerts={data.alerts} />
        )}

        {/* KPI cards */}
        <DashboardStatCards data={data} isGlobal={isGlobal} />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            {!isCashier && <TabsTrigger value="stock">Low Stock</TabsTrigger>}
            {isGlobal && <TabsTrigger value="stores">Stores</TabsTrigger>}
            {isGlobal && <TabsTrigger value="transfers">Transfers</TabsTrigger>}
            {isGlobal && <TabsTrigger value="purchases">Purchases</TabsTrigger>}
            {!isCashier && <TabsTrigger value="customers">Customers</TabsTrigger>}
            {isGlobal && <TabsTrigger value="financials">Financials</TabsTrigger>}
            {!isCashier && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
            {isGlobal && <TabsTrigger value="activity">Activity</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DashboardCharts data={data} isGlobal={isGlobal} />
          </TabsContent>

          <TabsContent value="sales">
            <DashboardTables data={data} isGlobal={isGlobal} activeTab="sales" />
          </TabsContent>

          {!isCashier && (
            <TabsContent value="stock">
              <DashboardTables data={data} isGlobal={isGlobal} activeTab="stock" />
            </TabsContent>
          )}

          {isGlobal && (
            <TabsContent value="stores">
              <DashboardTables data={data} isGlobal={isGlobal} activeTab="stores" />
            </TabsContent>
          )}

          {isGlobal && (
            <TabsContent value="transfers">
              <DashboardTables data={data} isGlobal={isGlobal} activeTab="transfers" />
            </TabsContent>
          )}

          {isGlobal && (
            <TabsContent value="purchases">
              <DashboardTables data={data} isGlobal={isGlobal} activeTab="purchases" />
            </TabsContent>
          )}

          {!isCashier && (
            <TabsContent value="customers">
              <DashboardCustomersTab data={data} />
            </TabsContent>
          )}

          {isGlobal && (
            <TabsContent value="financials">
              <DashboardFinancialsTab data={data} />
            </TabsContent>
          )}

          {!isCashier && (
            <TabsContent value="inventory">
              <DashboardInventoryTab data={data} />
            </TabsContent>
          )}

          {isGlobal && (
            <TabsContent value="activity">
              <DashboardTables data={data} isGlobal={isGlobal} activeTab="activity" />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  )
}