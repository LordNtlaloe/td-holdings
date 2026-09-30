import { DataTable, type ColumnDef } from '#/components/general/data-table'
import { Button } from '#/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { KeyRound, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { EmployeeWithDetails } from '#/types/employees'
import {
    getStatusColor,
    formatRole,
    getEmployeeDisplayName,
    getEmployeeEmail,
    getStoreName,
} from './employee-utils'

interface EmployeeTableProps {
    data?: EmployeeWithDetails[]
    isLoading: boolean
    onEdit: (employee: EmployeeWithDetails) => void
    onDelete: (employee: EmployeeWithDetails) => void
    onSetPassword: (employee: EmployeeWithDetails) => void
}

export function EmployeeTable({
    data,
    isLoading,
    onEdit,
    onDelete,
    onSetPassword,
}: EmployeeTableProps) {
    const columns: ColumnDef<EmployeeWithDetails>[] = [
        {
            key: 'user',
            header: 'Employee',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium">{getEmployeeDisplayName(row)}</span>
                    <span className="text-xs text-muted-foreground">{getEmployeeEmail(row)}</span>
                </div>
            ),
        },
        {
            key: 'store',
            header: 'Store',
            // `row` holds a nested store, so search needs an explicit accessor.
            accessor: (row) => getStoreName(row),
            cell: (row) => (
                <span>{getStoreName(row)}</span>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            cell: (row) => (
                <span className="capitalize inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                    {formatRole(row.role)}
                </span>
            ),
        },
        {
            key: 'isActive',
            header: 'Status',
            cell: (row) => {
                const status = row.isActive ? 'Active' : 'Inactive'
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(row.isActive)}`}>
                        {status}
                    </span>
                )
            },
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
                            onClick={() => onEdit(row)}
                            className="cursor-pointer gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onSetPassword(row)}
                            className="cursor-pointer gap-2"
                        >
                            <KeyRound className="h-4 w-4" />
                            Set Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(row)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            Remove Employee
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
            searchPlaceholder="Search employees..."
            emptyMessage="No employees found"
        />
    )
}