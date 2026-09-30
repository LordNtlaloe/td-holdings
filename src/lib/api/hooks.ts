/**
 * React Query hooks that wrap the REST API client in `./client`.
 *
 * Usage:
 *   import { useApiQuery, useApiMutation } from '#/lib/api/hooks'
 *   const { data, isLoading } = useApiQuery('stores.list', '/api/stores')
 *   const createStore = useApiMutation('stores.create', 'POST', '/api/stores')
 *   await createStore({ name: 'Main' })            // callable
 *   await createStore.mutateAsync({ name: 'Main' }) // or use the result API
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import api from './client';

// ─── Query hook ────────────────────────────────────────────────────────────

type QueryParams = Record<string, string | number | undefined | null>;

export function useApiQuery<TData = any>(
  queryKey: string,
  path: string,
  params?: QueryParams,
  enabled?: boolean
) {
  const url = params
    ? path + '?' + Object.entries(params)
        .filter(([_, v]) => v != null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')
    : path;

  return useQuery<TData>({
    // The resolved URL is part of the key, NOT just `params`.
    //
    // Many callers bake an identifier into the PATH (e.g.
    // '/api/inventory/store/' + storeId) and pass no params, so keying on
    // `params` alone gave every identifier the SAME cache entry: switching
    // stores re-rendered the label but served the previous store's cached data
    // and never ran the new queryFn. Using the URL also covers query-string
    // filters. Invalidation by array prefix still matches.
    queryKey: [queryKey, url],
    queryFn: () => api.get<TData>(url),
    enabled: enabled !== false,
  });
}

// ─── Mutation hook ─────────────────────────────────────────────────────────

type HttpMethod = 'POST' | 'PATCH' | 'DELETE';

/**
 * A mutation result that may also be invoked directly as a function, i.e. both
 * `mutation(vars)` and `mutation.mutateAsync(vars)` are supported.
 */
export type CallableMutation<TData, TVariables> = UseMutationResult<
  TData,
  Error,
  TVariables
> &
  ((variables: TVariables) => Promise<TData>);

/** DELETE requests have no body, so forward the variables as query params. */
function appendQuery(path: string, variables: any): string {
  if (!variables || typeof variables !== 'object') return path;
  const entries = Object.entries(variables).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (entries.length === 0) return path;
  const qs = entries
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  return path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
}

export function useApiMutation<TData = any, TVariables = any>(
  mutationKey: string,
  method: HttpMethod,
  path: string,
  invalidateKeys?: string[]
): CallableMutation<TData, TVariables> {
  const queryClient = useQueryClient();

  const mutation = useMutation<TData, Error, TVariables>({
    mutationKey: [mutationKey],
    mutationFn: async (variables) => {
      switch (method) {
        case 'POST':
          return api.post<TData>(path, variables);
        case 'PATCH':
          return api.patch<TData>(path, variables);
        case 'DELETE':
          return api.delete<TData>(appendQuery(path, variables));
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: () => {
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    },
  });

  return Object.assign(
    (variables: TVariables) => mutation.mutateAsync(variables),
    mutation
  ) as CallableMutation<TData, TVariables>;
}

// ─── Auth hooks ────────────────────────────────────────────────────────────

export function useSignIn() {
  return useMutation({
    mutationKey: ['auth.signIn'],
    mutationFn: (variables: { email: string; password: string }) =>
      api.post<{ token: string; user: any }>('/api/auth/sign-in', variables),
  });
}

export function useSignUp() {
  return useMutation({
    mutationKey: ['auth.signUp'],
    mutationFn: (variables: { email: string; password: string; name: string; role?: string }) =>
      api.post<{ token: string; user: any }>('/api/auth/sign-up', variables),
  });
}

export function useCurrentUser() {
  return useApiQuery<{ user: any }>('auth.me', '/api/auth/me');
}

// ─── Data hooks ────────────────────────────────────────────────────────────

export function useStores() {
  return useApiQuery<{ stores: any[] }>('stores.list', '/api/stores');
}

export function useStore(id: string | undefined) {
  return useApiQuery<{ store: any }>('stores.detail', `/api/stores/${id}`, undefined, !!id);
}

export function useDepartments() {
  return useApiQuery<{ departments: any[] }>('departments.list', '/api/departments');
}

export function useProducts(params?: QueryParams) {
  return useApiQuery<{ products: any[] }>('products.list', '/api/products', params);
}

export function useProduct(id: string | undefined) {
  return useApiQuery<{ product: any }>('products.detail', `/api/products/${id}`, undefined, !!id);
}

export function useInventoryByStore(storeId: string | undefined) {
  return useApiQuery<{ inventory: any[] }>(
    'inventory.list',
    `/api/inventory/store/${storeId}`,
    undefined,
    !!storeId
  );
}

export function useCustomers(params?: QueryParams) {
  return useApiQuery<{ customers: any[] }>('customers.list', '/api/customers', params);
}

export function useSales(params?: QueryParams) {
  return useApiQuery<{ sales: any[] }>('sales.list', '/api/sales', params);
}

export function useSale(id: string | undefined) {
  return useApiQuery<{ sale: any }>('sales.detail', `/api/sales/${id}`, undefined, !!id);
}

export function useDashboard() {
  return useApiQuery<any>('dashboard', '/api/dashboard');
}

export function useBatches(params?: QueryParams) {
  return useApiQuery<{ batches: any[] }>('batches.list', '/api/batches', params);
}

export function useTransfers(params?: QueryParams) {
  return useApiQuery<{ transfers: any[] }>('transfers.list', '/api/transfers', params);
}

export function useEmployees(params?: QueryParams) {
  return useApiQuery<{ employees: any[] }>('employees.list', '/api/employees', params);
}

export function useUsers() {
  return useApiQuery<{ users: any[] }>('users.list', '/api/users');
}

export function useInvoices(params?: QueryParams) {
  return useApiQuery<{ invoices: any[] }>('invoices.list', '/api/invoices', params);
}

export function useActivityLogs(params?: QueryParams) {
  return useApiQuery<{ logs: any[] }>('activity-logs.list', '/api/activity-logs', params);
}

// ─────────────────────────────────────────────────────────────────────────────
// Named domain hooks
//
// These return the query *data* (or `undefined` while loading) and mutation
// *functions*, so components can call them directly:
//   const stores = useAllStores()
//   await createStore({ name: 'Main' })
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ActivityLog,
  Batch,
  Category,
  Customer,
  Department,
  Product,
  Sale,
  SaleEdit,
  Store,
  User,
} from '#/types/entities';

// Query hook that unwraps React Query and returns just the data.
function useDataQuery<T>(
  queryKey: string,
  path: string,
  params?: QueryParams,
  enabled = true
): T | undefined {
  const { data } = useApiQuery<T>(queryKey, path, params, enabled);
  return data;
}

// Mutation hook that returns an async function: `await mutate(vars)`.
function useFnMutation<TVars = any, TData = any>(
  mutationKey: string,
  method: HttpMethod,
  path: string | ((vars: TVars) => string),
  invalidateKeys: string[] = []
) {
  const queryClient = useQueryClient();

  const mutation = useMutation<TData, Error, TVars>({
    mutationKey: [mutationKey],
    mutationFn: (vars) => {
      const resolvedPath = typeof path === 'function' ? path(vars) : path;
      switch (method) {
        case 'POST':
          return api.post<TData>(resolvedPath, vars);
        case 'PATCH':
          return api.patch<TData>(resolvedPath, vars);
        case 'DELETE':
          return api.delete<TData>(resolvedPath);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });

  return mutation.mutateAsync;
}

// ─── Departments ───────────────────────────────────────────────────────────

export function useAllDepartments() {
  return useDataQuery<Department[]>('departments.getAllDepartments', '/api/departments');
}

export function useCreateDepartment() {
  return useFnMutation<{ name: string; description?: string }>(
    'departments.createDepartment',
    'POST',
    '/api/departments',
    ['departments.getAllDepartments']
  );
}

export function useUpdateDepartment() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'departments.updateDepartment',
    'PATCH',
    (vars) => `/api/departments/${vars.id}`,
    ['departments.getAllDepartments']
  );
}

// ─── Categories ────────────────────────────────────────────────────────────

export function useAllCategories() {
  return useDataQuery<Category[]>('categories.getAllCategories', '/api/categories');
}

export function useCreateCategory() {
  return useFnMutation<{ name: string; departmentId: string; description?: string }>(
    'categories.createCategory',
    'POST',
    '/api/categories',
    ['categories.getAllCategories']
  );
}

export function useUpdateCategory() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'categories.updateCategory',
    'PATCH',
    (vars) => `/api/categories/${vars.id}`,
    ['categories.getAllCategories']
  );
}

// ─── Stores ────────────────────────────────────────────────────────────────

export function useAllStores() {
  return useDataQuery<Store[]>('stores.getAllStores', '/api/stores');
}

export function useCreateStore() {
  return useFnMutation<Record<string, any>>(
    'stores.createStore',
    'POST',
    '/api/stores',
    ['stores.getAllStores']
  );
}

export function useUpdateStore() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'stores.updateStore',
    'PATCH',
    (vars) => `/api/stores/${vars.id}`,
    ['stores.getAllStores']
  );
}

// ─── Store ↔ Department assignments ────────────────────────────────────────

export function useStoresByDepartment(departmentId?: string) {
  return useDataQuery<Store[]>(
    'storeDepartments.getStoresByDepartment',
    `/api/store-departments/by-department/${departmentId}`,
    undefined,
    !!departmentId
  );
}

export function useAssignDepartmentToStore() {
  return useFnMutation<{ storeId: string; departmentId: string }>(
    'storeDepartments.assignDepartmentToStore',
    'POST',
    '/api/store-departments',
    ['storeDepartments.getStoresByDepartment']
  );
}

export function useRemoveDepartmentFromStore() {
  return useFnMutation<{ storeId: string; departmentId: string }>(
    'storeDepartments.removeDepartmentFromStore',
    'DELETE',
    (vars) => `/api/store-departments?storeId=${vars.storeId}&departmentId=${vars.departmentId}`,
    ['storeDepartments.getStoresByDepartment']
  );
}

// ─── Products ──────────────────────────────────────────────────────────────

export function useActiveProducts() {
  return useDataQuery<Product[]>('products.getActiveProducts', '/api/products', {
    isActive: 'true',
  });
}

export function useCreateProduct() {
  return useFnMutation<Record<string, any>>(
    'products.createProduct',
    'POST',
    '/api/products',
    ['products.getActiveProducts']
  );
}

export function useUpdateProduct() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'products.updateProduct',
    'PATCH',
    (vars) => `/api/products/${vars.id}`,
    ['products.getActiveProducts']
  );
}

export function useProductsSeeded() {
  return useDataQuery<{ count: number }>('products.checkProductsSeeded', '/api/products/seed-status');
}

export function useSeedProducts() {
  return useFnMutation<Record<string, any>>(
    'products.seedProducts',
    'POST',
    '/api/products/seed',
    ['products.checkProductsSeeded', 'products.getActiveProducts']
  );
}

// ─── Employees ─────────────────────────────────────────────────────────────

export function useCreateEmployeeWithUser() {
  return useFnMutation<Record<string, any>>(
    'employees.createEmployeeWithUser',
    'POST',
    '/api/employees/with-user',
    // The Employees page reads this URL under `employees.getAllEmployees`
    // (see routes/dashboard/employees), not `employees.list` — invalidating only
    // the latter left the table stale after a create/edit.
    ['employees.list', 'employees.getAllEmployees']
  );
}

export function useUpdateEmployee() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'employees.updateEmployee',
    'PATCH',
    (vars) => `/api/employees/${vars.id}`,
    ['employees.list', 'employees.getAllEmployees']
  );
}

/**
 * Set (or reset) an employee's sign-in password. Admin/super_admin only.
 *
 * The PATCH body is the whole variables object, so the server receives
 * `{ id, password }`; it reads the id from the path and ignores the extra key.
 */
export function useSetEmployeePassword() {
  return useFnMutation<{ id: string; password: string }>(
    'employees.setPassword',
    'PATCH',
    (vars) => `/api/employees/${vars.id}/password`,
    ['employees.list', 'employees.getAllEmployees']
  );
}

// ─── Users ─────────────────────────────────────────────────────────────────

export function useUserProfile() {
  const { data } = useApiQuery<{ user: User }>('users.getUserProfile', '/api/users/me');
  return data?.user;
}

export function useUpdateProfile() {
  return useFnMutation<{ name?: string; image?: string }>(
    'users.updateProfile',
    'PATCH',
    '/api/users/me',
    ['users.getUserProfile']
  );
}

export function useUserActivityLogs(userId?: string) {
  return useDataQuery<ActivityLog[]>(
    'users.getUserActivityLogs',
    '/api/activity-logs',
    { userId },
    !!userId
  );
}

export function useUpdateUserStatus() {
  return useFnMutation<{ userId: string; status: 'active' | 'suspended' | 'banned' }>(
    'users.updateUserStatus',
    'PATCH',
    (vars) => `/api/users/${vars.userId}/status`,
    ['users.list']
  );
}

export function useDeleteUser() {
  return useFnMutation<{ userId: string }>(
    'users.deleteUser',
    'DELETE',
    (vars) => `/api/users/${vars.userId}`,
    ['users.list']
  );
}

// ─── Batches / inventory ───────────────────────────────────────────────────

export function useAddStockBatch() {
  return useFnMutation<Record<string, any>>(
    'inventory.addStockBatch',
    'POST',
    '/api/batches',
    ['batches.list', 'inventory.list']
  );
}

export function useBatchesByProduct(productId?: string) {
  return useDataQuery<Batch[]>(
    'inventory.getBatchesByMedication',
    '/api/batches',
    { productId },
    !!productId
  );
}

export function useDeleteStockBatch() {
  return useFnMutation<{ id: string }>(
    'inventory.deleteStockBatch',
    'DELETE',
    (vars) => `/api/batches/${vars.id}`,
    ['batches.list', 'inventory.getBatchesByMedication']
  );
}

// ─── Customers ─────────────────────────────────────────────────────────────

export function useSearchCustomersByName(name?: string) {
  return useDataQuery<Customer[]>(
    'customers.searchByName',
    '/api/customers',
    { search: name },
    !!name && name.trim().length > 0
  );
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export function useSaleById(saleId?: string) {
  const { data } = useApiQuery<{ sale: Sale }>(
    'sales.getSaleById',
    `/api/sales/${saleId}`,
    undefined,
    !!saleId
  );
  return data?.sale;
}

export function useUpdateSalePaymentMethod() {
  return useFnMutation<{ saleId: string; [key: string]: any }>(
    'sales.updateSalePaymentMethod',
    'PATCH',
    (vars) => `/api/sales/${vars.saleId}/payment`,
    ['sales.getSaleById', 'sales.list']
  );
}

export function useVoidSale() {
  return useFnMutation<{ saleId: string; reason?: string }>(
    'sales.voidSale',
    'POST',
    (vars) => `/api/sales/${vars.saleId}/void`,
    ['sales.getSaleById', 'sales.list']
  );
}

export function useRefundSale() {
  return useFnMutation<{ saleId: string; reason?: string }>(
    'sales.refundSale',
    'POST',
    (vars) => `/api/sales/${vars.saleId}/refund`,
    ['sales.getSaleById', 'sales.list']
  );
}

export function useCancelSale() {
  return useFnMutation<{ saleId: string; reason?: string }>(
    'sales.cancelSale',
    'POST',
    (vars) => `/api/sales/${vars.saleId}/cancel`,
    ['sales.getSaleById', 'sales.list']
  );
}

export function useSaleEditHistory(saleId?: string) {
  return useDataQuery<SaleEdit[]>(
    'sales.getSaleEditHistory',
    `/api/sales/${saleId}/edit-history`,
    undefined,
    !!saleId
  );
}
export function useProductSalesOverview(params?: QueryParams, enabled = true) {
  return useDataQuery<any>('sales.getProductSalesOverView', '/api/reports/sales-by-product', params, enabled);
}

// ─── Printing ──────────────────────────────────────────────────────────────

export function usePrintReceipt() {
  return useFnMutation<Record<string, any>>('print.printReceipt', 'POST', '/api/print/receipt');
}

// ─── Dashboard / medications / consultations ───────────────────────────────

export function useDashboardStats() {
  return useDataQuery<any>('dashboard.getStats', '/api/dashboard');
}

export function useMedicationStats() {
  return useDataQuery<any>('medications.getMedicationStats', '/api/medications/stats');
}

export function useAddMedication() {
  return useFnMutation<Record<string, any>>(
    'medications.addMedication',
    'POST',
    '/api/medications',
    ['medications.getMedicationStats']
  );
}

export function useUpdateMedication() {
  return useFnMutation<{ id: string; [key: string]: any }>(
    'medications.updateMedication',
    'PATCH',
    (vars) => `/api/medications/${vars.id}`,
    ['medications.getMedicationStats']
  );
}

export function useConsultationStats() {
  return useDataQuery<any>('consultations.getConsultationStats', '/api/consultations/stats');
}

// ─── Password management ───────────────────────────────────────────────────

export function useChangePassword() {
  return useFnMutation<{ currentPassword: string; newPassword: string }>(
    'auth.changePassword',
    'POST',
    '/api/auth/change-password'
  );
}

export function useRequestPasswordReset() {
  return useFnMutation<{ email: string }>(
    'auth.requestPasswordReset',
    'POST',
    '/api/auth/request-password-reset'
  );
}

export function useResetPassword() {
  return useFnMutation<{ email: string; code: string; newPassword: string }>(
    'auth.resetPassword',
    'POST',
    '/api/auth/reset-password'
  );
}