import { DataTable, type ColumnDef } from '#/components/general/data-table'
import type { User } from '#/types/users'
import { getStatusColor, getStatusLabel, formatRole } from './user-utils'

interface UserTableProps {
    data?: User[]
    isLoading: boolean
    rowActions?: (row: User) => React.ReactNode
}

export function UserTable({ data, isLoading, rowActions }: UserTableProps) {
    const columns: ColumnDef<User>[] = [
        {
            key: 'name',
            header: 'Name',
            searchable: true,
        },
        {
            key: 'email',
            header: 'Email',
            searchable: true,
        },
        {
            key: 'role',
            header: 'Role',
            cell: (row: User) => (
                <span className="capitalize inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                    {formatRole(row.role)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row: User) => {
                const status = row.status || 'active'
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(status as any)}`}>
                        {getStatusLabel(status as any)}
                    </span>
                )
            },
        },
    ]

    return (
        <DataTable
            data={data as any}
            columns={columns as any}
            rowKey="_id"
            loading={isLoading}
            searchPlaceholder="Search users..."
            emptyMessage="No users found"
            rowActions={rowActions as any}
            pageSizeOptions={[10, 25, 50]}
            defaultPageSize={10}
            enableColumnVisibility={true}
        />
    )
}