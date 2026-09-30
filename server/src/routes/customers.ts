import { Hono } from "hono";
import { eq, desc, like, or, and } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";

export const customerRoutes = new Hono<AuthEnv>();

// GET /api/customers — list with optional search
customerRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const search = c.req.query("search");

    let query = db.select().from(schema.customers);
    if (search) {
      query = query.where(
        or(
          like(schema.customers.name, `%${search}%`),
          like(schema.customers.phone, `%${search}%`),
          like(schema.customers.email, `%${search}%`)
        )
      ) as any;
    }
    const customers = await query.orderBy(desc(schema.customers.createdAt)).all();
    return c.json({ customers });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/customers/top — customers enriched with sales stats, ordered by
// total spend. Migrated callers expect a bare array (they call `.filter`/`.sort`
// on it directly), so this is deliberately unwrapped.
customerRoutes.get("/top", async (c) => {
  try {
    getUser(c);
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const storeId = c.req.query("storeId");

    const [allCustomers, allSales] = await Promise.all([
      db.select().from(schema.customers).all(),
      db.select().from(schema.sales).all(),
    ]);

    const enriched = allCustomers.map((customer) => {
      const sales = allSales.filter(
        (s) => s.customerId === customer.id && (!storeId || s.storeId === storeId)
      );
      const salesTotal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const lastPurchase = sales.length
        ? Math.max(...sales.map((s) => s.createdAt))
        : null;

      return {
        ...customer,
        // Prefer the value derived from actual sales, but fall back to the
        // denormalised column when there is no sales history yet.
        totalSpent: sales.length > 0 ? salesTotal : (customer.totalSpent ?? 0),
        salesCount: sales.length,
        lastPurchase,
        lastPurchaseAt: lastPurchase,
      };
    });

    const top = enriched
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, Number.isNaN(limit) ? 20 : limit);

    return c.json(top);
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/customers/:id — with sales history
customerRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
    if (!customer) return c.json({ error: "Customer not found" }, 404);

    const sales = await db.select().from(schema.sales)
      .where(eq(schema.sales.customerId, id))
      .orderBy(desc(schema.sales.createdAt))
      .all();

    // Enrich sales with store names and items
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        const store = await db.select().from(schema.stores).where(eq(schema.stores.id, sale.storeId)).get();
        const items = await db.select().from(schema.saleItems)
          .where(eq(schema.saleItems.saleId, sale.id))
          .all();

        const itemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const product = await db.select().from(schema.products).where(eq(schema.products.id, item.productId)).get();
            return { ...item, productName: product?.name || "Unknown", productSku: product?.sku || "" };
          })
        );

        return {
          ...sale,
          storeName: store?.name || "Unknown",
          items: itemsWithProducts,
          itemCount: itemsWithProducts.reduce((sum, i) => sum + i.quantity, 0),
        };
      })
    );

    return c.json({ customer, sales: salesWithDetails });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/customers
customerRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    const { name, email, phone, notes } = await c.req.json();

    if (!name) return c.json({ error: "Name is required" }, 400);

    const customer = await db.insert(schema.customers).values({ name, email, phone, notes }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "customer.create",
      entityType: "customers", entityId: customer!.id,
      description: `Created customer "${name}"`,
    }).run();

    return c.json({ customer }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/customers/:id
customerRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
    if (!existing) return c.json({ error: "Customer not found" }, 404);

    const { name, email, phone, notes, isActive } = await c.req.json();
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;
    if (isActive !== undefined) updates.isActive = isActive;
    updates.updatedAt = Date.now();

    await db.update(schema.customers).set(updates).where(eq(schema.customers.id, id)).run();
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();

    return c.json({ customer });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/customers/find-or-create
customerRoutes.post("/find-or-create", async (c) => {
  try {
    const user = getUser(c);
    const { phone, name } = await c.req.json();

    if (!phone && !name) return c.json({ error: "Phone or name required" }, 400);

    // Try to find by phone first, then by name
    let customer = null;
    if (phone) {
      customer = await db.select().from(schema.customers).where(eq(schema.customers.phone, phone)).get();
    }
    if (!customer && name) {
      customer = await db.select().from(schema.customers).where(eq(schema.customers.name, name)).get();
    }

    if (!customer) {
      customer = await db.insert(schema.customers).values({ name: name || phone || "Unknown", phone }).returning().get();
    }

    return c.json({ customer });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});