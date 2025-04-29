"use client"

import * as React from "react"
import { Head, Link, usePage } from "@inertiajs/react"
import { type BreadcrumbItem } from "@/types"
import AppLayout from "@/layouts/app-layout"
import OrdersLayout from "@/layouts/orders/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ColumnDef,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, MoreHorizontal, EyeIcon } from "lucide-react"
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const breadcrumbs: BreadcrumbItem[] = [{ title: "Orders", href: "/orders" }]

type Order = {
    id: number
    total_amount: number
    status: string
    order_date: string
    items_count: number
    branch: {
        branch_name: string
    }
    cashier: {
        name: string
    }
}

export default function OrdersIndex() {
    const { orders } = usePage<{ orders: Order[] }>().props
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [globalFilter, setGlobalFilter] = React.useState("")

    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "id",
            header: "Order #",
            cell: ({ row }) => `#${row.original.id}`,
        },
        {
            accessorKey: "order_date",
            header: "Date",
            cell: ({ row }) => format(new Date(row.original.order_date), 'MMM dd, yyyy HH:mm'),
        },
        {
            accessorKey: "branch.branch_name",
            header: "Branch",
            cell: ({ row }) => row.original.branch.branch_name,
        },
        {
            accessorKey: "cashier.name",
            header: "Cashier",
            cell: ({ row }) => row.original.cashier.name,
        },
        {
            accessorKey: "items_count",
            header: "Items",
            cell: ({ row }) => (
                <Badge variant="outline">
                    {row.original.items_count} items
                </Badge>
            ),
        },
        {
            accessorKey: "total_amount",
            header: "Total",
            cell: ({ row }) => `M${row.original.total_amount.toFixed(2)}`,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge
                    variant={
                        row.original.status === 'completed' ? 'default' :
                            row.original.status === 'pending' ? 'secondary' :
                                'destructive'
                    }
                    className={row.original.status === 'completed' ? 'bg-green-400 text-green-800' :
                            row.original.status === 'pending' ? 'bg-yellow-400 text-yellow-600' :
                            'bg-red-400 text-red-700'
                    }
                >
                    {row.original.status}
                </Badge>
            ),
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/orders/${row.original.id}`}>
                                <EyeIcon className="h-4 w-4 mr-2" /> View
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    const table = useReactTable({
        data: orders || [],
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnVisibility,
            globalFilter,
        },
    })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales/Orders" />
            <OrdersLayout>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Input
                            className="w-1/4"
                            placeholder="Search orders..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table.getAllColumns().map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="text-center">
                                            No orders found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </OrdersLayout>
        </AppLayout>
    )
}