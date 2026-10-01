import { useState, useMemo, useEffect, useId } from 'react'
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Columns3, GripVertical,
} from 'lucide-react'
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type UniqueIdentifier, 
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '#/components/ui/select'
import {
    DropdownMenu, DropdownMenuCheckboxItem,
    DropdownMenuContent, DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
    Drawer, DrawerClose, DrawerContent, DrawerDescription,
    DrawerFooter, DrawerHeader, DrawerTitle,
} from '#/components/ui/drawer'
import { Skeleton } from '#/components/ui/skeleton'
import { CardActionsMenu } from '#/components/general/card-actions-menu'
import { cn } from '#/lib/utils'

// ── Column definition ─────────────────────────────────────────────────────────
export interface ColumnDef<T> {
    key: string
    header: string
    /** render cell content. row = the data row, value = row[key] */
    cell?: (row: T, value: unknown) => React.ReactNode
    /** set to false to prevent this column from being searched */
    searchable?: boolean
    /**
     * Value used for the text search when `row[key]` isn't a plain scalar.
     * Columns whose key holds an object (e.g. `product`, `customer`) stringify
     * to "[object Object]" and could never match a search term without this.
     */
    accessor?: (row: T) => unknown
    /** extra className for the <td> */
    className?: string
    /** extra className for the <th> */
    headerClassName?: string
    /** set to false to prevent this column from being hidden via the column-visibility menu (default true = hideable) */
    hideable?: boolean
    /**
     * Hide this column in the mobile card view (< 768px). Use it for incidental
     * columns — row numbers, raw ids — that only add noise on a phone.
     */
    mobileHidden?: boolean
    /** Label shown in the mobile card view. Defaults to `header`. */
    mobileLabel?: string
    /**
     * Marks this column as the row's actions. In the mobile card view it moves to
     * the card header instead of becoming a labelled row, so the card reads like
     * a record with a ⋯ in the corner. A column keyed `actions` is treated as the
     * actions column automatically.
     *
     * - `'hoist'` (default) — render the cell as-is; right for cells that already
     *   render a single ⋯ menu.
     * - `'group'` — collect the cell's buttons into one ⋯ dropdown; right for
     *   cells that render several inline buttons, which are unusable on a phone.
     */
    mobileActions?: 'hoist' | 'group'
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DataTableProps<T extends Record<string, unknown>> {
    data: T[] | undefined
    columns: ColumnDef<T>[]
    /** unique key field for React's key prop */
    rowKey: keyof T
    /** slot rendered at the end of each row (e.g. <UserActions />) */
    rowActions?: (row: T) => React.ReactNode
    /** slot rendered above the search bar (e.g. filters, extra buttons) */
    toolbar?: React.ReactNode
    /** placeholder for the search input */
    searchPlaceholder?: string
    /** rows per page options */
    pageSizeOptions?: number[]
    /** default rows per page */
    defaultPageSize?: number
    /** shown when no rows match */
    emptyMessage?: string
    loading?: boolean
    className?: string

    /** show the "Columns" dropdown to toggle column visibility */
    enableColumnVisibility?: boolean

    /**
     * enable drag-to-reorder rows. Reordering only works within the
     * current page and only while no search filter is active (reordering
     * a filtered/paginated subset can't map cleanly back to a stable full
     * order). The handle is disabled with a tooltip in those states.
     */
    enableDragReorder?: boolean
    /** called with the full, newly-ordered array after a drag completes */
    onReorder?: (newData: T[]) => void

    /**
     * if provided, the column identified by `drawerTriggerKey` (or the
     * first column, if omitted) becomes clickable and opens a slide-out
     * Drawer rendering whatever this function returns for that row.
     */
    renderDrawer?: (row: T) => React.ReactNode
    drawerTriggerKey?: string
    drawerTitle?: (row: T) => React.ReactNode
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                    {[...Array(cols)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full max-w-30" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}

// ── Skeleton cards (mobile) ───────────────────────────────────────────────────
function CardSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="rounded-lg border p-3">
                    <Skeleton className="h-4 w-1/2" />
                    <div className="mt-3 space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </>
    )
}

// ── Drag handle cell ──────────────────────────────────────────────────────────
function DragHandle({ id, disabled }: { id: UniqueIdentifier; disabled?: boolean }) {
    const { attributes, listeners } = useSortable({ id, disabled })

    return (
        <Button
            {...(disabled ? {} : attributes)}
            {...(disabled ? {} : listeners)}
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="size-7 text-muted-foreground hover:bg-transparent cursor-grab disabled:cursor-not-allowed disabled:opacity-30"
            title={disabled ? 'Clear search to reorder rows' : 'Drag to reorder'}
        >
            <GripVertical className="size-3.5" />
            <span className="sr-only">Drag to reorder</span>
        </Button>
    )
}

// ── Draggable row wrapper ─────────────────────────────────────────────────────
function DraggableRow({
    id,
    children,
}: {
    id: UniqueIdentifier
    children: React.ReactNode
}) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({ id })

    return (
        <tr
            ref={setNodeRef}
            data-dragging={isDragging}
            className={cn(
                'border-b last:border-0 hover:bg-muted/30 transition-colors relative',
                isDragging && 'z-10 opacity-80 bg-muted/40'
            )}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            {children}
        </tr>
    )
}

// ── Draggable card wrapper (mobile) ──────────────────────────────────────────
function DraggableCard({
    id,
    children,
}: {
    id: UniqueIdentifier
    children: React.ReactNode
}) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({ id })

    return (
        <div
            ref={setNodeRef}
            data-dragging={isDragging}
            className={cn('relative', isDragging && 'z-10 opacity-80')}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            {children}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    rowKey,
    rowActions,
    toolbar,
    searchPlaceholder = 'Search…',
    pageSizeOptions = [10, 25, 50],
    defaultPageSize = 10,
    emptyMessage = 'No results found.',
    loading = false,
    className,
    enableColumnVisibility = false,
    enableDragReorder = false,
    onReorder,
    renderDrawer,
    drawerTriggerKey,
    drawerTitle,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(defaultPageSize)
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
    const [orderedData, setOrderedData] = useState<T[]>(data ?? [])
    const [drawerRow, setDrawerRow] = useState<T | null>(null)

    const sortableId = useId()
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    // Keep our local ordering copy in sync whenever the parent's data
    // changes (new fetch, mutation result, etc), but don't fight the
    // user mid-drag — this just re-syncs on every prop change, which is
    // fine since reordering is a discrete, completed action per drag.
    useEffect(() => {
        setOrderedData(data ?? [])
    }, [data])

    const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.key))
    const searchableCols = columns.filter((c) => c.searchable !== false)

    // ── filter ──────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!search.trim()) return orderedData
        const q = search.toLowerCase()
        return orderedData.filter((row) =>
            searchableCols.some((col) => {
                const val = col.accessor ? col.accessor(row) : row[col.key]
                return String(val ?? '').toLowerCase().includes(q)
            })
        )
    }, [orderedData, search, searchableCols])

    const isFiltered = search.trim().length > 0
    const dragDisabled = !enableDragReorder || isFiltered || loading

    // ── reset to page 1 on search ───────────────────────────────────────────────
    const handleSearch = (v: string) => {
        setSearch(v)
        setPage(1)
    }

    // ── pagination ───────────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const pageRows = filtered.slice(start, start + pageSize)
    const pageRowIds = useMemo(
        () => pageRows.map((row) => String(row[rowKey]) as UniqueIdentifier),
        [pageRows, rowKey]
    )

    // ── drag end: reorder within the current page, then splice that
    // reordered slice back into the full array and notify the parent ──────────
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!active || !over || active.id === over.id) return

        const oldIndex = pageRowIds.indexOf(active.id)
        const newIndex = pageRowIds.indexOf(over.id)
        if (oldIndex === -1 || newIndex === -1) return

        const reorderedPage = arrayMove(pageRows, oldIndex, newIndex)

        const newFullData = [...orderedData]
        newFullData.splice(start, reorderedPage.length, ...reorderedPage)

        setOrderedData(newFullData)
        onReorder?.(newFullData)
    }

    // ── drawer trigger resolution ──────────────────────────────────────────────
    const triggerKey = drawerTriggerKey ?? columns[0]?.key

    function renderCell(col: ColumnDef<T>, row: T) {
        const value = row[col.key]
        const content = col.cell ? col.cell(row, value) : String(value ?? '—')

        if (renderDrawer && col.key === triggerKey) {
            return (
                <Button
                    variant="link"
                    className="w-fit px-0 text-left text-foreground h-auto"
                    onClick={() => setDrawerRow(row)}
                >
                    {content}
                </Button>
            )
        }

        return content
    }

    // ── mobile card view ───────────────────────────────────────────────────────
    // A five-column table forces a sideways scroll on a phone, where you can only
    // ever see one or two columns at a time. Below md each row becomes a card:
    // the trigger column (or the first one) is the title, the rest are labelled
    // key/value rows. Set `mobileHidden` on a column to drop it from the card.
    const actionsCol = visibleColumns.find((c) => c.mobileActions || c.key === 'actions')
    const mobileColumns = visibleColumns.filter(
        (c) => c !== actionsCol && !c.mobileHidden
    )

    /**
     * The actions column, folded into one ⋯ menu.
     *
     * These cells render bare buttons (Ship / Receive / Cancel, edit / add /
     * remove), which sit in a row and overflow a phone. `CardActionsMenu`
     * restyles them into full-width rows.
     */
    function renderGroupedActions(col: ColumnDef<T>, row: T) {
        return (
            <CardActionsMenu>{col.cell ? col.cell(row, row[col.key]) : null}</CardActionsMenu>
        )
    }

    function renderCardTitle(row: T) {
        const primary = visibleColumns.find((c) => c.key === triggerKey) ?? visibleColumns[0]
        const content = primary
            ? primary.cell
                ? primary.cell(row, row[primary.key])
                : String(row[primary.key] ?? '')
            : String(row[rowKey] ?? '')

        if (!renderDrawer) return content

        return (
            <button
                type="button"
                onClick={() => setDrawerRow(row)}
                className="flex w-full items-center gap-1.5 text-left"
            >
                <span className="min-w-0 flex-1">{content}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
        )
    }

    const colCount =
        visibleColumns.length +
        (rowActions ? 1 : 0) +
        (enableDragReorder ? 1 : 0)

    return (
        <div className={cn('space-y-3', className)}>
            {/* toolbar row */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {enableColumnVisibility && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                <Columns3 className="size-3.5" />
                                <span className="hidden sm:inline">Columns</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {columns
                                .filter((c) => c.hideable !== false)
                                .map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.key}
                                        className="capitalize"
                                        checked={!hiddenColumns.has(col.key)}
                                        onCheckedChange={(checked) => {
                                            setHiddenColumns((prev) => {
                                                const next = new Set(prev)
                                                if (checked) next.delete(col.key)
                                                else next.add(col.key)
                                                return next
                                            })
                                        }}
                                    >
                                        {col.header}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {toolbar && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbar}</div>}
            </div>

            {isFiltered && enableDragReorder && (
                <p className="text-xs text-muted-foreground -mt-1">
                    Clear the search to drag-and-drop reorder rows.
                </p>
            )}

            {/* table — md and up */}
            <div className="hidden rounded-lg border overflow-x-auto md:block">
                <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                    id={sortableId}
                >
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                {enableDragReorder && <th className="px-2 py-3 w-8" />}
                                {visibleColumns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide',
                                            col.headerClassName
                                        )}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                {rowActions && <th className="px-4 py-3 w-10" />}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton
                                    rows={pageSize > 10 ? 8 : 5}
                                    cols={colCount}
                                />
                            ) : pageRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={colCount}
                                        className="px-4 py-10 text-center text-muted-foreground text-sm"
                                    >
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                <SortableContext
                                    items={pageRowIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {pageRows.map((row) => {
                                        const id = String(row[rowKey]) as UniqueIdentifier
                                        return (
                                            <DraggableRow key={id} id={id}>
                                                {enableDragReorder && (
                                                    <td className="px-2 py-3">
                                                        <DragHandle id={id} disabled={dragDisabled} />
                                                    </td>
                                                )}
                                                {visibleColumns.map((col) => (
                                                    <td
                                                        key={col.key}
                                                        className={cn('px-4 py-3', col.className)}
                                                    >
                                                        {renderCell(col, row)}
                                                    </td>
                                                ))}
                                                {rowActions && (
                                                    <td className="px-4 py-3">{rowActions(row)}</td>
                                                )}
                                            </DraggableRow>
                                        )
                                    })}
                                </SortableContext>
                            )}
                        </tbody>
                    </table>
                </DndContext>
            </div>

            {/* cards — below md */}
            <div className="grid gap-2 md:hidden">
                {loading ? (
                    <CardSkeleton rows={3} />
                ) : pageRows.length === 0 ? (
                    <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    <SortableContext
                        items={pageRowIds}
                        strategy={verticalListSortingStrategy}
                    >
                        {pageRows.map((row) => {
                            const id = String(row[rowKey]) as UniqueIdentifier
                            return (
                                <DraggableCard key={id} id={id}>
                                    <div className="rounded-lg border bg-card">
                                        <div className="flex items-start gap-2 border-b px-3 py-2.5">
                                            {enableDragReorder && (
                                                <DragHandle id={id} disabled={dragDisabled} />
                                            )}
                                            <div className="min-w-0 flex-1 text-sm font-medium">
                                                {renderCardTitle(row)}
                                            </div>
                                            {rowActions && (
                                                <div className="shrink-0">{rowActions(row)}</div>
                                            )}
                                            {actionsCol && !actionsCol.mobileHidden && (
                                                <div className="shrink-0">
                                                    {actionsCol.mobileActions === 'group'
                                                        ? renderGroupedActions(actionsCol, row)
                                                        : actionsCol.cell
                                                            ? actionsCol.cell(row, row[actionsCol.key])
                                                            : null}
                                                </div>
                                            )}
                                        </div>

                                        {mobileColumns.length > 0 && (
                                            <dl className="divide-y">
                                                {mobileColumns.map((col) => (
                                                    <div
                                                        key={col.key}
                                                        className="flex items-start justify-between gap-4 px-3 py-2"
                                                    >
                                                        <dt className="shrink-0 text-xs text-muted-foreground">
                                                            {col.mobileLabel ?? col.header}
                                                        </dt>
                                                        <dd
                                                            className={cn(
                                                                'min-w-0 wrap-break-word text-right text-sm',
                                                                col.className
                                                            )}
                                                        >
                                                            {col.cell
                                                                ? col.cell(row, row[col.key])
                                                                : String(row[col.key] ?? '—')}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                    </div>
                                </DraggableCard>
                            )
                        })}
                    </SortableContext>
                )}
            </div>

            {/* pagination footer */}
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                    {loading
                        ? 'Loading…'
                        : `${filtered.length === 0 ? 0 : start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} row${filtered.length !== 1 ? 's' : ''}`}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Rows</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}
                        >
                            <SelectTrigger className="h-7 w-16 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline" size="icon"
                            className="size-7"
                            disabled={safePage === 1}
                            onClick={() => setPage(1)}
                        >
                            <ChevronsLeft className="size-3.5" />
                        </Button>
                        <Button
                            variant="outline" size="icon"
                            className="size-7"
                            disabled={safePage === 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="size-3.5" />
                        </Button>
                        <span className="px-2 text-xs text-muted-foreground">
                            {safePage} / {totalPages}
                        </span>
                        <Button
                            variant="outline" size="icon"
                            className="size-7"
                            disabled={safePage === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight className="size-3.5" />
                        </Button>
                        <Button
                            variant="outline" size="icon"
                            className="size-7"
                            disabled={safePage === totalPages}
                            onClick={() => setPage(totalPages)}
                        >
                            <ChevronsRight className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* row-detail drawer */}
            {renderDrawer && (
                <Drawer
                    open={drawerRow !== null}
                    onOpenChange={(open: any) => !open && setDrawerRow(null)}
                >
                    <DrawerContent>
                        {drawerRow && (
                            <>
                                <DrawerHeader className="gap-1">
                                    <DrawerTitle>
                                        {drawerTitle ? drawerTitle(drawerRow) : String(drawerRow[triggerKey] ?? '')}
                                    </DrawerTitle>
                                    <DrawerDescription className="sr-only">
                                        Row details
                                    </DrawerDescription>
                                </DrawerHeader>
                                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                                    {renderDrawer(drawerRow)}
                                </div>
                                <DrawerFooter>
                                    <DrawerClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </>
                        )}
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    )
}