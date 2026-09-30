import { useMemo, useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { CardActionsMenu } from '#/components/general/card-actions-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    RotateCcw,
    Search,
    X,
    XCircle,
    ChevronDown,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Ban,
    CalendarRange,
} from 'lucide-react'
import type { Id } from '#/types/entities'
import type { Sale } from '#/types/sales'
import { formatCurrency, formatTimestamp, getStatusVariant, startOfDay, endOfDay } from './sales-utils'

interface SalesTableProps {
    sales: Sale[]
    isLoading: boolean
    isGlobal: boolean
    canAction: boolean
    canVoid: boolean
    onSelectSale: (id: Id<'sales'>) => void
    onVoid: (id: Id<'sales'>) => void
    onRefund: (id: Id<'sales'>) => void
    onCancel: (id: Id<'sales'>) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
    if (sorted === 'asc') return <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
    return <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
}

function getSalePaymentMethods(sale: Sale): string[] {
    if (sale.paymentSplits) {
        try {
            const splits = JSON.parse(sale.paymentSplits)
            return splits.map((s: { method: string }) => s.method)
        } catch {
            // fall through
        }
    }
    if (sale.paymentMethod) {
        return sale.paymentMethod.split(' + ').map((m: string) => m.trim())
    }
    return ['Unknown']
}

// Helper to get product name from a sale item
function getProductName(item: any): string {
    if (item.product?.name) {
        return item.product.name
    }
    if (item.productName) {
        return item.productName
    }
    return 'Unknown Product'
}

// Below `md` the table is replaced by cards. The columns are declared with
// function `header`s (they render sort buttons), so the card labels are listed
// explicitly here instead of being read off the column defs.
const SALES_CARD_FIELDS: { id: string; label: string }[] = [    { id: 'status', label: 'Status' },
    { id: 'store', label: 'Store' },
    { id: 'departments', label: 'Department' },
    { id: 'paymentMethod', label: 'Payment' },
    { id: 'createdAt', label: 'Date' },
    { id: 'totalAmount', label: 'Total' },
]

export function SalesTable({
    sales,
    isLoading,
    isGlobal,
    canAction,
    canVoid,
    onSelectSale,
    onVoid,
    onRefund,
    onCancel,
}: SalesTableProps) {
    const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
    const [pageSize, setPageSize] = useState(10)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const allDepartments = useMemo(() => {
        const set = new Set<string>()
        sales.forEach(s => s.departments?.forEach(d => set.add(d)))
        return [...set].sort()
    }, [sales])

    const allPaymentMethods = useMemo(() => {
        const set = new Set<string>()
        sales.forEach(s => getSalePaymentMethods(s).forEach(m => set.add(m)))
        return [...set].sort()
    }, [sales])

    const dateFromTs = useMemo(() => (dateFrom ? startOfDay(new Date(dateFrom)) : undefined), [dateFrom])
    const dateToTs = useMemo(() => (dateTo ? endOfDay(new Date(dateTo)) : undefined), [dateTo])

    const filteredSales = useMemo(() => {
        let rows = sales

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            rows = rows.filter(s => {
                // Search in products from items
                const productMatch = s.items?.some(item => {
                    const name = getProductName(item)
                    return name.toLowerCase().includes(q)
                }) ?? false

                // Search in store name
                const storeMatch = (s.store?.name ?? '').toLowerCase().includes(q)

                return productMatch || storeMatch
            })
        }

        if (selectedDepartments.length > 0) {
            rows = rows.filter(s =>
                s.departments?.some(d => selectedDepartments.includes(d))
            )
        }

        if (selectedPaymentMethods.length > 0) {
            rows = rows.filter(s =>
                getSalePaymentMethods(s).some(m => selectedPaymentMethods.includes(m))
            )
        }

        if (dateFromTs !== undefined) {
            rows = rows.filter(s => s.createdAt >= dateFromTs)
        }

        if (dateToTs !== undefined) {
            rows = rows.filter(s => s.createdAt <= dateToTs)
        }

        return rows
    }, [sales, searchQuery, selectedDepartments, selectedPaymentMethods, dateFromTs, dateToTs])

    const showActionsCol = canAction || canVoid

    const columns = useMemo<ColumnDef<Sale>[]>(() => {
        const cols: ColumnDef<Sale>[] = []

        if (isGlobal) {
            cols.push({
                id: 'store',
                accessorFn: row => row.store?.name ?? 'Unknown',
                header: ({ column }) => (
                    <button className="flex items-center font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Store <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ getValue }) => <span>{getValue() as string}</span>,
            })
        }

        cols.push(
            {
                id: 'products',
                accessorFn: row => {
                    if (!row.items || row.items.length === 0) return ''
                    return row.items.map(item => getProductName(item)).join(', ')
                },
                header: ({ column }) => (
                    <button className="flex items-center font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Products <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ row }) => {
                    const sale = row.original
                    const items = sale.items || []

                    if (items.length === 0) {
                        return <span className="text-muted-foreground">No products</span>
                    }

                    return (
                        <div className="flex flex-col gap-0.5">
                            {items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex items-center gap-1 text-sm">
                                    <span>{getProductName(item)}</span>
                                    <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                                </div>
                            ))}
                            {items.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                    +{items.length - 3} more products
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground mt-0.5">
                                {items.reduce((sum, item) => sum + item.quantity, 0)} items total
                            </span>
                        </div>
                    )
                },
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const sale = row.original
                    return (
                        <Badge variant={getStatusVariant(sale.status)}>
                            {sale.status}
                            {sale.status === 'cancelled' && sale.cancelledReason && (
                                <span className="ml-1 text-xs opacity-75">({sale.cancelledReason})</span>
                            )}
                        </Badge>
                    )
                },
                filterFn: (row, _id, filterValue) => row.original.status === filterValue,
            },
            {
                id: 'departments',
                accessorFn: row => (row.departments ?? []).join(', '),
                header: 'Department',
                cell: ({ row }) => {
                    const depts = row.original.departments ?? []
                    if (depts.length === 0) return <span className="text-muted-foreground">—</span>
                    return (
                        <div className="flex flex-wrap gap-1">
                            {depts.map(d => (
                                <Badge key={d} variant="outline" className="text-xs font-normal">{d}</Badge>
                            ))}
                        </div>
                    )
                },
            },
            {
                id: 'paymentMethod',
                accessorFn: row => getSalePaymentMethods(row).join(', '),
                header: 'Payment',
                cell: ({ row }) => {
                    const methods = getSalePaymentMethods(row.original)
                    return (
                        <div className="flex flex-wrap gap-1">
                            {methods.map(m => (
                                <Badge key={m} variant="secondary" className="text-xs font-normal">{m}</Badge>
                            ))}
                        </div>
                    )
                },
            },
            {
                id: 'createdAt',
                accessorKey: 'createdAt',
                header: ({ column }) => (
                    <button className="flex items-center font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Date <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ row }) => {
                    const sale = row.original
                    return (
                        <span className="text-muted-foreground text-sm">
                            {sale.status === 'cancelled' && sale.cancelledAt
                                ? formatTimestamp(sale.cancelledAt) + ' (cancelled)'
                                : formatTimestamp(sale.createdAt)}
                        </span>
                    )
                },
            },
            {
                id: 'totalAmount',
                accessorKey: 'totalAmount',
                header: ({ column }) => (
                    <button className="flex items-center justify-end w-full font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        Total <SortIcon sorted={column.getIsSorted()} />
                    </button>
                ),
                cell: ({ getValue }) => (
                    <div className="text-right font-medium">{formatCurrency(getValue() as number)}</div>
                ),
            }
        )

        if (showActionsCol) {
            cols.push({
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const sale = row.original
                    if (sale.status !== 'completed') {
                        return (
                            <div className="flex justify-end">
                                <span className="text-xs text-muted-foreground capitalize px-1">{sale.status}</span>
                            </div>
                        )
                    }
                    return (
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {canVoid && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-orange-500/10 hover:text-orange-500"
                                    title="Void Sale"
                                    onClick={() => onVoid(sale._id)}
                                >
                                    <Ban className="h-4 w-4" />
                                </Button>
                            )}
                            {canAction && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                        title="Cancel Sale"
                                        onClick={() => onCancel(sale._id)}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                        title="Refund"
                                        onClick={() => onRefund(sale._id)}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    )
                },
            })
        }

        return cols
    }, [isGlobal, canAction, canVoid, showActionsCol, onVoid, onCancel, onRefund])

    const table = useReactTable({
        data: filteredSales,
        columns,
        state: {
            sorting,
            columnFilters,
            pagination: { pageIndex: 0, pageSize },
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: true,
    })

    const hasActiveFilters =
        !!searchQuery ||
        selectedDepartments.length > 0 ||
        selectedPaymentMethods.length > 0 ||
        columnFilters.length > 0 ||
        !!dateFrom ||
        !!dateTo

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedDepartments([])
        setSelectedPaymentMethods([])
        setColumnFilters([])
        setDateFrom('')
        setDateTo('')
    }

    const { rows } = table.getRowModel()
    const totalFiltered = filteredSales.length
    const pageIndex = table.getState().pagination.pageIndex
    const startIndex = pageIndex * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalFiltered)

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4 p-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products or store…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 pr-8"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost" size="icon"
                            className="absolute right-1 top-1 h-7 w-7"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <Select
                    value={(columnFilters.find(f => f.id === 'status')?.value as string) ?? 'all'}
                    onValueChange={val => {
                        setColumnFilters(prev => {
                            const rest = prev.filter(f => f.id !== 'status')
                            return val === 'all' ? rest : [...rest, { id: 'status', value: val }]
                        })
                    }}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="voided">Voided</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                {allDepartments.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1">
                                Department
                                {selectedDepartments.length > 0 && (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedDepartments.length}
                                    </Badge>
                                )}
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            {allDepartments.map(dept => (
                                <DropdownMenuCheckboxItem
                                    key={dept}
                                    checked={selectedDepartments.includes(dept)}
                                    onCheckedChange={() =>
                                        setSelectedDepartments(prev =>
                                            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
                                        )
                                    }
                                >
                                    {dept}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {allPaymentMethods.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1">
                                Payment
                                {selectedPaymentMethods.length > 0 && (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedPaymentMethods.length}
                                    </Badge>
                                )}
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            {allPaymentMethods.map(method => (
                                <DropdownMenuCheckboxItem
                                    key={method}
                                    checked={selectedPaymentMethods.includes(method)}
                                    onCheckedChange={() =>
                                        setSelectedPaymentMethods(prev =>
                                            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
                                        )
                                    }
                                >
                                    {method}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <div className="flex items-center gap-1.5">
                    <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="h-9 w-36"
                        aria-label="From date"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="h-9 w-36"
                        aria-label="To date"
                    />
                </div>

                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                        <X className="mr-1.5 h-3.5 w-3.5" /> Clear
                    </Button>
                )}

                <span className="ml-auto text-sm text-muted-foreground">
                    {totalFiltered} result{totalFiltered !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Mobile: cards. Eight columns cannot be read by scrolling sideways. */}
            <div className="grid gap-2 md:hidden">
                {rows.length === 0 ? (
                    <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
                        {hasActiveFilters ? 'No sales match your filters' : 'No sales found'}
                    </div>
                ) : (
                    rows.map(row => {
                        const cells = row.getVisibleCells()
                        const render = (id: string) => {
                            const cell = cells.find(c => c.column.id === id)
                            return cell
                                ? flexRender(cell.column.columnDef.cell, cell.getContext())
                                : null
                        }

                        return (
                            <div key={row.id} className="rounded-lg border bg-card">
                                <div className="flex items-start gap-2 border-b px-3 py-2.5">
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 text-left text-sm font-medium"
                                        onClick={() => onSelectSale(row.original._id)}
                                    >
                                        {render('products')}
                                    </button>
                                    {/* Void / Cancel / Refund are three icon buttons in a
                                        row — too wide for a phone card, so they fold into
                                        one ⋯ menu. Credited rows show their status among
                                        the fields below instead. */}
                                    {showActionsCol &&
                                        row.original.status === 'completed' &&
                                        (canVoid || canAction) && (
                                            <div className="shrink-0">
                                                <CardActionsMenu>
                                                    {render('actions')}
                                                </CardActionsMenu>
                                            </div>
                                        )}
                                </div>
                                <dl className="divide-y">
                                    {SALES_CARD_FIELDS.map(field => (
                                        <div
                                            key={field.id}
                                            className="flex items-start justify-between gap-4 px-3 py-2"
                                        >
                                            <dt className="shrink-0 text-xs text-muted-foreground">
                                                {field.label}
                                            </dt>
                                            <dd className="min-w-0 break-words text-right text-sm">
                                                {render(field.id)}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Table — md and up */}
            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                                    {hasActiveFilters ? 'No sales match your filters' : 'No sales found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => onSelectSale(row.original._id)}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalFiltered > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}–{endIndex} of {totalFiltered}
                    </span>
                    <div className="flex items-center gap-2">
                        <Select
                            value={String(pageSize)}
                            onValueChange={val => {
                                setPageSize(Number(val))
                                table.setPageSize(Number(val))
                            }}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-3 text-sm">Page {pageIndex + 1} of {table.getPageCount() || 1}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}