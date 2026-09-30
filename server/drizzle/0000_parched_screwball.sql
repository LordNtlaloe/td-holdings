CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`store_id` text NOT NULL,
	`batch_number` text NOT NULL,
	`quantity` real NOT NULL,
	`cost_price` real NOT NULL,
	`received_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cancelled_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`original_sale_id` text NOT NULL,
	`cancelled_sale_id` text NOT NULL,
	`cancelled_at` integer NOT NULL,
	`cancelled_by` text NOT NULL,
	`reason` text,
	`original_data` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`original_sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department_id` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`notes` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`is_active` integer DEFAULT true,
	`notes` text,
	`loyalty_points` real DEFAULT 0,
	`total_spent` real DEFAULT 0,
	`last_purchase_at` integer,
	`visit_count` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`reorder_level` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`size` text,
	`color` text,
	`variant` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`doc_type` text NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` text,
	`customer_name` text,
	`customer_phone` text,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`total_amount` real NOT NULL,
	`discount_total` real,
	`valid_until` integer,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	`converted_from_id` text,
	`converted_to_sale_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_to_sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`reference_type` text,
	`sale_id` text,
	`purchase_id` text,
	`cancelled_sale_id` text,
	`date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`price` real DEFAULT 0 NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`otp` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`category_id` text NOT NULL,
	`department_id` text NOT NULL,
	`sizes` text,
	`colors` text,
	`variants` text,
	`size_pricing` text,
	`cost_price` real NOT NULL,
	`selling_price` real NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` real NOT NULL,
	`cost_price` real NOT NULL,
	`batch_number` text NOT NULL,
	`batch_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`supplier_id` text,
	`total_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`discount_amount` real NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`edited_by` text NOT NULL,
	`edited_at` integer NOT NULL,
	`reason` text NOT NULL,
	`changes` text NOT NULL,
	`original_data` text NOT NULL,
	`new_data` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edited_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_item_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_item_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`quantity` real NOT NULL,
	`restored_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`size` text,
	`color` text,
	`variant` text,
	`original_sale_item_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`customer_id` text,
	`total_amount` real NOT NULL,
	`discount_total` real DEFAULT 0,
	`status` text DEFAULT 'completed' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_splits` text,
	`amount_received` real,
	`change_due` real,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	`cancelled_by` text,
	`cancelled_reason` text,
	`original_sale_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `store_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`department_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`address` text,
	`phone` text NOT NULL,
	`x_coordinates` text NOT NULL,
	`y_coordinates` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`print_agent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfer_discrepancies` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_item_id` text NOT NULL,
	`expected_qty` real NOT NULL,
	`received_qty` real NOT NULL,
	`reason` text NOT NULL,
	`reported_by` text NOT NULL,
	`reported_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transfer_item_id`) REFERENCES `transfer_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reported_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfer_item_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_item_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`side` text NOT NULL,
	`quantity` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transfer_item_id`) REFERENCES `transfer_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfer_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_requested` real NOT NULL,
	`quantity_received` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_store_id` text NOT NULL,
	`to_store_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`received_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`from_store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`store_id` text,
	`password_hash` text,
	`image` text,
	`status` text DEFAULT 'active',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);