import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertEntitySchema, insertProductSchema, insertOrderSchema, insertOrderLineSchema, statusTransitions } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sendOrderStatusEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifi\u00e9" });
  }
  next();
}

// Middleware to check role
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
    }
    (req as any).user = user;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "pharmaflow-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );

  // ============================================
  // AUTH ROUTES
  // ============================================
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      if (user.status !== "actif") {
        return res.status(403).json({ error: "Compte suspendu" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      req.session.userId = user.id;
      
      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() } as any);
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Utilisateur non trouv\u00e9" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // ============================================
  // USERS ROUTES
  // ============================================
  
  app.get("/api/users", requireRole("admin"), async (req, res) => {
    const users = await storage.getUsers();
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);
    res.json(usersWithoutPasswords);
  });

  app.post("/api/users", requireRole("admin"), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(userData.email);
      if (existing) {
        return res.status(400).json({ error: "Email d\u00e9j\u00e0 utilis\u00e9" });
      }
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  app.patch("/api/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = await storage.updateUser(id, req.body);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouv\u00e9" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  // ============================================
  // ENTITIES ROUTES
  // ============================================
  
  app.get("/api/entities", requireAuth, async (req, res) => {
    const entities = await storage.getEntities();
    res.json(entities);
  });

  app.post("/api/entities", requireRole("admin"), async (req, res) => {
    try {
      const entityData = insertEntitySchema.parse(req.body);
      const entity = await storage.createEntity(entityData);
      res.status(201).json(entity);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  app.patch("/api/entities/:id", requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const entity = await storage.updateEntity(id, req.body);
      if (!entity) {
        return res.status(404).json({ error: "Entit\u00e9 non trouv\u00e9e" });
      }
      res.json(entity);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  // ============================================
  // PRODUCTS ROUTES
  // ============================================
  
  app.get("/api/products", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    let products;
    
    if (user?.role === "delegue" || user?.role === "laboratoire") {
      products = await storage.getProducts(user.entityId || undefined);
    } else {
      products = await storage.getProducts();
    }
    
    res.json(products);
  });

  app.post("/api/products", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const user = (req as any).user;
      const productData = { ...req.body };
      
      if (user.role === "laboratoire" && user.entityId) {
        productData.laboratoireId = user.entityId;
      }
      
      const parsed = insertProductSchema.parse(productData);
      const product = await storage.createProduct(parsed);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  app.patch("/api/products/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      
      const existing = await storage.getProduct(id);
      if (!existing) {
        return res.status(404).json({ error: "Produit non trouv\u00e9" });
      }
      
      if (user.role === "laboratoire" && existing.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Donn\u00e9es invalides" });
    }
  });

  // ============================================
  // ORDERS ROUTES
  // ============================================
  
  app.get("/api/orders", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    let filters: any = {};
    
    switch (user.role) {
      case "delegue":
        filters.delegueId = user.id;
        break;
      case "grossiste":
        filters.grossisteId = user.entityId;
        break;
      case "pharmacie":
        filters.pharmacieId = user.entityId;
        break;
      case "laboratoire":
        filters.laboratoireId = user.entityId;
        break;
      // admin sees all
    }
    
    const orders = await storage.getOrders(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(orders);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const user = await storage.getUser(req.session.userId!);
    
    if (!user) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Commande non trouv\u00e9e" });
    }
    
    // Enforce role-based access control for order details
    if (user.role !== "admin") {
      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "grossiste" && order.grossisteId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "pharmacie" && order.pharmacieId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "laboratoire" && order.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
    }
    
    res.json(order);
  });

  app.get("/api/orders/:id/history", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const user = await storage.getUser(req.session.userId!);
    
    if (!user) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Commande non trouv\u00e9e" });
    }
    
    // Enforce role-based access control for order history
    if (user.role !== "admin") {
      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "grossiste" && order.grossisteId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "pharmacie" && order.pharmacieId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
      if (user.role === "laboratoire" && order.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Acc\u00e8s non autoris\u00e9" });
      }
    }
    
    const history = await storage.getOrderHistory(id);
    res.json(history);
  });

  app.post("/api/orders", requireRole("admin", "delegue"), async (req, res) => {
    try {
      const user = (req as any).user;
      const { pharmacieId, grossisteId, commentaire, lines } = req.body;
      
      if (!pharmacieId || !grossisteId || !lines || lines.length === 0) {
        return res.status(400).json({ error: "Donn\u00e9es incompl\u00e8tes" });
      }
      
      // Get user's laboratoire
      let laboratoireId = user.entityId;
      if (!laboratoireId && user.role === "admin") {
        // For admin, use the first product's laboratoire
        const firstProduct = await storage.getProduct(lines[0].productId);
        laboratoireId = firstProduct?.laboratoireId;
      }
      
      if (!laboratoireId) {
        return res.status(400).json({ error: "Laboratoire non d\u00e9fini" });
      }
      
      // Validate that all products belong to the same laboratoire
      for (const line of lines) {
        const product = await storage.getProduct(line.productId);
        if (!product) {
          return res.status(400).json({ error: `Produit ${line.productId} non trouv\u00e9` });
        }
        if (product.laboratoireId !== laboratoireId) {
          return res.status(400).json({ error: "Tous les produits doivent appartenir au m\u00eame laboratoire" });
        }
        if (product.status !== "actif") {
          return res.status(400).json({ error: `Le produit ${product.nom} n'est pas actif` });
        }
      }
      
      const orderData = {
        laboratoireId,
        delegueId: user.id,
        pharmacieId,
        grossisteId,
        status: "brouillon" as const,
        commentaire
      };
      
      const orderLines = lines.map((l: any) => ({
        productId: l.productId,
        quantiteCommandee: l.quantiteCommandee,
        status: "en_attente" as const
      }));
      
      const order = await storage.createOrder(orderData, orderLines);
      
      // Create initial history entry
      await storage.createOrderHistory({
        orderId: order.id,
        ancienStatus: null,
        nouveauStatus: "brouillon",
        userId: user.id,
        role: user.role
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Erreur lors de la cr\u00e9ation" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { status, commentaire } = req.body;
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(401).json({ error: "Non authentifi\u00e9" });
      }
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Commande non trouv\u00e9e" });
      }
      
      // Validate transition
      const currentStatus = order.status;
      const transition = statusTransitions[currentStatus];
      
      // Special case: pharmacie can set litige at any time
      if (status === "litige" && (user.role === "pharmacie" || user.role === "admin")) {
        // Allowed - litige can be set at any time
      } else {
        // Validate transitions for ALL users including admin to maintain audit integrity
        if (!transition) {
          return res.status(400).json({ error: "Transition non autoris\u00e9e depuis ce statut" });
        }
        
        if (!transition.nextStatuses.includes(status)) {
          return res.status(400).json({ error: `Transition de ${currentStatus} vers ${status} non autoris\u00e9e` });
        }
        
        // Check if user has the right role for this transition (non-admin)
        if (user.role !== "admin") {
          const allowedRoles = [transition.actor];
          if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: "Vous n'avez pas les droits pour cette action" });
          }
        }
      }
      
      const updated = await storage.updateOrderStatus(id, status, user.id, user.role, commentaire);
      
      // Get entity names for emails
      const entities = await storage.getEntities();
      const pharmacieEntity = entities.find(e => e.id === order.pharmacieId);
      const grossisteEntity = entities.find(e => e.id === order.grossisteId);
      
      const emailOrderData = {
        orderId: id,
        pharmacieName: pharmacieEntity?.nom || 'Pharmacie',
        grossisteName: grossisteEntity?.nom || 'Grossiste',
        status,
        commentaire
      };
      
      // Create notification and send emails
      if (status === "envoyee") {
        // Notify grossiste
        const grossisteUsers = await storage.getUsers();
        const grossisteUsersFiltered = grossisteUsers.filter(u => u.role === "grossiste" && u.entityId === order.grossisteId);
        for (const gu of grossisteUsersFiltered) {
          await storage.createNotification({
            userId: gu.id,
            orderId: id,
            type: "in_app",
            titre: "Nouvelle commande",
            message: `Une nouvelle commande a été envoyée par ${user.prenom} ${user.nom}`
          });
          // Send email to grossiste
          if (gu.email) {
            await sendOrderStatusEmail(gu.email, `${gu.prenom} ${gu.nom}`, 'grossiste', emailOrderData);
          }
        }
      } else if (status === "acceptee" || status === "partiellement_acceptee") {
        // Notify and email delegue
        const delegue = await storage.getUser(order.delegueId);
        await storage.createNotification({
          userId: order.delegueId,
          orderId: id,
          type: "in_app",
          titre: status === "acceptee" ? "Commande acceptée" : "Commande partiellement acceptée",
          message: `Votre commande a été ${status === "acceptee" ? "acceptée" : "partiellement acceptée"} par le grossiste`
        });
        // Send email to delegue
        if (delegue?.email) {
          await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData);
        }
      } else if (status === "refusee") {
        // Notify and email delegue
        const delegue = await storage.getUser(order.delegueId);
        await storage.createNotification({
          userId: order.delegueId,
          orderId: id,
          type: "in_app",
          titre: "Commande refusée",
          message: `Votre commande a été refusée par le grossiste`
        });
        // Send email to delegue
        if (delegue?.email) {
          await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData);
        }
      } else if (status === "livree") {
        // Notify and email pharmacie
        const pharmacieUsers = await storage.getUsers();
        const pharmacieUsersFiltered = pharmacieUsers.filter(u => u.role === "pharmacie" && u.entityId === order.pharmacieId);
        for (const pu of pharmacieUsersFiltered) {
          await storage.createNotification({
            userId: pu.id,
            orderId: id,
            type: "in_app",
            titre: "Commande livrée",
            message: `Votre commande a été livrée`
          });
          // Send email to pharmacie
          if (pu.email) {
            await sendOrderStatusEmail(pu.email, `${pu.prenom} ${pu.nom}`, 'pharmacie', emailOrderData);
          }
        }
      } else if (status === "litige") {
        // Notify laboratoire
        const laboUsers = await storage.getUsers();
        const laboUsersFiltered = laboUsers.filter(u => 
          (u.role === "laboratoire" || u.role === "delegue") && u.entityId === order.laboratoireId
        );
        for (const lu of laboUsersFiltered) {
          await storage.createNotification({
            userId: lu.id,
            orderId: id,
            type: "in_app",
            titre: "Litige ouvert",
            message: `Un litige a été ouvert sur une commande`
          });
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Erreur lors de la mise \u00e0 jour" });
    }
  });

  // ============================================
  // HISTORY ROUTES
  // ============================================
  
  app.get("/api/history", requireRole("admin"), async (req, res) => {
    const history = await storage.getAllHistory();
    res.json(history);
  });

  // ============================================
  // NOTIFICATIONS ROUTES
  // ============================================
  
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifications = await storage.getNotifications(req.session.userId!);
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    await storage.markNotificationAsRead(id);
    res.json({ success: true });
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    await storage.markAllNotificationsAsRead(req.session.userId!);
    res.json({ success: true });
  });

  // ============================================
  // DASHBOARD & STATS ROUTES
  // ============================================
  
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    const stats = await storage.getDashboardStats(user.id, user.role, user.entityId);
    res.json(stats);
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifi\u00e9" });
    }
    
    let laboratoireId: string | undefined;
    if (user.role === "laboratoire" || user.role === "delegue") {
      laboratoireId = user.entityId || undefined;
    }
    
    const stats = await storage.getFullStats(laboratoireId);
    res.json(stats);
  });

  return httpServer;
}
