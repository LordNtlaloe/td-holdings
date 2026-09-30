import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import {
  AlertCircle,
} from 'lucide-react'
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
import { DepartmentForm } from '#/components/departments/departments-form'
import { DepartmentInfoDialog } from '#/components/departments/department-details'
import { StoreAssignmentDialog } from '#/components/departments/store-assignment'
import {
  DepartmentStatCards,
  DepartmentCharts,
  DepartmentTable,
  calculateDepartmentStats,
  type DepartmentWithStoreCount,
} from '#/components/departments'

export const Route = createFileRoute('/dashboard/departments/')({
  component: RouteComponent,
})

type Department = any

function RouteComponent() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [storeAssignmentOpen, setStoreAssignmentOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')
  const { data: departmentsWithStores } = useApiQuery<any>('departments.getAllDepartmentsWithStoreCount', '/api/departments/with-stores')
  const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores')
  const { data: departmentActivityStats } = useApiQuery<any>('departments.getDepartmentActivityStats', '/api/departments/stats/activity')

  const { data: storeAssignments } = useApiQuery<any>(
    'storeDepartments.getStoresByDepartment',
    '/api/departments/' + (selectedDepartment?._id || '') + '/stores',
    undefined,
    !!selectedDepartment?._id
  )

  const deleteDepartment = useApiMutation('departments.deleteDepartment', 'DELETE', '/api/departments', ['departments.getAllDepartments', 'departments.getAllDepartmentsWithStoreCount'])

  // Error states for dialogs
  const [infoError, setInfoError] = useState<string | null>(null)
  const [storeAssignmentError, setStoreAssignmentError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const stats = useMemo(() => {
    return calculateDepartmentStats(
      departments,
      departmentsWithStores,
      stores,
      departmentActivityStats
    )
  }, [departments, departmentsWithStores, stores, departmentActivityStats])

  const isLoading = departments === undefined || stores === undefined

  const handleDelete = async () => {
    if (!selectedDepartment) {
      toast.error('No department selected for deletion')
      return
    }

    setIsDeleting(true)
    setDeleteDialogOpen(false)

    try {
      await deleteDepartment.mutateAsync({ departmentId: selectedDepartment._id })
      toast.success(`${selectedDepartment.name} has been permanently deleted.`)
      setInfoDialogOpen(false)
      setSelectedDepartment(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete department'
      toast.error(errorMessage)
      setInfoError(errorMessage)
      setDeleteDialogOpen(true)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewDetails = (department: DepartmentWithStoreCount) => {
    setSelectedDepartment(department)
    setInfoError(null)
    setInfoDialogOpen(true)
  }

  const handleEdit = (department: DepartmentWithStoreCount) => {
    setSelectedDepartment(department)
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleStoreAssignment = (department: DepartmentWithStoreCount) => {
    setSelectedDepartment(department)
    setStoreAssignmentError(null)
    setStoreAssignmentOpen(true)
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
            <p className="text-sm text-muted-foreground">
              Manage departments and their store assignments
            </p>
          </div>
          <div className="flex gap-2">
            <DepartmentForm
              mode="create"
              onSuccess={() => {
                toast.success('Department created successfully')
              }}
              onError={(error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to create department')
              }}
            />
            {departments && (
              <ExportButton
                data={departments}
                columns={[
                  { key: 'name', header: 'Department Name' },
                  { key: 'description', header: 'Description' },
                  {
                    key: '_creationTime',
                    header: 'Created',
                    format: (value: unknown) => {
                      const date = value ? new Date(value as number) : null
                      return date ? date.toLocaleDateString() : 'N/A'
                    }
                  },
                ]}
                filename="departments-export"
                label="Export Departments"
              />
            )}
          </div>
        </div>

        <DepartmentStatCards stats={stats} isLoading={isLoading} />

        <DepartmentCharts stats={stats} />

        <DepartmentTable
          data={departmentsWithStores}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onStoreAssignment={handleStoreAssignment}
        />
      </div>

      {/* Department Info Dialog */}
      <DepartmentInfoDialog
        open={infoDialogOpen}
        onOpenChange={(open) => {
          setInfoDialogOpen(open)
          if (!open) setInfoError(null)
        }}
        department={selectedDepartment}
        onEdit={() => {
          setInfoDialogOpen(false)
          if (selectedDepartment) {
            setEditDialogOpen(true)
            setEditError(null)
          }
        }}
        onDelete={() => {
          if (selectedDepartment) {
            setDeleteDialogOpen(true)
          }
        }}
        stats={{
          totalCategories: 0,
          totalProducts: 0,
          totalStores: storeAssignments?.length || 0,
        }}
        error={infoError}
      />

      {/* Store Assignment Dialog */}
      <StoreAssignmentDialog
        open={storeAssignmentOpen}
        onOpenChange={(open) => {
          setStoreAssignmentOpen(open)
          if (!open) setStoreAssignmentError(null)
        }}
        department={selectedDepartment}
        onSuccess={() => {
          setStoreAssignmentOpen(false)
          setStoreAssignmentError(null)
          toast.success('Store assignments updated successfully')
        }}
        onError={(error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update store assignments'
          setStoreAssignmentError(errorMessage)
          toast.error(errorMessage)
        }}
        error={storeAssignmentError}
      />

      {/* Edit Department Form */}
      <DepartmentForm
        mode="edit"
        department={selectedDepartment}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditError(null)
        }}
        onSuccess={() => {
          setEditDialogOpen(false)
          setEditError(null)
          toast.success('Department updated successfully')
        }}
        onError={(error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update department'
          setEditError(errorMessage)
          toast.error(errorMessage)
        }}
        error={editError}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"?
              This action cannot be undone. This will also remove all store assignments
              and any associated data.
              {infoError && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{infoError}</span>
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
              {isDeleting ? 'Deleting...' : 'Delete Department'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}