"use client"

import * as React from "react"
import { Head, Link, usePage } from "@inertiajs/react"
import { type BreadcrumbItem } from "@/types"
import AppLayout from "@/layouts/app-layout"
import ProductsLayout from "@/layouts/products/layout"
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
import { ChevronDown, MoreHorizontal, PenIcon, Trash2Icon } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const breadcrumbs: BreadcrumbItem[] = [{ title: "Products", href: "/products" }]

type Product = {
    id: number
    product_name: string
    product_price: number
    product_quantity: number
    product_category: string
    product_commodity: string
    product_grade: string
    branch: { branch_location: string }
}

export default function Products() {
    const { filtered_products } = usePage<{ filtered_products: Product[] }>().props
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [globalFilter, setGlobalFilter] = React.useState("")

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: "id",
            header: "ID",
        },
        {
            accessorKey: "product_name",
            header: "Product Name",
        },
        {
            accessorKey: "product_price",
            header: "Price",
        },
        {
            accessorKey: "product_quantity",
            header: "Quantity",
        },
        {
            accessorKey: "product_category",
            header: "Category",
        },
        {
            accessorKey: "product_commodity",
            header: "Commodity",
        },
        {
            accessorKey: "product_grade",
            header: "Grade",
        },
        {
            accessorKey: "branch.branch_location",
            header: "Location",
            cell: ({ row }) => row.original.branch.branch_location,
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/products/${row.original.id}/edit`}>
                                <PenIcon className="h-4 w-4 mr-2" /> Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Trash2Icon className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    const table = useReactTable({
        data: filtered_products,
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
            <Head title="Products" />
            <ProductsLayout>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Input
                            className="w-1/4"
                            placeholder="Search Products..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex flex-row gap-x-5">
                                    <Button variant="outline" className="ml-auto">
                                        Columns <ChevronDown />
                                    </Button>
                                    <Link href={route('products.create')} className="cursor-pointer">
                                        <Button className="cursor-pointer" variant="secondary">Add New Product</Button>
                                    </Link>
                                </div>
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
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="text-center">
                                            No products found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ProductsLayout>
        </AppLayout>
    )
}
