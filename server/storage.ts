import { users, categories, products, transfers, orders, orderItems, exchangeRates, services, admins, visits, paymentMethods, emailCampaigns, afterpayReminders, type User, type InsertUser, type Category, type InsertCategory, type Product, type InsertProduct, type Transfer, type InsertTransfer, type Order, type InsertOrder, type OrderItem, type InsertOrderItem, type ExchangeRate, type InsertExchangeRate, type Service, type InsertService, type Admin, type InsertAdmin, type InsertVisit, type PaymentMethod, type InsertPaymentMethod, type EmailCampaign } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface VisitStats {
  totalPageViews: number;
  uniqueVisitors: number;
  visitorsToday: number;
  visitors7d: number;
  visitors30d: number;
  daily: { date: string; visitors: number }[];
}

export interface AdminUserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  transferCount: number;
  orderCount: number;
}

export interface IStorage {
  // Health check
  healthCheck(): Promise<boolean>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Transfers
  getTransfersByUser(userId: number): Promise<Transfer[]>;
  getAllTransfers(): Promise<Transfer[]>;
  getTransfer(id: number): Promise<Transfer | undefined>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransferStatus(id: number, status: string, squarePaymentId?: string, paymentMethod?: string): Promise<Transfer | undefined>;
  getAfterpayTransfers(): Promise<Transfer[]>;
  getDatabaseBackup(): Promise<Record<string, any>>;
  restoreFromBackup(tables: Record<string, any[]>): Promise<Record<string, number>>;
  hasAfterpayReminder(transferId: number, installment: number): Promise<boolean>;
  recordAfterpayReminder(transferId: number, installment: number): Promise<void>;

  // Orders
  getOrdersByUser(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;

  // Visites / analytics
  recordVisit(visit: InsertVisit): Promise<void>;
  getVisitStats(): Promise<VisitStats>;

  // Administration des utilisateurs
  getAllUsersWithStats(): Promise<AdminUserRow[]>;
  deleteUserById(id: number): Promise<void>;
  bulkInsertUsers(rows: (typeof users.$inferInsert)[]): Promise<number>;
  getUserIdByLegacyId(legacyId: number): Promise<number | undefined>;
  getLegacyUserIdMap(): Promise<Map<number, number>>;
  bulkInsertTransfers(rows: (typeof transfers.$inferInsert)[]): Promise<number>;

  // Mailing / campagnes email
  getMailableUsers(): Promise<{ id: number; email: string; firstName: string }[]>;
  getUsersByEmails(emails: string[]): Promise<{ id: number; email: string; emailOptOut: boolean }[]>;
  setEmailOptOut(userId: number): Promise<void>;
  createCampaign(data: { subject: string; body: string; audience: string; total: number }): Promise<EmailCampaign>;
  updateCampaign(id: number, data: Partial<{ sent: number; failed: number; status: string }>): Promise<void>;
  getCampaigns(): Promise<EmailCampaign[]>;

  // Moyens de paiement
  getPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(pm: InsertPaymentMethod): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderBySquarePaymentId(squarePaymentId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, squarePaymentId?: string): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Admin - Exchange Rates
  getExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: number, rate: InsertExchangeRate): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: number): Promise<boolean>;

  // Admin - Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: InsertService): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Admin - Products Management
  updateProduct(id: number, product: InsertProduct): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Admin Management
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminLastLogin(id: number): Promise<void>;
  getAllAdmins(): Promise<Admin[]>;
  updateAdmin(id: number, data: Partial<{ password: string; isActive: boolean; role: string; firstName: string; lastName: string }>): Promise<Admin | undefined>;
  deleteAdmin(id: number): Promise<void>;
  countAdmins(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async healthCheck(): Promise<boolean> {
    try {
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async getTransfersByUser(userId: number): Promise<Transfer[]> {
    return await db.select().from(transfers).where(eq(transfers.userId, userId)).orderBy(desc(transfers.createdAt));
  }

  async getAllTransfers(): Promise<Transfer[]> {
    return await db.select().from(transfers).orderBy(desc(transfers.createdAt));
  }

  // Restauration depuis un backup JSON. Remplace intégralement les données
  // (transaction : tout ou rien). Ordre parents → enfants pour respecter les
  // clés étrangères ; séquences d'auto-incrément réalignées après insertion.
  async restoreFromBackup(
    tables: Record<string, any[]>,
  ): Promise<Record<string, number>> {
    const mapRow = (row: any) => {
      const out: any = {};
      for (const k of Object.keys(row)) {
        const v = row[k];
        out[k] =
          typeof v === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)
            ? new Date(v)
            : v;
      }
      return out;
    };
    // [clé backup, table drizzle, nom table SQL]
    const insertOrder: [string, any, string][] = [
      ["categories", categories, "categories"],
      ["users", users, "users"],
      ["admins", admins, "admins"],
      ["products", products, "products"],
      ["services", services, "services"],
      ["exchange_rates", exchangeRates, "exchange_rates"],
      ["transfers", transfers, "transfers"],
      ["orders", orders, "orders"],
      ["order_items", orderItems, "order_items"],
      ["visits", visits, "visits"],
      ["payment_methods", paymentMethods, "payment_methods"],
      ["email_campaigns", emailCampaigns, "email_campaigns"],
      ["afterpay_reminders", afterpayReminders, "afterpay_reminders"],
    ];
    const counts: Record<string, number> = {};
    await db.transaction(async (tx) => {
      // Vider dans l'ordre inverse (enfants d'abord)
      for (let i = insertOrder.length - 1; i >= 0; i--) {
        await tx.delete(insertOrder[i][1]);
      }
      // Réinsérer parents → enfants
      for (const [key, table, dbName] of insertOrder) {
        const rows = Array.isArray(tables[key]) ? tables[key] : [];
        counts[key] = rows.length;
        const mapped = rows.map(mapRow);
        const chunk = 500;
        for (let i = 0; i < mapped.length; i += chunk) {
          const slice = mapped.slice(i, i + chunk);
          if (slice.length > 0) await tx.insert(table).values(slice);
        }
        await tx.execute(
          sql`SELECT setval(pg_get_serial_sequence(${dbName}, 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM ${sql.raw(dbName)}), 1))`,
        );
      }
    });
    return counts;
  }

  // Sauvegarde complète (toutes les tables) — export applicatif JSON
  async getDatabaseBackup(): Promise<Record<string, any>> {
    const [
      usersR,
      adminsR,
      categoriesR,
      productsR,
      servicesR,
      transfersR,
      ordersR,
      orderItemsR,
      exchangeRatesR,
      visitsR,
      paymentMethodsR,
      emailCampaignsR,
      afterpayRemindersR,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(admins),
      db.select().from(categories),
      db.select().from(products),
      db.select().from(services),
      db.select().from(transfers),
      db.select().from(orders),
      db.select().from(orderItems),
      db.select().from(exchangeRates),
      db.select().from(visits),
      db.select().from(paymentMethods),
      db.select().from(emailCampaigns),
      db.select().from(afterpayReminders),
    ]);
    return {
      users: usersR,
      admins: adminsR,
      categories: categoriesR,
      products: productsR,
      services: servicesR,
      transfers: transfersR,
      orders: ordersR,
      order_items: orderItemsR,
      exchange_rates: exchangeRatesR,
      visits: visitsR,
      payment_methods: paymentMethodsR,
      email_campaigns: emailCampaignsR,
      afterpay_reminders: afterpayRemindersR,
    };
  }

  async getAfterpayTransfers(): Promise<Transfer[]> {
    return await db
      .select()
      .from(transfers)
      .where(
        and(
          eq(transfers.paymentMethod, "afterpay"),
          eq(transfers.status, "completed"),
        ),
      );
  }

  async hasAfterpayReminder(
    transferId: number,
    installment: number,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: afterpayReminders.id })
      .from(afterpayReminders)
      .where(
        and(
          eq(afterpayReminders.transferId, transferId),
          eq(afterpayReminders.installment, installment),
        ),
      );
    return !!row;
  }

  async recordAfterpayReminder(
    transferId: number,
    installment: number,
  ): Promise<void> {
    await db
      .insert(afterpayReminders)
      .values({ transferId, installment })
      .onConflictDoNothing();
  }

  async getTransfer(id: number): Promise<Transfer | undefined> {
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id));
    return transfer || undefined;
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const [transfer] = await db
      .insert(transfers)
      .values(insertTransfer)
      .returning();
    return transfer;
  }

  async updateTransferStatus(id: number, status: string, squarePaymentId?: string, paymentMethod?: string): Promise<Transfer | undefined> {
    const updateData: any = { status };
    if (squarePaymentId) {
      updateData.squarePaymentId = squarePaymentId;
    }
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    const [transfer] = await db
      .update(transfers)
      .set(updateData)
      .where(eq(transfers.id, id))
      .returning();
    return transfer || undefined;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getAllUsersWithStats(): Promise<AdminUserRow[]> {
    const result = await db.execute(sql`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role,
             u.two_factor_enabled, u.created_at,
             (SELECT COUNT(*) FROM transfers t WHERE t.user_id = u.id)::int AS transfer_count,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id)::int AS order_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    return (result.rows ?? []).map((r: any) => ({
      id: Number(r.id),
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      twoFactorEnabled: r.two_factor_enabled,
      createdAt: r.created_at,
      transferCount: Number(r.transfer_count ?? 0),
      orderCount: Number(r.order_count ?? 0),
    }));
  }

  async deleteUserById(id: number): Promise<void> {
    // Nettoyage des données sans contrainte FK (moyens de paiement)
    await db.delete(paymentMethods).where(eq(paymentMethods.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async bulkInsertUsers(
    rows: (typeof users.$inferInsert)[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const res = await db
        .insert(users)
        .values(chunk)
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });
      inserted += res.length;
    }
    return inserted;
  }

  async getUserIdByLegacyId(legacyId: number): Promise<number | undefined> {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.legacyId, legacyId));
    return row?.id;
  }

  // Map { ancien_user_id -> nouvel_id } pour relier l'historique importé
  async getLegacyUserIdMap(): Promise<Map<number, number>> {
    const rows = await db
      .select({ id: users.id, legacyId: users.legacyId })
      .from(users);
    const map = new Map<number, number>();
    for (const r of rows) {
      if (r.legacyId != null) map.set(r.legacyId, r.id);
    }
    return map;
  }

  async bulkInsertTransfers(
    rows: (typeof transfers.$inferInsert)[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const res = await db
        .insert(transfers)
        .values(chunk)
        .onConflictDoNothing({ target: transfers.legacyId })
        .returning({ id: transfers.id });
      inserted += res.length;
    }
    return inserted;
  }

  async getMailableUsers(): Promise<
    { id: number; email: string; firstName: string }[]
  > {
    return await db
      .select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.emailOptOut, false));
  }

  async getUsersByEmails(
    emails: string[],
  ): Promise<{ id: number; email: string; emailOptOut: boolean }[]> {
    if (emails.length === 0) return [];
    const lowered = emails.map((e) => e.toLowerCase());
    return await db
      .select({
        id: users.id,
        email: users.email,
        emailOptOut: users.emailOptOut,
      })
      .from(users)
      .where(inArray(sql`lower(${users.email})`, lowered));
  }

  async setEmailOptOut(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ emailOptOut: true })
      .where(eq(users.id, userId));
  }

  async createCampaign(data: {
    subject: string;
    body: string;
    audience: string;
    total: number;
  }): Promise<EmailCampaign> {
    const [c] = await db.insert(emailCampaigns).values(data).returning();
    return c;
  }

  async updateCampaign(
    id: number,
    data: Partial<{ sent: number; failed: number; status: string }>,
  ): Promise<void> {
    await db.update(emailCampaigns).set(data).where(eq(emailCampaigns.id, id));
  }

  async getCampaigns(): Promise<EmailCampaign[]> {
    return await db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(50);
  }

  async recordVisit(visit: InsertVisit): Promise<void> {
    await db.insert(visits).values(visit);
  }

  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .orderBy(desc(paymentMethods.createdAt));
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const [pm] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id));
    return pm || undefined;
  }

  async createPaymentMethod(pm: InsertPaymentMethod): Promise<PaymentMethod> {
    const [created] = await db.insert(paymentMethods).values(pm).returning();
    return created;
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  async getVisitStats(): Promise<VisitStats> {
    const summary = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_page_views,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= CURRENT_DATE)::int AS visitors_today,
        COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS visitors_7d,
        COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS visitors_30d
      FROM visits
    `);
    const row: any = summary.rows?.[0] ?? {};

    const daily = await db.execute(sql`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             COALESCE(v.visitors, 0)::int AS visitors
      FROM generate_series(
             CURRENT_DATE - INTERVAL '6 days',
             CURRENT_DATE,
             INTERVAL '1 day'
           ) AS d(day)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) AS day,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM visits
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY 1
      ) v ON v.day = d.day
      ORDER BY d.day
    `);

    return {
      totalPageViews: Number(row.total_page_views ?? 0),
      uniqueVisitors: Number(row.unique_visitors ?? 0),
      visitorsToday: Number(row.visitors_today ?? 0),
      visitors7d: Number(row.visitors_7d ?? 0),
      visitors30d: Number(row.visitors_30d ?? 0),
      daily: (daily.rows ?? []).map((r: any) => ({
        date: r.date,
        visitors: Number(r.visitors ?? 0),
      })),
    };
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderBySquarePaymentId(squarePaymentId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.squarePaymentId, squarePaymentId));
    return order || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(insertOrder)
      .returning();
    return order;
  }

  async updateOrderStatus(id: number, status: string, squarePaymentId?: string): Promise<Order | undefined> {
    const updateData: any = { status };
    if (squarePaymentId) {
      updateData.squarePaymentId = squarePaymentId;
    }
    
    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      price: orderItems.price,
      product: {
        id: products.id,
        name: products.nameFr,
        description: products.descriptionFr,
        price: products.price,
        currency: products.currency,
        categoryId: products.categoryId,
        imageUrl: products.imageUrl,
        inStock: products.inStock,
        createdAt: products.createdAt
      }
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
    
    return items;
  }

  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db
      .insert(orderItems)
      .values(insertOrderItem)
      .returning();
    return item;
  }

  // Admin - Exchange Rates Implementation
  async getExchangeRates(): Promise<ExchangeRate[]> {
    return await db.select().from(exchangeRates).orderBy(desc(exchangeRates.updatedAt));
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined> {
    const [rate] = await db.select().from(exchangeRates)
      .where(and(eq(exchangeRates.fromCurrency, fromCurrency), eq(exchangeRates.toCurrency, toCurrency)))
      .orderBy(desc(exchangeRates.updatedAt));
    return rate || undefined;
  }

  async createExchangeRate(insertRate: InsertExchangeRate): Promise<ExchangeRate> {
    const [rate] = await db
      .insert(exchangeRates)
      .values(insertRate)
      .returning();
    return rate;
  }

  async updateExchangeRate(id: number, updateRate: InsertExchangeRate): Promise<ExchangeRate | undefined> {
    const [rate] = await db
      .update(exchangeRates)
      .set({ ...updateRate, updatedAt: new Date() })
      .where(eq(exchangeRates.id, id))
      .returning();
    return rate || undefined;
  }

  async deleteExchangeRate(id: number): Promise<boolean> {
    const result = await db
      .delete(exchangeRates)
      .where(eq(exchangeRates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Admin - Services Implementation
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(desc(services.createdAt));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async updateService(id: number, updateService: InsertService): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ ...updateService, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db
      .delete(services)
      .where(eq(services.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Admin - Products Management Implementation
  async updateProduct(id: number, updateProduct: InsertProduct): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updateProduct)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Admin Management Implementation
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db
      .insert(admins)
      .values(insertAdmin)
      .returning();
    return admin;
  }

  async updateAdminLastLogin(id: number): Promise<void> {
    await db
      .update(admins)
      .set({ lastLogin: new Date() })
      .where(eq(admins.id, id));
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins).orderBy(desc(admins.createdAt));
  }

  async updateAdmin(
    id: number,
    data: Partial<{
      password: string;
      isActive: boolean;
      role: string;
      firstName: string;
      lastName: string;
    }>,
  ): Promise<Admin | undefined> {
    const [admin] = await db
      .update(admins)
      .set(data)
      .where(eq(admins.id, id))
      .returning();
    return admin || undefined;
  }

  async deleteAdmin(id: number): Promise<void> {
    await db.delete(admins).where(eq(admins.id, id));
  }

  async countAdmins(): Promise<number> {
    const rows = await db.select({ id: admins.id }).from(admins);
    return rows.length;
  }
}

export const storage = new DatabaseStorage();
