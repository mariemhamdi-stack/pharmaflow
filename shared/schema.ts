import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "laboratoire", "delegue", "grossiste", "pharmacie"]);
export const userStatusEnum = pgEnum("user_status", ["actif", "suspendu"]);
export const productStatusEnum = pgEnum("product_status", ["actif", "inactif"]);
export const orderStatusEnum = pgEnum("order_status", [
  "brouillon",
  "envoyee",
  "acceptee",
  "refusee",
  "partiellement_acceptee",
  "en_preparation",
  "livree",
  "cloturee",
  "litige"
]);
export const lineStatusEnum = pgEnum("line_status", ["en_attente", "acceptee", "refusee", "partiellement_acceptee"]);
export const notificationTypeEnum = pgEnum("notification_type", ["email", "in_app"]);

// Entities table (laboratoire, grossiste, pharmacie)
export const entities = pgTable("entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: text("nom").notNull(),
  type: text("type").notNull(), // laboratoire, grossiste, pharmacie
  adresse: text("adresse"),
  telephone: text("telephone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  email: text("email").notNull().unique(),
  telephone: text("telephone"),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("delegue"),
  entityId: varchar("entity_id").references(() => entities.id),
  status: userStatusEnum("status").notNull().default("actif"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login")
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  nom: text("nom").notNull(),
  laboratoireId: varchar("laboratoire_id").references(() => entities.id).notNull(),
  forme: text("forme"),
  dosage: text("dosage"),
  status: productStatusEnum("status").notNull().default("actif"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  laboratoireId: varchar("laboratoire_id").references(() => entities.id).notNull(),
  delegueId: varchar("delegue_id").references(() => users.id).notNull(),
  pharmacieId: varchar("pharmacie_id").references(() => entities.id).notNull(),
  grossisteId: varchar("grossiste_id").references(() => entities.id).notNull(),
  status: orderStatusEnum("status").notNull().default("brouillon"),
  commentaire: text("commentaire"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at")
});

// Order lines table
export const orderLines = pgTable("order_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantiteCommandee: integer("quantite_commandee").notNull(),
  quantiteAcceptee: integer("quantite_acceptee"),
  status: lineStatusEnum("status").notNull().default("en_attente")
});

// Order history table (audit trail)
export const orderHistory = pgTable("order_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  ancienStatus: orderStatusEnum("ancien_status"),
  nouveauStatus: orderStatusEnum("nouveau_status").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: userRoleEnum("role").notNull(),
  commentaire: text("commentaire"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  type: notificationTypeEnum("type").notNull().default("in_app"),
  titre: text("titre").notNull(),
  message: text("message").notNull(),
  lu: text("lu").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Insert schemas
export const insertEntitySchema = createInsertSchema(entities).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, sentAt: true });
export const insertOrderLineSchema = createInsertSchema(orderLines).omit({ id: true });
export const insertOrderHistorySchema = createInsertSchema(orderHistory).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderLine = typeof orderLines.$inferSelect;
export type InsertOrderLine = z.infer<typeof insertOrderLineSchema>;

export type OrderHistory = typeof orderHistory.$inferSelect;
export type InsertOrderHistory = z.infer<typeof insertOrderHistorySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
});

export type LoginInput = z.infer<typeof loginSchema>;

// Order with relations type
export type OrderWithRelations = Order & {
  laboratoire?: Entity;
  delegue?: User;
  pharmacie?: Entity;
  grossiste?: Entity;
  lines?: (OrderLine & { product?: Product })[];
};

// Status transitions
export const statusTransitions: Record<string, { actor: string; nextStatuses: string[] }> = {
  brouillon: { actor: "delegue", nextStatuses: ["envoyee"] },
  envoyee: { actor: "grossiste", nextStatuses: ["acceptee", "refusee", "partiellement_acceptee"] },
  acceptee: { actor: "grossiste", nextStatuses: ["en_preparation"] },
  en_preparation: { actor: "grossiste", nextStatuses: ["livree"] },
  livree: { actor: "pharmacie", nextStatuses: ["cloturee"] },
  // Litige can be set by pharmacie at any time
};
