import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery } from '#/lib/api/hooks'
import { useMemo } from 'react'
import AppLayout from '#/layouts/app-layout'
import { ExportButton } from '#/components/general/export-button'
import { UserActions } from '#/components/users/user-actions'
import {
  UserStatCards,
  UserCharts,
  UserTable,
  calculateUserStats,
  type User,
} from '#/components/users'

export const Route = createFileRoute('/dashboard/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: users } = useApiQuery<any>('users.getAllUsers', '/api/users')
  const { data: activityStats } = useApiQuery<any>('activities.getUserActivityStats', '/api/activity-logs/stats')

  const stats = useMemo(() => {
    return calculateUserStats(users, activityStats)
  }, [users, activityStats])

  const isLoading = users === undefined

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage users and their permissions
            </p>
          </div>
          {users && (
            <ExportButton
              data={users}
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'email', header: 'Email' },
                {
                  key: 'role',
                  header: 'Role',
                  format: (value: unknown) => String(value).replace('_', ' ')
                },
                {
                  key: 'status',
                  header: 'Status',
                  format: (value: unknown) => String(value || 'active')
                },
              ]}
              filename="users-export"
              label="Export Users"
            />
          )}
        </div>

        <UserStatCards stats={stats} isLoading={isLoading} />

        <UserCharts stats={stats} />

        <UserTable
          data={users}
          isLoading={isLoading}
          rowActions={(row: User) => (
            <UserActions
              userId={row._id}
              userName={row.name}
              userEmail={row.email}
              targetRole={row.role}
              currentStatus={row.status || 'active'}
            />
          )}
        />
      </div>
    </AppLayout>
  )
}