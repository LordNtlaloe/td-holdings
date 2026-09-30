import { Hono } from "hono";
import { eq, and, desc, like } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const productRoutes = new Hono<AuthEnv>();

// YYYY-MM-DD in local time — used to bucket activity logs per day.
function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// GET /api/products/details — products enriched with their category, department,
// per-store stock and lifetime units sold.
//
// The Products page table AND its stat cards read this; without it the whole
// page reported 0 products. Must stay registered before `/:id`, otherwise
// "details" is matched as a product id.
productRoutes.get("/details", async (c) => {
  try {
    getUser(c);

    const [allProducts, allCategories, allDepartments, allBatches, allSaleItems] =
      await Promise.all([
        db.select().from(schema.products).all(),
        db.select().from(schema.categories).all(),
        db.select().from(schema.departments).all(),
        db.select().from(schema.batches).all(),
        db.select().from(schema.saleItems).all(),
      ]);

    const categoryById = new Map(allCategories.map((cat) => [cat.id, cat]));
    const departmentById = new Map(allDepartments.map((dept) => [dept.id, dept]));

    const stockByProduct = new Map<string, number>();
    const storesByProduct = new Map<string, Set<string>>();
    for (const batch of allBatches) {
      stockByProduct.set(
        batch.productId,
        (stockByProduct.get(batch.productId) ?? 0) + batch.quantity
      );
      let stores = storesByProduct.get(batch.productId);
      if (!stores) {
        stores = new Set<string>();
        storesByProduct.set(batch.productId, stores);
      }
      stores.add(batch.storeId);
    }

    const unitsSoldByProduct = new Map<string, number>();
    for (const item of allSaleItems) {
      unitsSoldByProduct.set(
        item.productId,
        (unitsSoldByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    // `sizes` / `colors` / `variants` / `sizePricing` are left as JSON text —
    // the API client parses those columns on the way in.
    return c.json({
      products: allProducts.map((product) => ({
        ...product,
        category: categoryById.get(product.categoryId) ?? null,
        department: departmentById.get(product.departmentId) ?? null,
        totalStock: stockByProduct.get(product.id) ?? 0,
        totalSales: unitsSoldByProduct.get(product.id) ?? 0,
        storeCount: storesByProduct.get(product.id)?.size ?? 0,
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// Which activity-log action rolls up into which chart series.
const PRODUCT_ACTIVITY_SERIES: Record<string, string> = {
  "product.create": "Created",
  "product.seed": "Created",
  "product.update": "Updated",
  "product.delete": "Deleted",
  "product.deactivate": "Deactivated",
  "product.reactivate": "Reactivated",
};

// GET /api/products/stats/activity — product operations per day, most recent
// last, shaped for the "Product Activity" chart ("operations over the last 7
// days"). Returns Mon..Sun-style labels, one bucket per day.
productRoutes.get("/stats/activity", async (c) => {
  try {
    getUser(c);
    const logs = await db.select().from(schema.activityLogs).all();

    const DAY_MS = 86_400_000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * DAY_MS);
      days.push({
        key: dateKey(date),
        label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      });
    }

    const emptyBucket = () => ({
      Created: 0,
      Updated: 0,
      Deleted: 0,
      Deactivated: 0,
      Reactivated: 0,
    });
    const buckets = new Map(days.map((day) => [day.key, emptyBucket()]));

    for (const log of logs) {
      if (log.entityType !== "products") continue;
      const series = PRODUCT_ACTIVITY_SERIES[log.action];
      if (!series) continue;
      const bucket = buckets.get(dateKey(new Date(log.createdAt)));
      if (!bucket) continue;
      (bucket as any)[series] += 1;
    }

    return c.json({
      activity: days.map((day) => ({ label: day.label, ...buckets.get(day.key) })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/products — list with optional filters
productRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const { departmentId, categoryId, isActive, search } = c.req.query();

    let conditions = [];
    if (departmentId) conditions.push(eq(schema.products.departmentId, departmentId));
    if (categoryId) conditions.push(eq(schema.products.categoryId, categoryId));
    if (isActive !== undefined) conditions.push(eq(schema.products.isActive, isActive === "true"));

    let query = db.select().from(schema.products);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    if (search) {
      query = (query as any).where(like(schema.products.name, `%${search}%`));
    }

    const products = await query.orderBy(desc(schema.products.createdAt)).all();
    return c.json({ products });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/products/seed-status — number of products currently stored
productRoutes.get("/seed-status", async (c) => {
  try {
    getUser(c);
    const rows = await db.select({ id: schema.products.id }).from(schema.products).all();
    return c.json({ count: rows.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/products/seed — insert a default catalogue when the table is empty
productRoutes.post("/seed", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);

    const existing = await db.select({ id: schema.products.id }).from(schema.products).all();
    if (existing.length > 0) {
      return c.json({ inserted: 0 });
    }

    // Products require a category + department (FKs). Reuse existing rows if
    // present, otherwise create a sensible default pair.
    let department = await db.select().from(schema.departments).get();
    if (!department) {
      department = await db.insert(schema.departments).values({
        name: "General",
        description: "Default department created during product seeding",
      }).returning().get();
    }

    let category = await db.select().from(schema.categories)
      .where(eq(schema.categories.departmentId, department.id)).get();
    if (!category) {
      category = await db.insert(schema.categories).values({
        name: "General",
        departmentId: department.id,
        description: "Default category created during product seeding",
      }).returning().get();
    }

    const catalogue = [
      { name: "Paracetamol 500mg Tablets", sku: "MED-PAR-500", description: "Pain relief and fever reducer, pack of 24", costPrice: 12.5, sellingPrice: 24.99 },
      { name: "Vitamin C 1000mg Tablets", sku: "MED-VITC-1000", description: "Immune support, pack of 30", costPrice: 18.0, sellingPrice: 34.99 },
      { name: "Digital Thermometer", sku: "DEV-THERM-01", description: "Fast-read digital body thermometer", costPrice: 45.0, sellingPrice: 89.99 },
      { name: "Hand Sanitiser 500ml", sku: "HYG-SAN-500", description: "Alcohol-based hand sanitiser gel", costPrice: 22.0, sellingPrice: 42.5 },
      { name: "Blood Pressure Monitor", sku: "DEV-BPM-01", description: "Automatic upper-arm blood pressure monitor", costPrice: 320.0, sellingPrice: 549.0 },
      { name: "Adhesive Bandages (Assorted)", sku: "MED-BAND-ASST", description: "Assorted sizes, pack of 50", costPrice: 15.0, sellingPrice: 29.99 },
    ];

    let inserted = 0;
    for (const item of catalogue) {
      const product = await db.insert(schema.products).values({
        name: item.name,
        sku: item.sku,
        categoryId: category.id,
        departmentId: department.id,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        description: item.description,
      }).returning().get();
      if (product) inserted++;
    }

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "product.seed",
      entityType: "products", entityId: null,
      description: `Seeded default product catalogue (${inserted} products)`,
    }).run();

    return c.json({ inserted });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// GET /api/products/active — only active products.
// Migrated callers (POS, new-invoice) expect a bare array and call `.filter`
// on it directly, so this is deliberately unwrapped.
productRoutes.get("/active", async (c) => {
  try {
    getUser(c);
    const products = await db.select().from(schema.products)
      .where(eq(schema.products.isActive, true))
      .orderBy(desc(schema.products.createdAt))
      .all();
    return c.json(products);
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/products/all — every product (wrapped, matching GET /api/products)
productRoutes.get("/all", async (c) => {
  try {
    getUser(c);
    const products = await db.select().from(schema.products)
      .orderBy(desc(schema.products.createdAt))
      .all();
    return c.json({ products });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/products/:id — include category & department
productRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const product = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
    if (!product) return c.json({ error: "Product not found" }, 404);

    const [category, department] = await Promise.all([
      db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).get(),
      db.select().from(schema.departments).where(eq(schema.departments.id, product.departmentId)).get(),
    ]);

    // Parse JSON fields
    const sizes = product.sizes ? JSON.parse(product.sizes) : null;
    const colors = product.colors ? JSON.parse(product.colors) : null;
    const variants = product.variants ? JSON.parse(product.variants) : null;
    const sizePricing = product.sizePricing ? JSON.parse(product.sizePricing) : null;

    return c.json({ product: { ...product, sizes, colors, variants, sizePricing, category, department } });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/products
productRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();
    const { name, sku, categoryId, departmentId, costPrice, sellingPrice, description, sizes, colors, variants, sizePricing } = body;

    if (!name || !sku || !categoryId || !departmentId || costPrice === undefined || sellingPrice === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const product = await db.insert(schema.products).values({
      name, sku, categoryId, departmentId,
      costPrice, sellingPrice, description,
      sizes: sizes ? JSON.stringify(sizes) : undefined,
      colors: colors ? JSON.stringify(colors) : undefined,
      variants: variants ? JSON.stringify(variants) : undefined,
      sizePricing: sizePricing ? JSON.stringify(sizePricing) : undefined,
    }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "product.create",
      entityType: "products", entityId: product!.id,
      description: `Created product "${name}" (${sku})`,
    }).run();

    return c.json({ product }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/products/:id
productRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
    if (!existing) return c.json({ error: "Product not found" }, 404);

    const body = await c.req.json();
    const updates: Record<string, any> = { updatedAt: Date.now() };
    const fields = ["name", "sku", "categoryId", "departmentId", "costPrice", "sellingPrice", "description", "isActive"];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    if (body.sizes !== undefined) updates.sizes = JSON.stringify(body.sizes);
    if (body.colors !== undefined) updates.colors = JSON.stringify(body.colors);
    if (body.variants !== undefined) updates.variants = JSON.stringify(body.variants);
    if (body.sizePricing !== undefined) updates.sizePricing = JSON.stringify(body.sizePricing);

    await db.update(schema.products).set(updates).where(eq(schema.products.id, id)).run();
    const product = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "product.update",
      entityType: "products", entityId: id,
      description: `Updated product "${existing.name}"`,
    }).run();

    return c.json({ product });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/products/:id — soft-delete
productRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
    if (!existing) return c.json({ error: "Product not found" }, 404);

    await db.update(schema.products).set({ isActive: false, updatedAt: Date.now() }).where(eq(schema.products.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "product.deactivate",
      entityType: "products", entityId: id,
      description: `Deactivated product "${existing.name}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});