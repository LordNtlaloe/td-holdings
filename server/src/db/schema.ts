// ─────────────────────────────────────────────────────────────────────────────
// Drizzle ORM Schema — TD Inventory
// Target schema for the Turso (libSQL) database, using UUID primary keys
//
// Tables are ordered topologically so FK references always point to tables
// defined earlier. Circular references are handled by omitting the constraint
// on one side (enforced at the application layer).
// ─────────────────────────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Helpers ────────────────────────────────────────────────────────────────

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now());
const updatedAt = () => integer("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now());

// ═════════════════════════════════════════════════════════════════════════════
// TIER 1: Standalone tables (no FK dependencies)
// ═════════════════════════════════════════════════════════════════════════════

export const departments = sqliteTable("departments", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customers = sqliteTable("customers", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  notes: text("notes"),
  loyaltyPoints: real("loyalty_points").default(0),
  totalSpent: real("total_spent").default(0),
  lastPurchaseAt: integer("last_purchase_at", { mode: "number" }),
  visitCount: integer("visit_count").default(0),
  createdAt: integer("created_at", { mode: "number" }).$defaultFn(() => Date.now()),
  updatedAt: updatedAt(),
});

export const suppliers = sqliteTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 2: Tables that reference TIER 1
// ═════════════════════════════════════════════════════════════════════════════

export const stores = sqliteTable("stores", {
  id: id(),
  name: text("name").notNull(),
  type: text("type", { enum: ["central", "branch"] }).notNull(),
  address: text("address"),
  phone: text("phone").notNull(),
  xCoordinates: text("x_coordinates").notNull(),
  yCoordinates: text("y_coordinates").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  printAgentId: text("print_agent_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const categories = sqliteTable("categories", {
  id: id(),
  name: text("name").notNull(),
  departmentId: text("department_id").notNull().references(() => departments.id),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// NOTE: the SQL table is named `app_users` (not `users`) because the target
// database already contains an unrelated `users` table. Always reference this
// exported object rather than the table name.
export const users = sqliteTable("app_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["super_admin", "admin", "manager", "cashier"] }).notNull().default("cashier"),
  storeId: text("store_id"), // FK omitted to avoid circular ref; enforced app-level
  passwordHash: text("password_hash"), // stored here for simplicity
  image: text("image"),
  status: text("status", { enum: ["active", "suspended", "banned"] }).default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// NOTE: named `app_password_reset_tokens` to avoid colliding with an existing
// table of the same name in the target database.
export const passwordResetTokens = sqliteTable("app_password_reset_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  otp: text("otp").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 3: Tables that reference TIER 1 + TIER 2
// ═════════════════════════════════════════════════════════════════════════════

export const products = sqliteTable("products", {
  id: id(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  sizes: text("sizes"), // JSON array
  colors: text("colors"), // JSON array
  variants: text("variants"), // JSON array
  sizePricing: text("size_pricing"), // JSON array of {size, costPrice, sellingPrice}
  costPrice: real("cost_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const employees = sqliteTable("employees", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  storeId: text("store_id").notNull().references(() => stores.id),
  role: text("role", { enum: ["super_admin", "admin", "manager", "cashier"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const storeDepartments = sqliteTable("store_departments", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  createdAt: createdAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 4: Inventory / Batches
// ═════════════════════════════════════════════════════════════════════════════

export const inventory = sqliteTable("inventory", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  productId: text("product_id").notNull().references(() => products.id),
  reorderLevel: real("reorder_level"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const batches = sqliteTable("batches", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id),
  storeId: text("store_id").notNull().references(() => stores.id),
  batchNumber: text("batch_number").notNull(),
  /**
   * Size this batch belongs to. Only used by products whose price varies by size
   * (`products.sizePricing`); NULL for single-size products — which is how every
   * migrated batch is stored.
   */
  size: text("size"),
  quantity: real("quantity").notNull(),
  costPrice: real("cost_price").notNull(),
  receivedAt: integer("received_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 5: Transfers
// ═════════════════════════════════════════════════════════════════════════════

export const transfers = sqliteTable("transfers", {
  id: id(),
  fromStoreId: text("from_store_id").notNull().references(() => stores.id),
  toStoreId: text("to_store_id").notNull().references(() => stores.id),
  status: text("status", { enum: ["pending", "in_transit", "received", "cancelled"] }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  receivedAt: integer("received_at", { mode: "number" }),
  updatedAt: updatedAt(),
});

export const transferItems = sqliteTable("transfer_items", {
  id: id(),
  transferId: text("transfer_id").notNull().references(() => transfers.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantityRequested: real("quantity_requested").notNull(),
  quantityReceived: real("quantity_received"),
  createdAt: createdAt(),
});

export const transferItemBatches = sqliteTable("transfer_item_batches", {
  id: id(),
  transferItemId: text("transfer_item_id").notNull().references(() => transferItems.id),
  batchId: text("batch_id").notNull().references(() => batches.id),
  side: text("side", { enum: ["source", "destination"] }).notNull(),
  quantity: real("quantity").notNull(),
  createdAt: createdAt(),
});

export const transferDiscrepancies = sqliteTable("transfer_discrepancies", {
  id: id(),
  transferItemId: text("transfer_item_id").notNull().references(() => transferItems.id),
  expectedQty: real("expected_qty").notNull(),
  receivedQty: real("received_qty").notNull(),
  reason: text("reason").notNull(),
  reportedBy: text("reported_by").notNull().references(() => users.id),
  reportedAt: integer("reported_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 6: Purchases
// ═════════════════════════════════════════════════════════════════════════════

export const purchases = sqliteTable("purchases", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status", { enum: ["received", "pending", "cancelled"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: updatedAt(),
});

export const purchaseItems = sqliteTable("purchase_items", {
  id: id(),
  purchaseId: text("purchase_id").notNull().references(() => purchases.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull(),
  costPrice: real("cost_price").notNull(),
  batchNumber: text("batch_number").notNull(),
  batchId: text("batch_id").references(() => batches.id),
  createdAt: createdAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 7: Sales
// ═════════════════════════════════════════════════════════════════════════════

export const sales = sqliteTable("sales", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  customerId: text("customer_id").references(() => customers.id),
  totalAmount: real("total_amount").notNull(),
  discountTotal: real("discount_total").default(0),
  status: text("status", { enum: ["completed", "refunded", "voided", "cancelled"] }).notNull().default("completed"),
  paymentMethod: text("payment_method").notNull(),
  paymentSplits: text("payment_splits"), // JSON string
  amountReceived: real("amount_received"),
  changeDue: real("change_due"),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  cancelledAt: integer("cancelled_at", { mode: "number" }),
  cancelledBy: text("cancelled_by").references(() => users.id),
  cancelledReason: text("cancelled_reason"),
  originalSaleId: text("original_sale_id"), // self-ref FK omitted
  updatedAt: updatedAt(),
});

export const saleItems = sqliteTable("sale_items", {
  id: id(),
  saleId: text("sale_id").notNull().references(() => sales.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  size: text("size"),
  color: text("color"),
  variant: text("variant"),
  originalSaleItemId: text("original_sale_item_id"), // self-ref FK omitted
  createdAt: createdAt(),
});

export const saleItemBatches = sqliteTable("sale_item_batches", {
  id: id(),
  saleItemId: text("sale_item_id").notNull().references(() => saleItems.id),
  batchId: text("batch_id").notNull().references(() => batches.id),
  quantity: real("quantity").notNull(),
  restoredAt: integer("restored_at", { mode: "number" }),
  createdAt: createdAt(),
});

export const saleDiscounts = sqliteTable("sale_discounts", {
  id: id(),
  saleId: text("sale_id").notNull().references(() => sales.id),
  productId: text("product_id").notNull().references(() => products.id),
  discountAmount: real("discount_amount").notNull(),
  reason: text("reason"),
  createdAt: createdAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 8: Audit / Ledger / Activity
// ═════════════════════════════════════════════════════════════════════════════

export const cancelledSales = sqliteTable("cancelled_sales", {
  id: id(),
  originalSaleId: text("original_sale_id").notNull().references(() => sales.id),
  cancelledSaleId: text("cancelled_sale_id").notNull().references(() => sales.id),
  cancelledAt: integer("cancelled_at", { mode: "number" }).notNull(),
  cancelledBy: text("cancelled_by").notNull().references(() => users.id),
  reason: text("reason"),
  originalData: text("original_data").notNull(), // JSON
  createdAt: createdAt(),
});

export const saleEdits = sqliteTable("sale_edits", {
  id: id(),
  saleId: text("sale_id").notNull().references(() => sales.id),
  editedBy: text("edited_by").notNull().references(() => users.id),
  editedAt: integer("edited_at", { mode: "number" }).notNull(),
  reason: text("reason").notNull(),
  changes: text("changes").notNull(), // JSON
  originalData: text("original_data").notNull(), // JSON
  newData: text("new_data").notNull(), // JSON
  createdAt: createdAt(),
});

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  referenceType: text("reference_type", { enum: ["sale", "purchase", "manual", "cancellation"] }),
  saleId: text("sale_id").references(() => sales.id),
  purchaseId: text("purchase_id").references(() => purchases.id),
  cancelledSaleId: text("cancelled_sale_id").references(() => sales.id),
  date: integer("date", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 9: Invoices
// ═════════════════════════════════════════════════════════════════════════════

export const invoices = sqliteTable("invoices", {
  id: id(),
  storeId: text("store_id").notNull().references(() => stores.id),
  docType: text("doc_type", { enum: ["quotation", "proforma", "invoice"] }).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  status: text("status", { enum: ["unpaid", "paid", "cancelled"] }).notNull().default("unpaid"),
  totalAmount: real("total_amount").notNull(),
  discountTotal: real("discount_total"),
  validUntil: integer("valid_until", { mode: "number" }),
  notes: text("notes"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  paidAt: integer("paid_at", { mode: "number" }),
  convertedFromId: text("converted_from_id"), // self-ref FK omitted
  convertedToSaleId: text("converted_to_sale_id").references(() => sales.id),
  updatedAt: updatedAt(),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: id(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  size: text("size"),
  color: text("color"),
  variant: text("variant"),
  createdAt: createdAt(),
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 10: Medications & Consultations
// ═════════════════════════════════════════════════════════════════════════════

export const medications = sqliteTable("medications", {
  id: id(),
  name: text("name").notNull(),
  sku: text("sku"),
  description: text("description"),
  price: real("price").notNull().default(0),
  quantity: real("quantity").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const consultations = sqliteTable("consultations", {
  id: id(),
  customerId: text("customer_id"),
  notes: text("notes"),
  status: text("status").notNull().default("completed"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});