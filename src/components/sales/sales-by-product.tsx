import { useMemo, useState, useRef, useEffect } from 'react'
import { useActiveProducts, useProductSalesOverview } from '#/lib/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchIcon, CheckIcon, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Id } from '#/types/entities'
import { formatCurrency } from './sales-utils'

interface SalesByProductProps {
  storeFilter: string
  stores: { _id: Id<'stores'>; name: string }[] | undefined
}

interface Transaction {
  saleId: string
  createdAt: number
  quantity: number
  unitPrice: number
  totalItemPrice: number
  customerName: string
  storeName: string
}

interface PeriodData {
  totalQuantity: number
  totalRevenue: number
  saleCount: number
  transactions: Transaction[]
}

interface PeriodsMap {
  [key: string]: PeriodData
}

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'pastWeek', label: 'Past 7 Days' },
  { key: 'pastMonth', label: 'Past 30 Days' },
  { key: 'allTime', label: 'All Time' },
] as const

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SalesByProduct({ storeFilter, stores }: SalesByProductProps) {
  const [periodTab, setPeriodTab] = useState('today')
  const products = useActiveProducts()
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const productSalesOverview = useProductSalesOverview(
    selectedProductId
      ? {
          productId: selectedProductId as Id<'products'>,
          storeId:
            storeFilter !== 'all' ? (storeFilter as Id<'stores'>) : undefined,
        }
      : undefined,
    !!selectedProductId
  )

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [open])

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  const periods = useMemo(() => {
    if (!productSalesOverview) return null
    return productSalesOverview.periods as PeriodsMap
  }, [productSalesOverview])

  const selectedProductName = useMemo(() => {
    if (!products || !selectedProductId) return ''
    return products.find((p) => p._id === selectedProductId)?.name ?? ''
  }, [products, selectedProductId])

  const activePeriodData = useMemo(() => {
    if (!periods) return null
    return periods[periodTab] ?? null
  }, [periods, periodTab])

  if (products === undefined) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle>Sales by Product</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a product to view its sales performance across time periods
              {storeFilter !== 'all' && stores
                ? ` · ${stores.find((s) => s._id === storeFilter)?.name ?? ''}`
                : ''}
            </p>
          </div>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-72 shrink-0 justify-between font-normal"
              >
                {selectedProductId && selectedProductName
                  ? selectedProductName
                  : 'Select a product...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1" align="end">
              <div className="flex items-center gap-1 border-b px-2 pb-1">
                <SearchIcon className="h-4 w-4 shrink-0 opacity-50" />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No products found.
                  </p>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => {
                        setSelectedProductId(product._id)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted',
                        selectedProductId === product._id && 'bg-muted'
                      )}
                    >
                      <CheckIcon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selectedProductId === product._id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span>{product.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {product.sku}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent>
        {!selectedProductId ? (
          <p className="py-8 text-center text-muted-foreground">
            Choose a product from the dropdown above to see its sales breakdown.
          </p>
        ) : productSalesOverview === undefined ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Info Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-lg font-semibold">{productSalesOverview.productName}</p>
                <p className="text-xs text-muted-foreground">
                  SKU: {productSalesOverview.sku}
                  {productSalesOverview.department && (
                    <> · Department: {productSalesOverview.department}</>
                  )}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right text-xs">
                  <p className="text-muted-foreground">Selling Price</p>
                  <p className="font-semibold">{formatCurrency(productSalesOverview.sellingPrice)}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-muted-foreground">Cost Price</p>
                  <p className="font-semibold">{formatCurrency(productSalesOverview.costPrice)}</p>
                </div>
                {productSalesOverview.sellingPrice > 0 && (
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Margin</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(productSalesOverview.sellingPrice - productSalesOverview.costPrice)}
                      {' '}
                      ({Math.round(((productSalesOverview.sellingPrice - productSalesOverview.costPrice) / productSalesOverview.sellingPrice) * 100)}%)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Tabs with Transaction Listings */}
            <Tabs value={periodTab} onValueChange={setPeriodTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  {PERIODS.map(({ key, label }) => {
                    const data = periods?.[key]
                    return (
                      <TabsTrigger key={key} value={key} className="relative">
                        {label}
                        {data && data.saleCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            {data.saleCount}
                          </span>
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {activePeriodData && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Qty: <strong className="text-foreground">{activePeriodData.totalQuantity}</strong>
                    </span>
                    <span>
                      Revenue:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(activePeriodData.totalRevenue)}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {PERIODS.map(({ key }) => (
                <TabsContent key={key} value={key} className="pt-4">
                  <TransactionTable periodData={periods?.[key]} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const PAGE_SIZE = 25

function TransactionTable({ periodData }: { periodData: PeriodData | undefined }) {
  const [page, setPage] = useState(0)

  // Reset to first page when data changes (e.g. switching tabs)
  useEffect(() => {
    setPage(0)
  }, [periodData])

  if (!periodData) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (periodData.transactions.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No sales recorded in this period.
      </p>
    )
  }

  const totalPages = Math.ceil(periodData.transactions.length / PAGE_SIZE)
  const start = page * PAGE_SIZE
  const end = start + PAGE_SIZE
  const pageTransactions = periodData.transactions.slice(start, end)

  return (
    <div className="space-y-4">
      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Date &amp; Time</th>
              <th className="pb-2 font-medium">Store</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium text-right">Quantity</th>
              <th className="pb-2 font-medium text-right">Unit Price</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageTransactions.map((tx) => (
              <tr key={tx.saleId} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2">{formatDateTime(tx.createdAt)}</td>
                <td className="py-2">{tx.storeName}</td>
                <td className="py-2">{tx.customerName}</td>
                <td className="py-2 text-right">{tx.quantity}</td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(tx.unitPrice)}
                </td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(tx.totalItemPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-medium">
              <td className="py-2" colSpan={3}>
                Total ({periodData.transactions.length} transaction{periodData.transactions.length !== 1 ? 's' : ''})
              </td>
              <td className="py-2 text-right">{periodData.totalQuantity}</td>
              <td />
              <td className="py-2 text-right">{formatCurrency(periodData.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-3 md:hidden">
        {pageTransactions.map((tx) => (
          <div key={tx.saleId} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{tx.customerName}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Store</span>
              <span className="text-right">{tx.storeName}</span>
              <span className="text-muted-foreground">Quantity</span>
              <span className="text-right font-medium">{tx.quantity}</span>
              <span className="text-muted-foreground">Unit Price</span>
              <span className="text-right">{formatCurrency(tx.unitPrice)}</span>
              <span className="text-muted-foreground">Total</span>
              <span className="text-right font-semibold">{formatCurrency(tx.totalItemPrice)}</span>
            </div>
          </div>
        ))}

        {/* Mobile footer summary card */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Transactions</span>
            <span className="text-right font-medium">{periodData.transactions.length}</span>
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="text-right font-medium">{periodData.totalQuantity}</span>
            <span className="text-muted-foreground">Total Revenue</span>
            <span className="text-right font-semibold">{formatCurrency(periodData.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing {start + 1}–{Math.min(end, periodData.transactions.length)} of{' '}
            {periodData.transactions.length}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {totalPages <= 7
              ? Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={i === page ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-8"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))
              : renderCondensedPageNumbers(page, totalPages, setPage)}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function renderCondensedPageNumbers(
  currentPage: number,
  totalPages: number,
  setPage: (fn: (prev: number) => number) => void
) {
  const pages: (number | string)[] = []

  // Always show first page
  pages.push(0)

  if (currentPage > 2) {
    pages.push('...')
  }

  // Pages around current
  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 3) {
    pages.push('...')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages - 1)
  }

  return pages.map((p, idx) =>
    typeof p === 'string' ? (
      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
        …
      </span>
    ) : (
      <Button
        key={p}
        variant={p === currentPage ? 'default' : 'outline'}
        size="sm"
        className="min-w-8"
        onClick={() => setPage(() => p)}
      >
        {p + 1}
      </Button>
    )
  )
}