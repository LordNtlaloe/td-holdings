import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { FolderTree, Info, Pencil, MoreHorizontal, Package } from 'lucide-react'
import type { CategoryWithDepartment, Department } from '#/types/categories'
import { formatDate, getDepartmentName } from './category-utils'

interface CategoryTableProps {
    data?: CategoryWithDepartment[]
    departments?: Department[]
    isLoading: boolean
    onViewDetails: (category: CategoryWithDepartment) => void
    onEdit: (category: CategoryWithDepartment) => void
}

export function CategoryTable({
    data,
    departments,
    isLoading,
    onViewDetails,
    onEdit,
}: CategoryTableProps) {
    const columns: ColumnDef<CategoryWithDepartment>[] = [
        {
            key: 'name',
            header: 'Category Name',
            searchable: true,
        },
        {
            key: 'department',
            header: 'Department',
            // `row.department` is an object — search needs an explicit accessor.
            accessor: (row) =>
                row.department?.name || getDepartmentName(row.departmentId, departments),
            cell: (row) => (
                <span className="flex items-center gap-1">
                    <FolderTree className="h-3 w-3 text-muted-foreground" />
                    {row.department?.name || getDepartmentName(row.departmentId, departments)}
                </span>
            ),
        },
        {
            key: 'description',
            header: 'Description',
            cell: (row) => (
                <span className="text-muted-foreground">{row.description || 'No description'}</span>
            ),
        },
        {
            key: 'productCount',
            header: 'Products',
            cell: (row) => (
                <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {row.productCount || 0}
                </Badge>
            ),
        },
        {
            key: 'createdAt',
            header: 'Created',
            cell: (row) => (
                <span className="text-muted-foreground text-xs">
                    {formatDate(row._creationTime)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => onViewDetails(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Info className="h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onEdit(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Category
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ]

    return (
        <DataTable
            data={data as any}
            columns={columns as any}
            rowKey="_id"
            loading={isLoading}
            searchPlaceholder="Search categories..."
            emptyMessage="No categories found"
        />
    )
}