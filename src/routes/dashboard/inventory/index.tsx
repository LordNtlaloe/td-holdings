import { createFileRoute } from '@tanstack/react-router'
import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '#/layouts/app-layout'
import { useRole } from '#/hooks/use-role'
import {
  InventoryStatCards,
  InventoryStoreSelector,
  InventoryTable,
  BatchesTable,
  LowStockTable,
  AssignProductDialog,
  ReceiveBatchDialog,
  ReorderLevelDialog,
  AdjustBatchDialog,
  generateBatchNumber,
  isProductEligibleForBatch,
  isSizeEligibleForBatch,
  calculateInventoryStats,
  type Batch,
} from '#/components/inventory'

export const Route = createFileRoute('/dashboard/inventory/')({
  component: RouteComponent,
})

/**
 * Shown until a store is chosen. Every query on this page is store-scoped and
 * disabled without one, so the tables would render empty — which reads as
 * "nothing is low on stock" rather than "pick a store".
 */
function SelectStorePrompt() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
        <p className="font-medium">Select a store to continue</p>
        <p className="text-sm text-muted-foreground">
          Inventory levels, batches and low-stock alerts are all tracked per store.
        </p>
      </CardContent>
    </Card>
  )
}

function RouteComponent() {
  // State
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false)
  const [receiveBatchDialogOpen, setReceiveBatchDialogOpen] = useState(false)
  const [adjustQuantityDialogOpen, setAdjustQuantityDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [searchTerm] = useState('')
  const [batchProductId, setBatchProductId] = useState<string | null>(null)
  const [batchDepartmentId, setBatchDepartmentId] = useState<string | null>(null)
  /** Size the batch belongs to — required when the product is size-priced. */
  const [batchSize, setBatchSize] = useState<string>('')
  // Set when the receive dialog is opened from a product row: the product and
  // its department are already known, so only the quantity has to be entered.
  const [receiveSummary, setReceiveSummary] = useState<{
    name: string
    sku?: string
    departmentName?: string
    product?: any
    quantity: number
    reorderLevel?: number | null
    sizes?: Array<{ size: string; quantity: number }>
  } | null>(null)

  // Error states
  const [assignError, setAssignError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [receiveBatchError, setReceiveBatchError] = useState<string | null>(null)
  const [adjustBatchError, setAdjustBatchError] = useState<string | null>(null)

  // Form state
  const [reorderLevel, setReorderLevel] = useState<number>(5)
  const [batchNumber, setBatchNumber] = useState('')
  const [batchQuantity, setBatchQuantity] = useState<number>(1)
  const [batchCostPrice, setBatchCostPrice] = useState<number>(0)
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState('')

  // Loading states
  const [assigning, setAssigning] = useState(false)
  const [updatingReorder, setUpdatingReorder] = useState(false)
  const [receivingBatch, setReceivingBatch] = useState(false)
  const [adjustingBatch, setAdjustingBatch] = useState(false)

  // Every query on this page is store-scoped, so the picker is defaulted to the
  // signed-in user's own store (falling back to the first available one) — see
  // the effect below.
  const { storeId: userStoreId, isLoading: isUserLoading } = useRole()

  // Queries
  const { data: stores } = useApiQuery<any>('stores.getAllStores', '/api/stores')
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')
  const { data: inventoryItems } = useApiQuery<any>('inventory.getInventoryByStore',
    '/api/inventory/store/' + (selectedStoreId || ''),
    undefined,
    !!selectedStoreId
  )
  const { data: unassignedProducts } = useApiQuery<any>('inventory.getUnassignedProducts',
    '/api/inventory/unassigned/' + (selectedStoreId || ''),
    undefined,
    !!selectedStoreId
  )
  const { data: batches } = useApiQuery<any>('batches.getBatchesByStore',
    '/api/batches/store/' + (selectedStoreId || ''),
    undefined,
    !!selectedStoreId
  )
  // Low stock is the drill-down for the dashboard's global alert count, so a
  // user tied to one store sees only that store while everyone else sees every
  // store (with a Store column) — that way the two screens can never disagree.
  const lowStockPath = userStoreId
    ? '/api/inventory/low-stock/' + userStoreId
    : '/api/inventory/low-stock'
  const { data: lowStockItems, isLoading: isLoadingLowStock } = useApiQuery<any>(
    'inventory.getLowStock',
    lowStockPath,
    undefined,
    !isUserLoading
  )
  const { data: allProducts } = useApiQuery<any>('products.getAllProducts', '/api/products')

  // Mutations
  const assignProduct = useApiMutation('inventory.assignProductToStore', 'POST', '/api/inventory/assign', ['inventory.getInventoryByStore', 'inventory.getUnassignedProducts'])
  const setReorderLevelMutation = useApiMutation('inventory.setReorderLevel', 'PATCH', '/api/inventory/reorder-level', ['inventory.getInventoryByStore'])
  const removeProductFromStore = useApiMutation('inventory.removeProductFromStore', 'DELETE', '/api/inventory/remove', ['inventory.getInventoryByStore', 'inventory.getUnassignedProducts'])
  const receiveBatch = useApiMutation('batches.receiveBatch', 'POST', '/api/batches/receive', ['batches.getBatchesByStore', 'inventory.getInventoryByStore'])
  const adjustBatchQuantity = useApiMutation('batches.adjustBatchQuantity', 'PATCH', '/api/batches/adjust', ['batches.getBatchesByStore'])
  const deleteBatch = useApiMutation('batches.deleteBatch', 'DELETE', '/api/batches', ['batches.getBatchesByStore'])

  // Default the store picker once the list arrives. Without this no store was
  // ever selected, every query stayed disabled, and all three tabs rendered an
  // empty table — while the dashboard was correctly reporting a low-stock item.
  useEffect(() => {
    if (selectedStoreId || !stores?.length) return
    const ownStore = stores.find((s: any) => s._id === userStoreId)
    setSelectedStoreId(ownStore?._id ?? stores[0]._id)
  }, [stores, selectedStoreId, userStoreId])

  // Stats
  const stats = useMemo(() => {
    return calculateInventoryStats(inventoryItems, lowStockItems, batches)
  }, [inventoryItems, lowStockItems, batches])

  const isLoading = inventoryItems === undefined || stores === undefined

  // Filter unassigned products by selected department
  const filteredUnassignedProducts = useMemo(() => {
    if (!unassignedProducts) return []
    if (!selectedDepartmentId) return unassignedProducts
    return unassignedProducts.filter((p: any) => p.departmentId === selectedDepartmentId)
  }, [unassignedProducts, selectedDepartmentId])

  // Handlers
  const handleAssignProduct = async () => {
    if (!selectedStoreId || !selectedProductId) {
      toast.error('Please select a store and product')
      return
    }

    setAssigning(true)
    setAssignError(null)

    try {
      await assignProduct.mutateAsync({
        storeId: selectedStoreId,
        productId: selectedProductId,
        reorderLevel: reorderLevel,
      })
      toast.success('Product assigned to store successfully')
      setAssignDialogOpen(false)
      setSelectedProductId(null)
      setSelectedDepartmentId(null)
      setReorderLevel(5)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign product'
      setAssignError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setAssigning(false)
    }
  }

  const handleSetReorderLevel = async () => {
    if (!selectedStoreId || !selectedProductId) {
      toast.error('Please select a store and product')
      return
    }

    setUpdatingReorder(true)
    setReorderError(null)

    try {
      await setReorderLevelMutation.mutateAsync({
        storeId: selectedStoreId,
        productId: selectedProductId,
        reorderLevel: reorderLevel,
      })
      toast.success('Reorder level updated successfully')
      setReorderDialogOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reorder level'
      setReorderError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUpdatingReorder(false)
    }
  }

  const openReceiveBatchDialog = (productId?: string, suggestedQuantity = 1) => {
    // Reset state
    setBatchProductId(null)
    setBatchDepartmentId(null)
    setReceiveBatchError(null)
    setReceiveSummary(null)
    setBatchSize('')

    // Generate batch number
    setBatchNumber(generateBatchNumber())
    setBatchQuantity(suggestedQuantity)

    if (!productId) {
      setBatchCostPrice(0)
      setReceiveBatchDialogOpen(true)
      return
    }

    // The product is already known, so look it up in whichever list the click
    // came from — the per-store inventory list, or the (possibly global)
    // low-stock list, which also covers rows belonging to another store.
    const row =
      inventoryItems?.find((item: any) => item.productId === productId) ??
      (lowStockItems as any[])?.find((item: any) => item.productId === productId)
    const product = row?.product

    setBatchCostPrice(product?.costPrice || 0)
    setBatchProductId(productId)
    setReceiveSummary({
      name: product?.name ?? 'Selected product',
      sku: product?.sku,
      departmentName: departments?.find((d: any) => d._id === product?.departmentId)?.name,
      product,
      quantity: row?.quantity ?? 0,
      reorderLevel: row?.reorderLevel ?? null,
      sizes: row?.sizes ?? [],
    })

    // Keep the department in step for the generic picker.
    if (product?.departmentId) setBatchDepartmentId(product.departmentId)

    setReceiveBatchDialogOpen(true)
  }

  const handleReceiveBatch = async () => {
    if (!selectedStoreId) {
      toast.error('Please select a store first')
      return
    }

    if (!batchProductId) {
      toast.error('Please select a product')
      return
    }

    if (!batchNumber.trim()) {
      toast.error('Batch number is required')
      return
    }

    if (batchQuantity <= 0) {
      toast.error('Quantity must be greater than 0')
      return
    }

    if (batchCostPrice < 0) {
      toast.error('Cost price cannot be negative')
      return
    }

    // Products whose price varies by size hold stock per size, so the batch has
    // to say which size it is for.
    const productForBatch =
      inventoryItems?.find((item: any) => item.productId === batchProductId)?.product ??
      receiveSummary?.product
    if (productForBatch?.sizePricing?.length && !batchSize) {
      toast.error('Please select a size for this product')
      return
    }

    setReceivingBatch(true)
    setReceiveBatchError(null)

    try {
      await receiveBatch.mutateAsync({
        storeId: selectedStoreId,
        productId: batchProductId,
        size: batchSize || undefined,
        batchNumber: batchNumber.trim(),
        quantity: batchQuantity,
        costPrice: batchCostPrice,
      })
      toast.success(`Batch ${batchNumber} received successfully`)
      setReceiveBatchDialogOpen(false)
      setBatchNumber('')
      setBatchQuantity(1)
      setBatchCostPrice(0)
      setBatchProductId(null)
      setBatchDepartmentId(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to receive batch'
      setReceiveBatchError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setReceivingBatch(false)
    }
  }

  const handleAdjustQuantity = async () => {
    if (!selectedBatch) return

    if (adjustQuantity < 0) {
      toast.error('Quantity cannot be negative')
      return
    }

    setAdjustingBatch(true)
    setAdjustBatchError(null)

    try {
      await adjustBatchQuantity.mutateAsync({
        batchId: selectedBatch._id,
        newQuantity: adjustQuantity,
        reason: adjustReason || undefined,
      })
      toast.success('Batch quantity adjusted successfully')
      setAdjustQuantityDialogOpen(false)
      setSelectedBatch(null)
      setAdjustQuantity(0)
      setAdjustReason('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to adjust quantity'
      setAdjustBatchError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setAdjustingBatch(false)
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch? The batch must have 0 quantity.')) {
      return
    }

    try {
      await deleteBatch.mutateAsync({ batchId: batchId })
      toast.success('Batch deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete batch')
    }
  }

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedStoreId) return

    if (!confirm('Are you sure you want to remove this product from the store? It must have 0 stock.')) {
      return
    }

    try {
      await removeProductFromStore.mutateAsync({
        storeId: selectedStoreId,
        productId: productId,
      })
      toast.success('Product removed from store')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove product')
    }
  }

  const handleEditReorder = (productId: string, reorderLevel: number) => {
    setSelectedProductId(productId)
    setReorderLevel(reorderLevel)
    setReorderError(null)
    setReorderDialogOpen(true)
  }

  // Check if a store is selected
  const hasStoreSelected = !!selectedStoreId

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage stock, batches, and inventory assignments across stores
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InventoryStoreSelector
              stores={stores}
              selectedStoreId={selectedStoreId}
              onStoreChange={setSelectedStoreId}
            />
            <Button
              onClick={() => setAssignDialogOpen(true)}
              disabled={!hasStoreSelected}
            >
              <Plus className="mr-2 h-4 w-4" />
              Assign Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <InventoryStatCards
          stats={stats}
          isLoading={isLoading}
          catalogueSize={allProducts?.length}
        />

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {hasStoreSelected ? (
              <InventoryTable
                data={inventoryItems}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onEditReorder={handleEditReorder}
                onReceiveBatch={openReceiveBatchDialog}
                onRemoveProduct={handleRemoveProduct}
              />
            ) : (
              <SelectStorePrompt />
            )}
          </TabsContent>

          {/* Batches Tab */}
          <TabsContent value="batches" className="space-y-4">
            {hasStoreSelected ? (
              <BatchesTable
                data={batches}
                products={allProducts}
                isLoading={isLoading}
                onEditBatch={(batch) => {
                  setSelectedBatch(batch)
                  setAdjustQuantity(batch.quantity)
                  setAdjustReason('')
                  setAdjustBatchError(null)
                  setAdjustQuantityDialogOpen(true)
                }}
                onDeleteBatch={handleDeleteBatch}
                onReceiveBatch={() => openReceiveBatchDialog()}
              />
            ) : (
              <SelectStorePrompt />
            )}
          </TabsContent>

          {/* Low Stock Tab — deliberately NOT gated on the store picker: it
              mirrors the dashboard's global count. */}
          <TabsContent value="low-stock" className="space-y-4">
            <LowStockTable
              items={lowStockItems as any}
              showStore={!userStoreId}
              loading={isUserLoading || isLoadingLowStock}
              onReceiveStock={(productId) => openReceiveBatchDialog(productId, 10)}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AssignProductDialog
          open={assignDialogOpen}
          onOpenChange={(open) => {
            setAssignDialogOpen(open)
            if (!open) {
              setAssignError(null)
              setSelectedDepartmentId(null)
              setSelectedProductId(null)
            }
          }}
          departments={departments}
          unassignedProducts={filteredUnassignedProducts}
          selectedDepartmentId={selectedDepartmentId}
          selectedProductId={selectedProductId}
          reorderLevel={reorderLevel}
          onDepartmentChange={setSelectedDepartmentId}
          onProductChange={setSelectedProductId}
          onReorderLevelChange={setReorderLevel}
          onSubmit={handleAssignProduct}
          isLoading={assigning}
          error={assignError}
        />

        <ReceiveBatchDialog
          open={receiveBatchDialogOpen}
          onOpenChange={(open) => {
            setReceiveBatchDialogOpen(open)
            if (!open) {
              setReceiveBatchError(null)
              setBatchDepartmentId(null)
              setBatchProductId(null)
              setReceiveSummary(null)
              setBatchSize('')
            }
          }}
          lockProduct={receiveSummary}
          departments={departments}
          inventoryItems={inventoryItems}
          selectedDepartmentId={batchDepartmentId}
          selectedProductId={batchProductId}
          selectedSize={batchSize}
          onSizeChange={setBatchSize}
          batchNumber={batchNumber}
          batchQuantity={batchQuantity}
          batchCostPrice={batchCostPrice}
          onDepartmentChange={setBatchDepartmentId}
          onProductChange={setBatchProductId}
          onBatchNumberChange={setBatchNumber}
          onBatchQuantityChange={setBatchQuantity}
          onBatchCostPriceChange={setBatchCostPrice}
          onSubmit={handleReceiveBatch}
          isLoading={receivingBatch}
          error={receiveBatchError}
          isProductEligible={(productId) => {
            if (!batches) return true
            return isProductEligibleForBatch(productId, batches)
          }}
          isSizeEligible={(productId, size) => {
            if (!batches) return true
            return isSizeEligibleForBatch(productId, size, batches)
          }}
        />

        <ReorderLevelDialog
          open={reorderDialogOpen}
          onOpenChange={(open) => {
            setReorderDialogOpen(open)
            if (!open) setReorderError(null)
          }}
          reorderLevel={reorderLevel}
          onReorderLevelChange={setReorderLevel}
          onSubmit={handleSetReorderLevel}
          isLoading={updatingReorder}
          error={reorderError}
        />

        <AdjustBatchDialog
          open={adjustQuantityDialogOpen}
          onOpenChange={(open) => {
            setAdjustQuantityDialogOpen(open)
            if (!open) {
              setAdjustBatchError(null)
              setSelectedBatch(null)
            }
          }}
          batch={selectedBatch}
          adjustQuantity={adjustQuantity}
          adjustReason={adjustReason}
          onQuantityChange={setAdjustQuantity}
          onReasonChange={setAdjustReason}
          onSubmit={handleAdjustQuantity}
          isLoading={adjustingBatch}
          error={adjustBatchError}
        />
      </div>
    </AppLayout>
  )
}