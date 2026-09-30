import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
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
import { ProductForm } from '#/components/products/products-form'
import { ProductInfoDialog } from '#/components/products/product-details'
import {
  ProductStatCards,
  ProductCharts,
  ProductTable,
  calculateProductStats,
  type ProductWithDetails,
} from '#/components/products'

export const Route = createFileRoute('/dashboard/products/')({
  component: RouteComponent,
})

type Product = any

function RouteComponent() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Error states
  const [infoError, setInfoError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: products } = useApiQuery<any>('products.getAllProducts', '/api/products')
  const { data: productsWithDetails } = useApiQuery<any>('products.getAllProductsWithDetails', '/api/products/details')
  const { data: categories } = useApiQuery<any>('categories.getAllCategories', '/api/categories')
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')
  const { data: productActivityStats } = useApiQuery<any>('products.getProductActivityStats', '/api/products/stats/activity')

  const deleteProduct = useApiMutation('products.deleteProduct', 'DELETE', '/api/products', ['products.getAllProducts', 'products.getAllProductsWithDetails'])
  const deactivateProduct = useApiMutation('products.deactivateProduct', 'PATCH', '/api/products/deactivate', ['products.getAllProducts', 'products.getAllProductsWithDetails'])
  const reactivateProduct = useApiMutation('products.reactivateProduct', 'PATCH', '/api/products/reactivate', ['products.getAllProducts', 'products.getAllProductsWithDetails'])

  const stats = useMemo(() => {
    return calculateProductStats(
      products,
      productsWithDetails,
      categories,
      departments,
      productActivityStats
    )
  }, [products, productsWithDetails, categories, departments, productActivityStats])

  const isLoading = products === undefined

  const handleDelete = async () => {
    if (!selectedProduct) {
      toast.error('No product selected for deletion')
      return
    }

    setIsDeleting(true)
    setDeleteDialogOpen(false)

    try {
      await deleteProduct.mutateAsync({ productId: selectedProduct._id })
      toast.success(`${selectedProduct.name} has been permanently deleted.`)
      setInfoDialogOpen(false)
      setSelectedProduct(null)
      setDeleteError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete product'
      toast.error(errorMessage)
      setDeleteError(errorMessage)
      setDeleteDialogOpen(true)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedProduct) return

    try {
      await deactivateProduct.mutateAsync({ productId: selectedProduct._id })
      toast.success(`${selectedProduct.name} has been deactivated.`)
      setInfoDialogOpen(false)
      setInfoError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate product'
      setInfoError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleReactivate = async () => {
    if (!selectedProduct) return

    try {
      await reactivateProduct.mutateAsync({ productId: selectedProduct._id })
      toast.success(`${selectedProduct.name} has been reactivated.`)
      setInfoDialogOpen(false)
      setInfoError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate product'
      setInfoError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleViewDetails = (product: ProductWithDetails) => {
    setSelectedProduct(product)
    setInfoError(null)
    setInfoDialogOpen(true)
  }

  const handleEdit = (product: ProductWithDetails) => {
    setSelectedProduct(product)
    setEditError(null)
    setEditDialogOpen(true)
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage products and their inventory
            </p>
          </div>
          <div className="flex gap-2">
            <ProductForm
              mode="create"
              onSuccess={() => {
                toast.success('Product created successfully')
              }}
              onError={(error) => {
                toast.error(error instanceof Error ? error.message : 'Failed to create product')
              }}
            />
            {products && (
              <ExportButton
                data={products}
                columns={[
                  { key: 'name', header: 'Product Name' },
                  { key: 'sku', header: 'SKU' },
                  {
                    key: 'sizes',
                    header: 'Sizes',
                    format: (value: unknown) => (value as string[])?.join(', ') || ''
                  },
                  {
                    key: 'colors',
                    header: 'Colors',
                    format: (value: unknown) => (value as string[])?.join(', ') || ''
                  },
                  {
                    key: 'variants',
                    header: 'Variants',
                    format: (value: unknown) => (value as string[])?.join(', ') || ''
                  },
                  {
                    key: 'categoryId',
                    header: 'Category',
                    format: (value: unknown) => {
                      const cat = categories?.find((c: any) => c._id === value)
                      return cat?.name || 'Unknown'
                    }
                  },
                  {
                    key: 'departmentId',
                    header: 'Department',
                    format: (value: unknown) => {
                      const dept = departments?.find((d: any) => d._id === value)
                      return dept?.name || 'Unknown'
                    }
                  },
                  {
                    key: 'costPrice',
                    header: 'Cost Price',
                    format: (value: unknown) => `R${Number(value).toFixed(2)}`
                  },
                  {
                    key: 'sellingPrice',
                    header: 'Selling Price',
                    format: (value: unknown) => `R${Number(value).toFixed(2)}`
                  },
                  {
                    key: 'isActive',
                    header: 'Status',
                    format: (value: unknown) => value ? 'Active' : 'Inactive'
                  },
                ]}
                filename="products-export"
                label="Export Products"
              />
            )}
          </div>
        </div>

        <ProductStatCards stats={stats} isLoading={isLoading} />

        <ProductCharts stats={stats} />

        <ProductTable
          data={productsWithDetails}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
        />
      </div>

      {/* Product Info Dialog */}
      <ProductInfoDialog
        open={infoDialogOpen}
        onOpenChange={(open) => {
          setInfoDialogOpen(open)
          if (!open) setInfoError(null)
        }}
        product={selectedProduct as any}
        onEdit={() => {
          setInfoDialogOpen(false)
          if (selectedProduct) {
            setEditDialogOpen(true)
            setEditError(null)
          }
        }}
        onDeactivate={() => {
          if (selectedProduct) {
            handleDeactivate()
          }
        }}
        onReactivate={() => {
          if (selectedProduct) {
            handleReactivate()
          }
        }}
        onDelete={() => {
          if (selectedProduct) {
            setDeleteDialogOpen(true)
          }
        }}
        error={infoError}
      />

      {/* Edit Product Dialog */}
      <ProductForm
        mode="edit"
        product={selectedProduct || undefined}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditError(null)
        }}
        onSuccess={() => {
          setEditDialogOpen(false)
          setEditError(null)
          setSelectedProduct(null)
          toast.success('Product updated successfully')
        }}
        onError={(error) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update product'
          setEditError(errorMessage)
          toast.error(errorMessage)
        }}
        error={editError}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"?
              This action cannot be undone. This will also remove all associated inventory
              and sales data.
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
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}