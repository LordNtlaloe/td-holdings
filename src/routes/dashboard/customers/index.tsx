import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '#/layouts/app-layout'
import { Button } from '#/components/ui/button'
import { ExportButton } from '#/components/general/export-button'
import {
  CustomerStatCards,
  CustomerCharts,
  CustomerTable,
  CustomerFormDialog,
  DeleteCustomerDialog,
  calculateCustomerStats,
  type CustomerWithStats,
} from '#/components/customers'

export const Route = createFileRoute('/dashboard/customers/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Error states
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Queries
  const { data: customers } = useApiQuery<any>('customers.getAllCustomers', '/api/customers')
  const { data: customersWithStats } = useApiQuery<any>('customers.getTopCustomers', '/api/customers/top', { limit: '100' })
  // Use getUserActivityStats instead of getCustomerActivityStats
  const { data: activityStats } = useApiQuery<any>('activities.getUserActivityStats', '/api/activity-logs/stats')

  // Mutations
  const createCustomer = useApiMutation('customers.createCustomer', 'POST', '/api/customers', ['customers.getAllCustomers', 'customers.getTopCustomers'])
  const updateCustomer = useApiMutation('customers.updateCustomer', 'PATCH', '/api/customers', ['customers.getAllCustomers', 'customers.getTopCustomers'])
  const deleteCustomer = useApiMutation('customers.deleteCustomer', 'DELETE', '/api/customers', ['customers.getAllCustomers', 'customers.getTopCustomers'])

  const stats = useMemo(() => {
    return calculateCustomerStats(customers, customersWithStats, activityStats)
  }, [customers, customersWithStats, activityStats])

  const isLoading = customers === undefined

  const handleCreateCustomer = async (data: { name: string; email?: string; phone?: string }) => {
    setIsSubmitting(true)
    setCreateError(null)

    try {
      await createCustomer.mutateAsync(data)
      toast.success('Customer created successfully')
      setCreateDialogOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer'
      setCreateError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCustomer = async (data: { name: string; email?: string; phone?: string }) => {
    if (!selectedCustomer) return

    setIsSubmitting(true)
    setEditError(null)

    try {
      await updateCustomer.mutateAsync({
        customerId: selectedCustomer._id,
        ...data,
      })
      toast.success('Customer updated successfully')
      setEditDialogOpen(false)
      setSelectedCustomer(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer'
      setEditError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteCustomer.mutateAsync({ customerId: selectedCustomer._id })
      toast.success('Customer deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedCustomer(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer'
      setDeleteError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewDetails = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer)
    // You could open a details dialog here
    toast.info(`Viewing ${customer.name}`)
  }

  const handleEdit = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer)
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleDelete = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage customers and their purchase history
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => {
              setCreateError(null)
              setCreateDialogOpen(true)
            }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Customer
            </Button>
            {customers && (
              <ExportButton
                data={customers}
                columns={[
                  { key: 'name', header: 'Name' },
                  { key: 'email', header: 'Email' },
                  { key: 'phone', header: 'Phone' },
                  {
                    key: 'isActive',
                    header: 'Status',
                    format: (value: unknown) => value !== false ? 'Active' : 'Inactive'
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    format: (value: unknown) => value ? new Date(value as number).toLocaleDateString() : 'N/A'
                  },
                ]}
                filename="customers-export"
                label="Export Customers"
              />
            )}
          </div>
        </div>

        <CustomerStatCards stats={stats} isLoading={isLoading} />

        <CustomerCharts stats={stats} />

        <CustomerTable
          data={customersWithStats}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Create Customer Dialog */}
      <CustomerFormDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setCreateError(null)
        }}
        onSubmit={handleCreateCustomer}
        isLoading={isSubmitting}
        error={createError}
        mode="create"
      />

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditError(null)
        }}
        customer={selectedCustomer}
        onSubmit={handleEditCustomer}
        isLoading={isSubmitting}
        error={editError}
        mode="edit"
      />

      {/* Delete Customer Dialog */}
      <DeleteCustomerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customer={selectedCustomer}
        onConfirm={handleDeleteCustomer}
        isLoading={isDeleting}
        error={deleteError}
      />
    </AppLayout>
  )
}