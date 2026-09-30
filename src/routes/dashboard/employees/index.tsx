import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation, useSetEmployeePassword } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { toast } from 'sonner'
import AppLayout from '#/layouts/app-layout'
import { ExportButton } from '#/components/general/export-button'
import { SetPasswordDialog } from '#/components/general/set-password-dialog'
import { EmployeeForm } from '#/components/employees/employee-form'
import {
  EmployeeStatCards,
  EmployeeCharts,
  EmployeeTable,
  calculateEmployeeStats,
  type EmployeeWithDetails,
} from '#/components/employees'

export const Route = createFileRoute('/dashboard/employees/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const setEmployeePassword = useSetEmployeePassword()

  // Error states for dialogs
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: employees } = useApiQuery<any>('employees.getAllEmployees', '/api/employees')
  const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores')
  const { data: activityStats } = useApiQuery<any>('activities.getUserActivityStats', '/api/activity-logs/stats')

  // Use removeEmployee if deleteEmployee doesn't exist
  const removeEmployee = useApiMutation('employees.deactivateEmployee', 'PATCH', '/api/employees/deactivate', ['employees.getAllEmployees'])

  const stats = useMemo(() => {
    return calculateEmployeeStats(employees, activityStats)
  }, [employees, activityStats])

  const isLoading = employees === undefined || stores === undefined

  const handleDelete = async () => {
    if (!selectedEmployee) {
      toast.error('No employee selected for deletion')
      return
    }

    setIsDeleting(true)
    setDeleteDialogOpen(false)

    try {
      await removeEmployee.mutateAsync({ employeeId: selectedEmployee._id })
      toast.success(`${selectedEmployee.user?.name || 'Employee'} has been removed.`)
      setSelectedEmployee(null)
      setDeleteError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete employee'
      toast.error(errorMessage)
      setDeleteError(errorMessage)
      setDeleteDialogOpen(true)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee)
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const handleSetPassword = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee)
    setPasswordDialogOpen(true)
  }

  // Prepare data for export
  const exportData = useMemo(() => {
    if (!employees) return []
    return employees.map((emp: any) => ({
      name: emp.user?.name || 'Unknown',
      email: emp.user?.email || 'No email',
      store: emp.store?.name || 'Unknown Store',
      role: emp.role.replace('_', ' '),
      status: emp.isActive ? 'Active' : 'Inactive',
    }))
  }, [employees])

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">
              Manage employees and their store assignments
            </p>
          </div>
          <div className="flex gap-2">
            <EmployeeForm
              mode="create"
              onSuccess={() => {
                toast.success('Employee created successfully')
              }}
              onError={(error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to create employee')
              }}
            />
            {employees && (
              <ExportButton
                data={exportData}
                columns={[
                  { key: 'name', header: 'Employee Name' },
                  { key: 'email', header: 'Email' },
                  { key: 'store', header: 'Store' },
                  { key: 'role', header: 'Role' },
                  { key: 'status', header: 'Status' },
                ]}
                filename="employees-export"
                label="Export Employees"
              />
            )}
          </div>
        </div>

        <EmployeeStatCards
          stats={stats}
          totalStores={stores?.length || 0}
          isLoading={isLoading}
        />

        <EmployeeCharts stats={stats} />

        <EmployeeTable
          data={employees}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onSetPassword={handleSetPassword}
        />
      </div>

      {/* Set / reset an employee's sign-in password */}
      <SetPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        subjectName={selectedEmployee?.user?.name}
        subjectEmail={selectedEmployee?.user?.email}
        onSubmit={async (password) => {
          if (!selectedEmployee?.user) throw new Error('This employee has no linked user account')
          await setEmployeePassword({ id: selectedEmployee._id, password })
        }}
        onSuccess={() => {
          toast.success(
            `Password updated. ${selectedEmployee?.user?.name || 'They'} can now sign in with the new password.`
          )
        }}
      />

      {/* Edit Employee Dialog */}
      <EmployeeForm
        mode="edit"
        employee={selectedEmployee || undefined}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditError(null)
        }}
        onSuccess={() => {
          setEditDialogOpen(false)
          setEditError(null)
          toast.success('Employee updated successfully')
        }}
        onError={(error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update employee'
          setEditError(errorMessage)
          toast.error(errorMessage)
        }}
        error={editError}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{selectedEmployee?.user?.name || 'Unknown'}"?
              This action cannot be undone. This will remove the employee's access
              to the store and all associated permissions.
              {deleteError && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{deleteError}</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing...' : 'Remove Employee'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}