import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardData } from '#/types/dashboard'
import {
  formatCurrency,
  formatTs,
  getStatusVariant,
  getTransferStatusVariant,
  humanizeAction,
} from './dashboard-utils'

interface DashboardTablesProps {
  data: DashboardData
  isGlobal: boolean
  activeTab: string
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function SalesTable({ data, isGlobal }: { data: DashboardData; isGlobal: boolean }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')

  const paymentMethods = Array.from(
    new Set(data.recentSales.map((s) => s.paymentMethod).filter(Boolean))
  )

  const filtered = data.recentSales.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false
    return true
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>
              {isGlobal ? 'Latest 10 sales across all stores' : 'Latest 10 sales at your store'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
            {paymentMethods.length > 0 && (
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m!}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {isGlobal && <TableHead>Store</TableHead>}
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isGlobal ? 6 : 5}
                  className="text-center text-muted-foreground"
                >
                  No sales match the current filters
                </TableCell>
              </TableRow>
            )}
            {filtered.map((sale) => (
              <TableRow key={sale._id}>
                {isGlobal && <TableCell className="font-medium">{sale.storeName}</TableCell>}
                <TableCell>
                  <span>{sale.customerName}</span>
                  {sale.visitCount && sale.visitCount > 1 && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      #{sale.visitCount}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {sale.paymentMethod ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(sale.status)}>{sale.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTs(sale.createdAt)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(sale.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Low Stock ────────────────────────────────────────────────────────────────

function StockTable({ data, isGlobal }: { data: DashboardData; isGlobal: boolean }) {
  // Sort by urgency: zero stock first, then by days until stockout
  const sorted = [...data.lowStockItems].sort((a, b) => {
    if (a.quantity === 0 && b.quantity !== 0) return -1
    if (b.quantity === 0 && a.quantity !== 0) return 1
    return (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock</CardTitle>
        <CardDescription>
          Items at or below reorder level · sorted by urgency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              {isGlobal && <TableHead>Store</TableHead>}
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Reorder At</TableHead>
              <TableHead className="text-right">Avg Daily Sales</TableHead>
              <TableHead className="text-right">Days Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isGlobal ? 6 : 5}
                  className="text-center text-muted-foreground"
                >
                  Nothing low on stock right now
                </TableCell>
              </TableRow>
            )}
            {sorted.map((item) => {
              const daysLeft = item.daysUntilStockout ?? 999
              const daysVariant =
                item.quantity === 0
                  ? 'destructive'
                  : daysLeft <= 3
                  ? 'destructive'
                  : daysLeft <= 7
                  ? 'secondary'
                  : 'outline'

              return (
                <TableRow key={item.productId + item.storeName}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  {isGlobal && <TableCell>{item.storeName}</TableCell>}
                  <TableCell className="text-right">
                    <Badge variant={item.quantity === 0 ? 'destructive' : 'secondary'}>
                      {item.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.reorderLevel}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.avgDailySales > 0 ? item.avgDailySales.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity === 0 ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : daysLeft >= 999 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge variant={daysVariant}>{daysLeft}d</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Stores ───────────────────────────────────────────────────────────────────

function StoresTable({ data }: { data: DashboardData }) {
  const sorted = [...data.storeBreakdown].sort((a, b) => b.revenue - a.revenue)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Breakdown</CardTitle>
        <CardDescription>Ranked by revenue, all-time</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Avg Tx</TableHead>
              <TableHead className="text-right">Low Stock</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((store, idx) => (
              <TableRow key={store.storeName}>
                <TableCell className="text-muted-foreground">#{idx + 1}</TableCell>
                <TableCell className="font-medium">{store.storeName}</TableCell>
                <TableCell className="text-right">{store.salesCount}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(store.avgTransaction ?? 0)}
                </TableCell>
                <TableCell className="text-right">
                  {store.lowStockCount > 0 ? (
                    <Badge variant="secondary">{store.lowStockCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(store.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Transfers ────────────────────────────────────────────────────────────────

function TransfersTable({ data }: { data: DashboardData }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = data.transfers.recent.filter(
    (t) => statusFilter === 'all' || t.status === statusFilter
  )

  const now = Date.now()
  const isStale = (createdAt: number) =>
    (now - createdAt) / (1000 * 60 * 60 * 24) > 3

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Recent Transfers</CardTitle>
            <CardDescription>
              {data.transfers.pendingCount} pending · {data.transfers.inTransitCount} in transit
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No transfers match the current filter
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => {
              const ageMs = now - t.createdAt
              const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
              const stale = isStale(t.createdAt) && t.status !== 'received' && t.status !== 'cancelled'

              return (
                <TableRow key={t._id}>
                  <TableCell>{t.fromStore}</TableCell>
                  <TableCell>{t.toStore}</TableCell>
                  <TableCell>
                    <Badge variant={getTransferStatusVariant(t.status)}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTs(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={stale ? 'destructive' : 'outline'}>
                      {ageDays === 0 ? 'Today' : `${ageDays}d`}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Purchases ────────────────────────────────────────────────────────────────

function PurchasesTable({ data }: { data: DashboardData }) {
  const now = Date.now()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Purchases</CardTitle>
        <CardDescription>
          {formatCurrency(data.purchases.totalThisMonth)} received this month ·{' '}
          {data.purchases.pendingCount} pending
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.purchases.recent.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No purchases yet
                </TableCell>
              </TableRow>
            )}
            {data.purchases.recent.map((p) => {
              const ageDays = Math.floor((now - p.createdAt) / (1000 * 60 * 60 * 24))
              const stale = p.status === 'pending' && ageDays >= 3

              return (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.storeName}</TableCell>
                  <TableCell>{p.supplierName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTs(p.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={stale ? 'destructive' : 'outline'}>
                      {ageDays === 0 ? 'Today' : `${ageDays}d`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.totalAmount)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Activity ─────────────────────────────────────────────────────────────────

function ActivityTable({ data }: { data: DashboardData }) {
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const roles = Array.from(new Set(data.activityFeed.map((l) => l.role)))
  const filtered = data.activityFeed.filter(
    (l) => roleFilter === 'all' || l.role === roleFilter
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Last 10 actions across the system</CardDescription>
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No activity yet
                </TableCell>
              </TableRow>
            )}
            {filtered.map((log) => (
              <TableRow key={log._id}>
                <TableCell className="font-medium">{log.userName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.role}</Badge>
                </TableCell>
                <TableCell>{humanizeAction(log.action)}</TableCell>
                <TableCell className="max-w-60 truncate text-muted-foreground">
                  {log.description ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTs(log.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function DashboardTables({ data, isGlobal, activeTab }: DashboardTablesProps) {
  if (activeTab === 'sales') return <SalesTable data={data} isGlobal={isGlobal} />
  if (activeTab === 'stock') return <StockTable data={data} isGlobal={isGlobal} />
  if (activeTab === 'stores' && isGlobal) return <StoresTable data={data} />
  if (activeTab === 'transfers' && isGlobal) return <TransfersTable data={data} />
  if (activeTab === 'purchases' && isGlobal) return <PurchasesTable data={data} />
  if (activeTab === 'activity' && isGlobal) return <ActivityTable data={data} />
  return null
}