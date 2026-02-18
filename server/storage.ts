import { 
  users, entities, products, orders, orderLines, orderHistory, notifications,
  commercialOffers, commercialActions, communications, delegueLaboratoires,
  type User, type InsertUser,
  type Entity, type InsertEntity,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type OrderLine, type InsertOrderLine,
  type OrderHistory, type InsertOrderHistory,
  type Notification, type InsertNotification,
  type CommercialOffer, type InsertCommercialOffer,
  type CommercialAction, type InsertCommercialAction,
  type Communication, type InsertCommunication,
  type DelegueLaboratoire, type InsertDelegueLaboratoire,
  type OrderWithRelations
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, or, ilike, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Entities
  getEntity(id: string): Promise<Entity | undefined>;
  getEntities(): Promise<Entity[]>;
  getEntitiesByType(type: string): Promise<Entity[]>;
  searchEntities(search: string, type?: string, limit?: number): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity | undefined>;
  
  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(laboratoireId?: string): Promise<Product[]>;
  searchProducts(search: string, laboratoireIds?: string[], limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Orders
  getOrder(id: string): Promise<OrderWithRelations | undefined>;
  getOrders(filters?: { 
    delegueId?: string; 
    grossisteId?: string; 
    pharmacieId?: string;
    laboratoireId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<OrderWithRelations[]>;
  createOrder(order: InsertOrder, lines: InsertOrderLine[]): Promise<Order>;
  updateOrderStatus(id: string, status: string, userId: string, role: string, commentaire?: string): Promise<Order | undefined>;
  updateOrderDocuments(id: string, data: { bonLivraisonUrl?: string; bonReceptionUrl?: string }): Promise<Order | undefined>;
  updateOrderGrossiste(id: string, grossisteId: string): Promise<Order | undefined>;
  updateOrderLine(lineId: string, quantiteAcceptee: number, status: string): Promise<OrderLine | undefined>;
  
  // Order History
  getOrderHistory(orderId: string): Promise<OrderHistory[]>;
  getAllHistory(): Promise<(OrderHistory & { user?: User })[]>;
  createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Commercial Offers
  getCommercialOffers(laboratoireId?: string): Promise<CommercialOffer[]>;
  getCommercialOffersByLabs(laboratoireIds: string[]): Promise<CommercialOffer[]>;
  getCommercialOffersForPharmacie(pharmacieId: string): Promise<CommercialOffer[]>;
  getCommercialOffer(id: string): Promise<CommercialOffer | undefined>;
  createCommercialOffer(offer: InsertCommercialOffer): Promise<CommercialOffer>;
  updateCommercialOffer(id: string, data: Partial<InsertCommercialOffer>): Promise<CommercialOffer | undefined>;
  getOffersForOrder(orderId: string): Promise<CommercialOffer[]>;
  
  // Commercial Actions
  getCommercialActions(laboratoireId?: string): Promise<CommercialAction[]>;
  getCommercialActionsByLabs(laboratoireIds: string[]): Promise<CommercialAction[]>;
  getCommercialActionsForPharmacie(pharmacieId: string): Promise<CommercialAction[]>;
  getActiveCommercialActions(): Promise<CommercialAction[]>;
  createCommercialAction(action: InsertCommercialAction): Promise<CommercialAction>;
  updateCommercialAction(id: string, data: Partial<InsertCommercialAction>): Promise<CommercialAction | undefined>;
  
  // Communications
  getCommunications(role?: string, entityId?: string): Promise<Communication[]>;
  createCommunication(comm: InsertCommunication): Promise<Communication>;
  updateCommunication(id: string, data: Partial<InsertCommunication>): Promise<Communication | undefined>;
  incrementCommunicationViews(id: string): Promise<void>;
  
  // Delegate-Laboratory associations
  getDelegueLaboratoires(delegueId: string): Promise<DelegueLaboratoire[]>;
  getDelegueLaboratoireIds(delegueId: string): Promise<string[]>;
  getDelegueIdsForLaboratoire(laboratoireId: string): Promise<string[]>;
  setDelegueLaboratoires(delegueId: string, laboratoireIds: string[]): Promise<void>;
  
  // Stats
  getDashboardStats(userId: string, role: string, entityId?: string | null): Promise<any>;
  getFullStats(laboratoireId?: string, dateFrom?: Date, dateTo?: Date): Promise<any>;
  getCommercialOffersForGrossiste(grossisteId: string): Promise<CommercialOffer[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [created] = await db.insert(users).values({
      ...user,
      password: hashedPassword
    }).returning();
    return created;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...userData };
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated;
  }

  // Entities
  async getEntity(id: string): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity;
  }

  async getEntities(): Promise<Entity[]> {
    return db.select().from(entities).orderBy(entities.nom);
  }

  async getEntitiesByType(type: string): Promise<Entity[]> {
    return db.select().from(entities).where(eq(entities.type, type)).orderBy(entities.nom);
  }

  async searchEntities(search: string, type?: string, limit: number = 30): Promise<Entity[]> {
    const conditions = [eq(entities.blocked, false)];
    if (search.length >= 2) {
      conditions.push(ilike(entities.nom, `%${search}%`));
    }
    if (type) {
      conditions.push(eq(entities.type, type));
    }
    return db.select().from(entities).where(and(...conditions)).orderBy(entities.nom).limit(limit);
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const [created] = await db.insert(entities).values(entity).returning();
    return created;
  }

  async updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity | undefined> {
    const [updated] = await db.update(entities).set(entity).where(eq(entities.id, id)).returning();
    return updated;
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(laboratoireId?: string): Promise<Product[]> {
    if (laboratoireId) {
      return db.select().from(products).where(eq(products.laboratoireId, laboratoireId)).orderBy(products.nom);
    }
    return db.select().from(products).orderBy(products.nom);
  }

  async searchProducts(search: string, laboratoireIds?: string[], limit: number = 30): Promise<Product[]> {
    const conditions = [eq(products.status, "actif")];
    if (search.length >= 2) {
      conditions.push(ilike(products.nom, `%${search}%`));
    }
    if (laboratoireIds && laboratoireIds.length > 0) {
      conditions.push(inArray(products.laboratoireId, laboratoireIds));
    }
    return db.select().from(products).where(and(...conditions)).orderBy(products.nom).limit(limit);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  // Orders
  async getOrder(id: string): Promise<OrderWithRelations | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const [laboratoire, delegue, pharmacie, grossiste, lines, offers] = await Promise.all([
      this.getEntity(order.laboratoireId),
      this.getUser(order.delegueId),
      this.getEntity(order.pharmacieId),
      this.getEntity(order.grossisteId),
      db.select().from(orderLines).where(eq(orderLines.orderId, id)),
      db.select().from(commercialOffers).where(eq(commercialOffers.orderId, id))
    ]);

    const linesWithProducts = await Promise.all(
      lines.map(async (line) => ({
        ...line,
        product: await this.getProduct(line.productId)
      }))
    );

    return {
      ...order,
      laboratoire,
      delegue,
      pharmacie,
      grossiste,
      lines: linesWithProducts,
      offers
    };
  }

  async getOrders(filters?: { 
    delegueId?: string; 
    grossisteId?: string; 
    pharmacieId?: string;
    laboratoireId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<OrderWithRelations[]> {
    let query = db.select().from(orders);
    
    const conditions = [];
    if (filters?.delegueId) {
      conditions.push(eq(orders.delegueId, filters.delegueId));
    }
    if (filters?.grossisteId) {
      conditions.push(eq(orders.grossisteId, filters.grossisteId));
    }
    if (filters?.pharmacieId) {
      conditions.push(eq(orders.pharmacieId, filters.pharmacieId));
    }
    if (filters?.laboratoireId) {
      conditions.push(eq(orders.laboratoireId, filters.laboratoireId));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(orders.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(orders.createdAt, filters.dateTo));
    }

    const orderList = conditions.length > 0
      ? await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));

    return Promise.all(orderList.map(async (order) => {
      const [laboratoire, delegue, pharmacie, grossiste, lines] = await Promise.all([
        this.getEntity(order.laboratoireId),
        this.getUser(order.delegueId),
        this.getEntity(order.pharmacieId),
        this.getEntity(order.grossisteId),
        db.select().from(orderLines).where(eq(orderLines.orderId, order.id))
      ]);

      const linesWithProducts = await Promise.all(
        lines.map(async (line) => ({
          ...line,
          product: await this.getProduct(line.productId)
        }))
      );

      return {
        ...order,
        laboratoire,
        delegue,
        pharmacie,
        grossiste,
        lines: linesWithProducts
      };
    }));
  }

  async createOrder(order: InsertOrder, lines: InsertOrderLine[]): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    
    for (const line of lines) {
      await db.insert(orderLines).values({
        ...line,
        orderId: created.id
      });
    }

    return created;
  }

  async updateOrderStatus(id: string, status: string, userId: string, role: string, commentaire?: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const ancienStatus = order.status;
    const updateData: any = { status };
    
    if (status === "validee_delegue") {
      updateData.validatedByDelegueAt = new Date();
    }
    if (status === "validee_pharmacie") {
      updateData.validatedByPharmacieAt = new Date();
    }
    if (status === "envoyee") {
      updateData.sentAt = new Date();
    }
    if (status === "refusee" && commentaire) {
      updateData.motifRefus = commentaire;
    }
    if (status === "litige" && commentaire) {
      updateData.motifLitige = commentaire;
    }
    if (status === "livree") {
      updateData.livreeAt = new Date();
    }
    if (status === "cloturee") {
      updateData.clotureeAt = new Date();
    }

    const [updated] = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    await this.createOrderHistory({
      orderId: id,
      ancienStatus: ancienStatus,
      nouveauStatus: status as any,
      userId,
      role: role as any,
      commentaire
    });

    return updated;
  }

  async updateOrderDocuments(id: string, data: { bonLivraisonUrl?: string; bonReceptionUrl?: string }): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updated;
  }

  async updateOrderGrossiste(id: string, grossisteId: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ grossisteId, status: "envoyee" as any, motifRefus: null, sentAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async updateOrderLine(lineId: string, quantiteAcceptee: number, status: string): Promise<OrderLine | undefined> {
    const [updated] = await db.update(orderLines)
      .set({ quantiteAcceptee, status: status as any })
      .where(eq(orderLines.id, lineId))
      .returning();
    return updated;
  }

  // Order History
  async getOrderHistory(orderId: string): Promise<OrderHistory[]> {
    return db.select().from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(desc(orderHistory.createdAt));
  }

  async getAllHistory(): Promise<(OrderHistory & { user?: User })[]> {
    const historyList = await db.select().from(orderHistory).orderBy(desc(orderHistory.createdAt)).limit(100);
    
    return Promise.all(historyList.map(async (h) => {
      const user = await this.getUser(h.userId);
      return { ...h, user };
    }));
  }

  async createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory> {
    const [created] = await db.insert(orderHistory).values(history).returning();
    return created;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ lu: "true" }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ lu: "true" }).where(eq(notifications.userId, userId));
  }

  // Commercial Offers
  async getCommercialOffers(laboratoireId?: string): Promise<CommercialOffer[]> {
    if (laboratoireId) {
      return db.select().from(commercialOffers)
        .where(eq(commercialOffers.laboratoireId, laboratoireId))
        .orderBy(desc(commercialOffers.createdAt));
    }
    return db.select().from(commercialOffers).orderBy(desc(commercialOffers.createdAt));
  }

  async getCommercialOffersByLabs(laboratoireIds: string[]): Promise<CommercialOffer[]> {
    if (laboratoireIds.length === 0) return [];
    return db.select().from(commercialOffers)
      .where(inArray(commercialOffers.laboratoireId, laboratoireIds))
      .orderBy(desc(commercialOffers.createdAt));
  }

  async getCommercialOffersForPharmacie(pharmacieId: string): Promise<CommercialOffer[]> {
    const allOffers = await db.select().from(commercialOffers).orderBy(desc(commercialOffers.createdAt));
    return allOffers.filter(offer => {
      if (offer.pharmacieId === pharmacieId) return true;
      if (offer.pharmacieIds) {
        try {
          const ids = JSON.parse(offer.pharmacieIds);
          if (ids === "all") return true;
          if (Array.isArray(ids) && ids.includes(pharmacieId)) return true;
        } catch { }
      }
      return false;
    });
  }

  async getCommercialOffer(id: string): Promise<CommercialOffer | undefined> {
    const [offer] = await db.select().from(commercialOffers).where(eq(commercialOffers.id, id));
    return offer;
  }

  async createCommercialOffer(offer: InsertCommercialOffer): Promise<CommercialOffer> {
    const [created] = await db.insert(commercialOffers).values(offer).returning();
    return created;
  }

  async updateCommercialOffer(id: string, data: Partial<InsertCommercialOffer>): Promise<CommercialOffer | undefined> {
    const [updated] = await db.update(commercialOffers).set(data).where(eq(commercialOffers.id, id)).returning();
    return updated;
  }

  async getOffersForOrder(orderId: string): Promise<CommercialOffer[]> {
    return db.select().from(commercialOffers).where(eq(commercialOffers.orderId, orderId));
  }

  // Commercial Actions
  async getCommercialActions(laboratoireId?: string): Promise<CommercialAction[]> {
    if (laboratoireId) {
      return db.select().from(commercialActions)
        .where(eq(commercialActions.laboratoireId, laboratoireId))
        .orderBy(desc(commercialActions.createdAt));
    }
    return db.select().from(commercialActions).orderBy(desc(commercialActions.createdAt));
  }

  async getCommercialActionsByLabs(laboratoireIds: string[]): Promise<CommercialAction[]> {
    if (laboratoireIds.length === 0) return [];
    return db.select().from(commercialActions)
      .where(inArray(commercialActions.laboratoireId, laboratoireIds))
      .orderBy(desc(commercialActions.createdAt));
  }

  async getCommercialActionsForPharmacie(pharmacieId: string): Promise<CommercialAction[]> {
    const allActions = await db.select().from(commercialActions)
      .where(eq(commercialActions.active, true))
      .orderBy(desc(commercialActions.createdAt));
    return allActions.filter(action => {
      if (action.scope === "globale") return true;
      if (action.targetEntities) {
        try {
          const ids = JSON.parse(action.targetEntities);
          if (ids === "all") return true;
          if (Array.isArray(ids) && ids.includes(pharmacieId)) return true;
        } catch { }
      }
      return false;
    });
  }

  async getActiveCommercialActions(): Promise<CommercialAction[]> {
    const now = new Date();
    return db.select().from(commercialActions)
      .where(and(
        eq(commercialActions.active, true),
        lte(commercialActions.dateDebut, now),
        gte(commercialActions.dateFin, now)
      ))
      .orderBy(desc(commercialActions.createdAt));
  }

  async createCommercialAction(action: InsertCommercialAction): Promise<CommercialAction> {
    const [created] = await db.insert(commercialActions).values(action).returning();
    return created;
  }

  async updateCommercialAction(id: string, data: Partial<InsertCommercialAction>): Promise<CommercialAction | undefined> {
    const [updated] = await db.update(commercialActions).set(data).where(eq(commercialActions.id, id)).returning();
    return updated;
  }

  // Communications
  async getCommunications(role?: string, entityId?: string): Promise<Communication[]> {
    const now = new Date();
    const allComms = await db.select().from(communications)
      .where(and(
        eq(communications.active, true),
        lte(communications.dateDebut, now),
        gte(communications.dateFin, now)
      ))
      .orderBy(desc(communications.createdAt));
    
    return allComms.filter(comm => {
      if (role && comm.targetRoles) {
        const roles = comm.targetRoles.split(",");
        if (!roles.includes(role)) return false;
      }
      return true;
    });
  }

  async createCommunication(comm: InsertCommunication): Promise<Communication> {
    const [created] = await db.insert(communications).values(comm).returning();
    return created;
  }

  async updateCommunication(id: string, data: Partial<InsertCommunication>): Promise<Communication | undefined> {
    const [updated] = await db.update(communications).set(data).where(eq(communications.id, id)).returning();
    return updated;
  }

  async incrementCommunicationViews(id: string): Promise<void> {
    await db.update(communications)
      .set({ vues: sql`${communications.vues} + 1` })
      .where(eq(communications.id, id));
  }

  // Stats
  async getDashboardStats(userId: string, role: string, entityId?: string | null): Promise<any> {
    let orderList: Order[] = [];
    
    if (role === "admin") {
      orderList = await db.select().from(orders);
    } else if (role === "laboratoire" && entityId) {
      orderList = await db.select().from(orders).where(eq(orders.laboratoireId, entityId));
    } else if (role === "delegue") {
      orderList = await db.select().from(orders).where(eq(orders.delegueId, userId));
    } else if (role === "grossiste" && entityId) {
      orderList = await db.select().from(orders).where(eq(orders.grossisteId, entityId));
    } else if (role === "pharmacie" && entityId) {
      orderList = await db.select().from(orders).where(eq(orders.pharmacieId, entityId));
    }

    const ordersByStatus: Record<string, number> = {};
    for (const order of orderList) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    }

    const pendingOrders = orderList.filter(o => o.status === "envoyee").length;
    const awaitingValidation = orderList.filter(o => o.status === "validee_delegue").length;
    const lateOrders = 0;

    return {
      totalOrders: orderList.length,
      ordersByStatus,
      avgProcessingTime: 24,
      refusalRate: orderList.length > 0 
        ? Math.round((ordersByStatus["refusee"] || 0) / orderList.length * 100) 
        : 0,
      pendingOrders,
      awaitingValidation,
      lateOrders
    };
  }

  async getCommercialOffersForGrossiste(grossisteId: string): Promise<CommercialOffer[]> {
    const allOffers = await db.select().from(commercialOffers)
      .where(eq(commercialOffers.active, true))
      .orderBy(desc(commercialOffers.createdAt));
    return allOffers;
  }

  async getFullStats(laboratoireId?: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    let orderList: Order[] = [];
    
    const conditions = [];
    if (laboratoireId) {
      conditions.push(eq(orders.laboratoireId, laboratoireId));
    }
    if (dateFrom) {
      conditions.push(gte(orders.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(orders.createdAt, dateTo));
    }
    
    if (conditions.length > 0) {
      orderList = await db.select().from(orders).where(and(...conditions));
    } else {
      orderList = await db.select().from(orders);
    }

    const ordersByStatus: Record<string, number> = {};
    for (const order of orderList) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    }

    const grossisteStats: Record<string, { count: number; refusals: number }> = {};
    for (const order of orderList) {
      const gId = order.grossisteId;
      if (!grossisteStats[gId]) {
        grossisteStats[gId] = { count: 0, refusals: 0 };
      }
      grossisteStats[gId].count++;
      if (order.status === "refusee") {
        grossisteStats[gId].refusals++;
      }
    }

    const entityNames = await this.getEntities();
    const entityMap = new Map(entityNames.map(e => [e.id, e.nom]));

    const ordersByGrossiste = Object.entries(grossisteStats).map(([id, stats]) => ({
      grossiste: entityMap.get(id) || "Inconnu",
      count: stats.count,
      refusalRate: stats.count > 0 ? Math.round(stats.refusals / stats.count * 100) : 0
    }));

    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
    const ordersByMonth = months.map((month, i) => ({
      month,
      count: orderList.filter(o => new Date(o.createdAt).getMonth() === i).length
    }));

    return {
      totalOrders: orderList.length,
      ordersByStatus,
      avgProcessingTime: 24,
      refusalRate: orderList.length > 0 
        ? Math.round((ordersByStatus["refusee"] || 0) / orderList.length * 100) 
        : 0,
      ordersByGrossiste,
      ordersByMonth
    };
  }

  async getDelegueLaboratoires(delegueId: string): Promise<DelegueLaboratoire[]> {
    return await db.select().from(delegueLaboratoires).where(eq(delegueLaboratoires.delegueId, delegueId));
  }

  async getDelegueLaboratoireIds(delegueId: string): Promise<string[]> {
    const rows = await db.select({ laboratoireId: delegueLaboratoires.laboratoireId })
      .from(delegueLaboratoires)
      .where(eq(delegueLaboratoires.delegueId, delegueId));
    return rows.map(r => r.laboratoireId);
  }

  async getDelegueIdsForLaboratoire(laboratoireId: string): Promise<string[]> {
    const rows = await db.select({ delegueId: delegueLaboratoires.delegueId })
      .from(delegueLaboratoires)
      .where(eq(delegueLaboratoires.laboratoireId, laboratoireId));
    return rows.map(r => r.delegueId);
  }

  async setDelegueLaboratoires(delegueId: string, laboratoireIds: string[]): Promise<void> {
    await db.delete(delegueLaboratoires).where(eq(delegueLaboratoires.delegueId, delegueId));
    if (laboratoireIds.length > 0) {
      await db.insert(delegueLaboratoires).values(
        laboratoireIds.map(laboId => ({ delegueId, laboratoireId: laboId }))
      );
    }
  }
}

export const storage = new DatabaseStorage();
