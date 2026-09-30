import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Info, Pencil, MoreHorizontal, Store as StoreIcon, Users, Link } from 'lucide-react'
import type { DepartmentWithStoreCount, Store } from '#/types/departments'
import { formatDate } from './department-utils'

interface DepartmentTableProps {
    data?: DepartmentWithStoreCount[]
    isLoading: boolean
    onViewDetails: (department: DepartmentWithStoreCount) => void
    onEdit: (department: DepartmentWithStoreCount) => void
    onStoreAssignment: (department: DepartmentWithStoreCount) => void
}

export function DepartmentTable({
    data,
    isLoading,
    onViewDetails,
    onEdit,
    onStoreAssignment,
}: DepartmentTableProps) {
    const columns: ColumnDef<DepartmentWithStoreCount>[] = [
        {
            key: 'name',
            header: 'Department Name',
            searchable: true,
        },
        {
            key: 'description',
            header: 'Description',
            cell: (row) => (
                <span className="text-muted-foreground">{row.description || 'No description'}</span>
            ),
        },
        {
            key: 'stores',
            header: 'Stores & Employees',
            cell: (row) => {
                const storeCount = row.storeCount || 0
                const employeeCount = row.employeeCount || 0
                const storeNames = row.stores?.map((s: Store) => s.name).join(', ') || ''
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                                <StoreIcon className="h-3 w-3 mr-1" />
                                {storeCount} {storeCount === 1 ? 'Store' : 'Stores'}
                            </Badge>
                            {employeeCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {employeeCount} {employeeCount === 1 ? 'Employee' : 'Employees'}
                                </Badge>
                            )}
                        </div>
                        {storeCount > 0 && (
                            <span className="text-xs text-muted-foreground truncate max-w-50">
                                {storeNames}
                            </span>
                        )}
                    </div>
                )
            },
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
                            onClick={() => onStoreAssignment(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Link className="h-4 w-4" />
                            Manage Store Assignments
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onEdit(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Department
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
            searchPlaceholder="Search departments..."
            emptyMessage="No departments found"
        />
    )
}