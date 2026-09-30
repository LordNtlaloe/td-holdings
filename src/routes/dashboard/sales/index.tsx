import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery } from '#/lib/api/hooks'
import type { Id } from '#/types/entities'
import { useState, useMemo } from 'react'

import AppLayout from '#/layouts/app-layout'
import {
  SalesStatCards,
  SalesFilters,
  SaleDetailSheet,
  ConfirmActionDialog,
  SalesCharts,
  ProductSalesBreakdownCard,
  SalesHistoryCard,
  SalesByProduct,
  ProductPerformance,
  startOfDay,
  endOfDay,
  type SalesFiltersType,
} from '#/components/sales'
import { DistributionChart, type DistributionSlice } from '#/components/general/distribution-chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/dashboard/sales/')({
  component: SalesPage,
})

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: '#16a34a',
  Card: '#0ea5e9',
  Mpesa: '#f59e0b',
  Ecocash: '#8b5cf6',
  Credit: '#6366f1',
  Voucher: '#f97316',
  Unknown: '#94a3b8',
}

function SalesPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState<SalesFiltersType>({
    status: 'all',
    store: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  })

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'void' | 'cancel' | null>(null)
  const [actionSaleId, setActionSaleId] = useState<string | null>(null)
  const [breakdownDepartment, setBreakdownDepartment] = useState<string>('all')

  const { data: currentUser } = useApiQuery<any>('users.getUserProfile', '/api/users/profile')
  const isGlobal =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin'
  const canAction =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager'
  const canVoid =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager' ||
    currentUser?.role === 'cashier'

  const { data: employee } = useApiQuery<any>(
    'employees.getMyEmployeeRecord',
    '/api/employees/my-record',
    undefined,
    isGlobal === false && currentUser !== undefined
  )

  const { data: allSalesRaw } = useApiQuery<any>('sales.allCompletedSales', '/api/sales/completed', undefined, !!isGlobal)
  const { data: storeSalesRaw } = useApiQuery<any>(
    'sales.getSalesByStore',
    '/api/sales/by-store/' + (employee?.storeId || ''),
    undefined,
    !isGlobal && !!employee?.storeId
  )

  const salesRaw = isGlobal ? allSalesRaw : storeSalesRaw
  const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores', undefined, !!isGlobal)
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')

  // Today's date range
  const todayStart = useMemo(() => startOfDay(new Date()), [])
  const todayEnd = useMemo(() => endOfDay(new Date()), [])

  // Get department ID for filtering
  const departmentId = useMemo(() => {
    if (breakdownDepartment === 'all' || !departments) return undefined
    const dept = departments.find((d: any) => d.name === breakdownDepartment)
    return dept?._id as string | undefined
  }, [breakdownDepartment, departments])

  // Product breakdown with department filtering (TODAY ONLY)
  const { data: todayProductSales } = useApiQuery<any>('sales.getProductSalesWithPaymentMethods', '/api/sales/product-sales', {
    storeId: filters.store !== 'all' ? filters.store : undefined,
    dateFrom: String(todayStart),
    dateTo: String(todayEnd),
    departmentId: departmentId || undefined,
  })

  const { data: paymentMethodBreakdown } = useApiQuery<any>('sales.getSalesByPaymentMethod', '/api/sales/by-payment-method', {
    storeId: filters.store !== 'all' ? filters.store : undefined,
    dateFrom: filters.dateFrom ? String(startOfDay(new Date(filters.dateFrom))) : undefined,
    dateTo: filters.dateTo ? String(endOfDay(new Date(filters.dateTo))) : undefined,
  })

  const dateFromTs = filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : undefined
  const dateToTs = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : undefined

  // FILTERED SALES for charts (respects all filters)
  const filteredSales = useMemo(() => {
    if (!salesRaw) return []
    let rows = salesRaw as any[]
    if (filters.status !== 'all') rows = rows.filter((s) => s.status === filters.status)
    if (filters.store !== 'all') rows = rows.filter((s) => s.storeId === filters.store)
    if (dateFromTs !== undefined) rows = rows.filter((s) => s.createdAt >= dateFromTs)
    if (dateToTs !== undefined) rows = rows.filter((s) => s.createdAt <= dateToTs)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (s) =>
          (s.customer?.name ?? 'walk-in').toLowerCase().includes(q) ||
          (s.store?.name ?? '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [salesRaw, filters, dateFromTs, dateToTs])

  // ALL SALES for history (no date filters applied)
  const allSalesForHistory = useMemo(() => {
    if (!salesRaw) return []
    let rows = salesRaw as any[]
    if (filters.status !== 'all') rows = rows.filter((s) => s.status === filters.status)
    if (filters.store !== 'all') rows = rows.filter((s) => s.storeId === filters.store)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (s) =>
          (s.customer?.name ?? 'walk-in').toLowerCase().includes(q) ||
          (s.store?.name ?? '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [salesRaw, filters])

  // Stats — volume-based (no revenue) and scoped to the active filters so they
  // stay in step with the charts, the history table and the date pickers.
  // These used to be hardcoded to "today", which made the whole row read zero
  // whenever the selected period was empty.
  const stats = useMemo(() => {
    if (!salesRaw) {
      return {
        salesCount: 0,
        unitsSold: 0,
        itemsPerSale: 0,
        uniqueProducts: 0,
        refundCount: 0,
        voidCount: 0,
        cancelledCount: 0,
      }
    }

    // Store + date filters apply; the status filter deliberately does not, so
    // the refund/void/cancel counts stay meaningful when one status is selected.
    let rows = salesRaw as any[]
    if (filters.store !== 'all') rows = rows.filter((s) => s.storeId === filters.store)
    if (dateFromTs !== undefined) rows = rows.filter((s) => s.createdAt >= dateFromTs)
    if (dateToTs !== undefined) rows = rows.filter((s) => s.createdAt <= dateToTs)

    // ONLY completed sales count towards volume
    const completed = rows.filter((s: any) => s.status === 'completed')
    const salesCount = completed.length

    // Volume instead of money: how many items moved, and across how many
    // distinct products.
    const unitsSold = completed.reduce(
      (sum: number, s: any) =>
        sum + (s.items ?? []).reduce((q: number, i: any) => q + (i.quantity ?? 0), 0),
      0
    )
    const uniqueProducts = new Set(
      completed.flatMap((s: any) => (s.items ?? []).map((i: any) => i.productId))
    ).size

    return {
      salesCount,
      unitsSold,
      itemsPerSale: salesCount > 0 ? unitsSold / salesCount : 0,
      uniqueProducts,
      refundCount: rows.filter((s: any) => s.status === 'refunded').length,
      voidCount: rows.filter((s: any) => s.status === 'voided').length,
      cancelledCount: rows.filter((s: any) => s.status === 'cancelled').length,
    }
  }, [salesRaw, filters.store, dateFromTs, dateToTs])

  // Transaction counts per tender type — volume, not money.
  const paymentMethodData: DistributionSlice[] = useMemo(() => {
    if (!paymentMethodBreakdown) return []
    const slices: DistributionSlice[] = paymentMethodBreakdown.map(
      (item: any): DistributionSlice => ({
        label: item.method,
        value: item.count ?? 0,
        color: PAYMENT_METHOD_COLORS[item.method] ?? '#14b8a6',
      })
    )

    const sorted = slices
      .filter((slice: DistributionSlice) => slice.value > 0)
      .sort((a: DistributionSlice, b: DistributionSlice) => b.value - a.value)

    if (sorted.length <= 8) return sorted

    // The imported data stores combined tenders ("Card + Cash + Mpesa"), which
    // would otherwise render 30+ unreadable slices.
    const top = sorted.slice(0, 8)
    const other = sorted
      .slice(8)
      .reduce((sum: number, slice: DistributionSlice) => sum + slice.value, 0)
    return [...top, { label: 'Other', value: other, color: '#94a3b8' }]
  }, [paymentMethodBreakdown])

  const availableDepartments = useMemo(() => {
    if (departments) {
      return departments.map((d: any) => d.name)
    }
    return []
  }, [departments])

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== 'all' ||
      filters.store !== 'all' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.search !== ''
    )
  }, [filters])

  const handleFilterChange = (key: keyof SalesFiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setFilters({ status: 'all', store: 'all', search: '', dateFrom: '', dateTo: '' })
  }

  const openVoid = (id: Id<'sales'>) => {
    setSelectedSaleId(null)
    setActionSaleId(id)
    setActionType('void')
  }
  const openCancel = (id: Id<'sales'>) => {
    setSelectedSaleId(null)
    setActionSaleId(id)
    setActionType('cancel')
  }

  const isLoading = salesRaw === undefined || currentUser === undefined
  const isLoadingDepartments = departments === undefined

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">
            {isGlobal ? 'All stores' : 'Your store'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="by-store">By Store</TabsTrigger>
            <TabsTrigger value="by-department">By Department</TabsTrigger>
            <TabsTrigger value="by-product">By Product</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 pt-4">
            <SalesStatCards stats={stats} isLoading={isLoading} />

            <SalesFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isGlobal={isGlobal}
              stores={stores}
              hasActiveFilters={hasActiveFilters}
            />

            <SalesCharts
              salesData={filteredSales}
              isLoading={isLoading}
              isGlobal={isGlobal}
              extraCharts={
                <DistributionChart
                  data={paymentMethodData}
                  title="Transactions by Payment Method"
                  description="How many transactions used each tender type"
                />
              }
            />

            <ProductSalesBreakdownCard
              todayProductSales={todayProductSales}
              availableDepartments={availableDepartments}
              isLoadingDepartments={isLoadingDepartments}
              breakdownDepartment={breakdownDepartment}
              onBreakdownDepartmentChange={setBreakdownDepartment}
              storeFilter={filters.store}
              stores={stores}
            />

            <SalesHistoryCard
              sales={allSalesForHistory}
              isLoading={isLoading}
              isGlobal={isGlobal}
              canAction={canAction}
              canVoid={canVoid}
              statusFilter={filters.status}
              storeFilter={filters.store}
              stores={stores}
              onSelectSale={setSelectedSaleId}
              onVoid={openVoid}
              onCancel={openCancel}
              onRefund={(_: Id<'sales'>) => {
                throw new Error('Function not implemented.')
              }}
            />
          </TabsContent>

          <TabsContent value="by-store" className="space-y-6 pt-4">
            <SalesStatCards stats={stats} isLoading={isLoading} />

            <SalesFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isGlobal={isGlobal}
              stores={stores}
              hasActiveFilters={hasActiveFilters}
            />

            <SalesHistoryCard
              sales={allSalesForHistory}
              isLoading={isLoading}
              isGlobal={isGlobal}
              canAction={canAction}
              canVoid={canVoid}
              statusFilter={filters.status}
              storeFilter={filters.store}
              stores={stores}
              onSelectSale={setSelectedSaleId}
              onVoid={openVoid}
              onCancel={openCancel}
              onRefund={(_: Id<'sales'>) => {
                throw new Error('Function not implemented.')
              }}
            />
          </TabsContent>

          <TabsContent value="by-department" className="space-y-6 pt-4">
            <SalesStatCards stats={stats} isLoading={isLoading} />

            <SalesFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isGlobal={isGlobal}
              stores={stores}
              hasActiveFilters={hasActiveFilters}
            />

            <ProductSalesBreakdownCard
              todayProductSales={todayProductSales}
              availableDepartments={availableDepartments}
              isLoadingDepartments={isLoadingDepartments}
              breakdownDepartment={breakdownDepartment}
              onBreakdownDepartmentChange={setBreakdownDepartment}
              storeFilter={filters.store}
              stores={stores}
            />
          </TabsContent>

          <TabsContent value="by-product" className="space-y-6 pt-4">
            <ProductPerformance
              storeFilter={filters.store}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
            />

            <SalesByProduct storeFilter={filters.store} stores={stores} />
          </TabsContent>
        </Tabs>
      </div>

      <SaleDetailSheet
        saleId={selectedSaleId}
        open={!!selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        canAction={canAction}
        onVoid={openVoid}
        onCancel={openCancel}
        canVoid={canVoid}
      />

      <ConfirmActionDialog
        action={actionType}
        saleId={actionSaleId}
        onClose={() => {
          setActionType(null)
          setActionSaleId(null)
        }}
      />
    </AppLayout>
  )
}