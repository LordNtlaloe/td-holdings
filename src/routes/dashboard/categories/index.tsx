import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
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

import AppLayout from '#/layouts/app-layout'
import { ExportButton } from '#/components/general/export-button'
import { CategoryForm } from '#/components/categories/category-form'
import { CategoryInfoDialog } from '#/components/categories/category-details'
import {
  CategoryStatCards,
  CategoryCharts,
  CategoryTable,
  calculateCategoryStats,
  type CategoryWithDepartment,
} from '#/components/categories'

export const Route = createFileRoute('/dashboard/categories/')({
  component: RouteComponent,
})

type Category = any

function RouteComponent() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Error states for dialogs
  const [infoError, setInfoError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: categories } = useApiQuery<any>('categories.getAllCategories', '/api/categories')
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')
  const { data: categoriesWithDetails } = useApiQuery<any>('categories.getAllCategoriesWithDetails', '/api/categories/details')
  const { data: categoryActivityStats } = useApiQuery<any>('categories.getCategoryActivityStats', '/api/categories/stats/activity')

  const deleteCategory = useApiMutation('categories.deleteCategory', 'DELETE', '/api/categories', ['categories.getAllCategories', 'categories.getAllCategoriesWithDetails'])

  const stats = useMemo(() => {
    return calculateCategoryStats(
      categories,
      departments,
      categoriesWithDetails,
      categoryActivityStats
    )
  }, [categories, departments, categoriesWithDetails, categoryActivityStats])

  const isLoading = categories === undefined || departments === undefined

  const handleDelete = async () => {
    if (!selectedCategory) {
      toast.error('No category selected for deletion')
      return
    }

    setIsDeleting(true)
    setDeleteDialogOpen(false)

    try {
      await deleteCategory.mutateAsync({ categoryId: selectedCategory._id })
      toast.success(`${selectedCategory.name} has been permanently deleted.`)
      setInfoDialogOpen(false)
      setSelectedCategory(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category'
      toast.error(errorMessage)
      setInfoError(errorMessage)
      // Reopen delete dialog to show error
      setDeleteDialogOpen(true)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewDetails = (category: CategoryWithDepartment) => {
    setSelectedCategory(category)
    setInfoError(null)
    setInfoDialogOpen(true)
  }

  const handleEdit = (category: CategoryWithDepartment) => {
    setSelectedCategory(category)
    setEditError(null)
    setEditDialogOpen(true)
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage categories and their department assignments
            </p>
          </div>
          <div className="flex gap-2">
            <CategoryForm
              mode="create"
              onSuccess={() => {
                toast.success('Category created successfully')
              }}
              onError={(error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to create category')
              }}
            />
            {categories && (
              <ExportButton
                data={categories}
                columns={[
                  { key: 'name', header: 'Category Name' },
                  {
                    key: 'departmentId',
                    header: 'Department',
                    format: (value: unknown) => {
                      const dept = departments?.find((d: any) => d._id === value)
                      return dept?.name || 'Unknown'
                    }
                  },
                  { key: 'description', header: 'Description' },
                ]}
                filename="categories-export"
                label="Export Categories"
              />
            )}
          </div>
        </div>

        <CategoryStatCards stats={stats} isLoading={isLoading} />

        <CategoryCharts stats={stats} />

        <CategoryTable
          data={categoriesWithDetails}
          departments={departments}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
        />
      </div>

      {/* Category Info Dialog */}
      <CategoryInfoDialog
        open={infoDialogOpen}
        onOpenChange={(open) => {
          setInfoDialogOpen(open)
          if (!open) setInfoError(null)
        }}
        category={selectedCategory}
        departments={departments}
        onEdit={() => {
          setInfoDialogOpen(false)
          if (selectedCategory) {
            setEditDialogOpen(true)
            setEditError(null)
          }
        }}
        onDelete={() => {
          if (selectedCategory) {
            setDeleteDialogOpen(true)
          }
        }}
        stats={{
          totalProducts: selectedCategory
            ? categoriesWithDetails?.find((c: any) => c._id === selectedCategory._id)?.productCount || 0
            : 0,
        }}
        error={infoError}
      />

      {/* Edit Category Dialog */}
      <CategoryForm
        mode="edit"
        category={selectedCategory || undefined}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditError(null)
        }}
        onSuccess={() => {
          setEditDialogOpen(false)
          setEditError(null)
          setSelectedCategory(null)
          toast.success('Category updated successfully')
        }}
        onError={(error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update category'
          setEditError(errorMessage)
          toast.error(errorMessage)
        }}
        error={editError}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"?
              This action cannot be undone. This will also remove all product associations
              and any related data.
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
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}