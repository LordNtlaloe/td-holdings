-- Create indexes for better query performance
-- Run after the schema has been created (drizzle-kit generate + migrate)

-- Stores
CREATE INDEX IF NOT EXISTS idx_stores_type ON stores(type);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);

-- Users (table is `app_users` to avoid colliding with another app's `users`)
CREATE INDEX IF NOT EXISTS idx_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_users_store ON app_users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON app_users(status);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_store ON employees(store_id);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_department ON categories(department_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_department ON products(department_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Store Departments
CREATE INDEX IF NOT EXISTS idx_store_depts_store ON store_departments(store_id);
CREATE INDEX IF NOT EXISTS idx_store_depts_dept ON store_departments(department_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_product ON inventory(store_id, product_id);

-- Batches
CREATE INDEX IF NOT EXISTS idx_batches_store_product ON batches(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_store ON batches(store_id);
CREATE INDEX IF NOT EXISTS idx_batches_received ON batches(received_at);

-- Transfers
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_store_id);

-- Transfer Items
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON transfer_items(transfer_id);

-- Transfer Item Batches
CREATE INDEX IF NOT EXISTS idx_transfer_item_batches_item ON transfer_item_batches(transfer_item_id);
CREATE INDEX IF NOT EXISTS idx_transfer_item_batches_batch ON transfer_item_batches(batch_id);

-- Transfer Discrepancies
CREATE INDEX IF NOT EXISTS idx_transfer_discrepancies_item ON transfer_discrepancies(transfer_item_id);

-- Ledger
CREATE INDEX IF NOT EXISTS idx_ledger_store ON ledger_entries(store_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);

-- Purchases
CREATE INDEX IF NOT EXISTS idx_purchases_store ON purchases(store_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

-- Purchase Items
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- Sales
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_original ON sales(original_sale_id);

-- Sale Items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Sale Item Batches
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_item ON sale_item_batches(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_batches_batch ON sale_item_batches(batch_id);

-- Sale Discounts
CREATE INDEX IF NOT EXISTS idx_sale_discounts_sale ON sale_discounts(sale_id);

-- Cancelled Sales
CREATE INDEX IF NOT EXISTS idx_cancelled_sales_original ON cancelled_sales(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_sales_cancelled ON cancelled_sales(cancelled_sale_id);

-- Sale Edits
CREATE INDEX IF NOT EXISTS idx_sale_edits_sale ON sale_edits(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_edits_editor ON sale_edits(edited_by);

-- Activity Logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_store ON invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(doc_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Invoice Items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);