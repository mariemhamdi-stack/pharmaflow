import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertEntitySchema, insertProductSchema, insertOrderSchema, insertOrderLineSchema, statusTransitions, insertCommercialOfferSchema, insertCommercialActionSchema, insertCommunicationSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sendOrderStatusEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    if (user.blocked) {
      return res.status(403).json({ error: "Votre compte est bloqué" });
    }
    (req as any).user = user;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "pharmaflow-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
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

      if (user.blocked) {
        return res.status(403).json({ error: "Compte bloqué par le laboratoire" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      req.session.userId = user.id;
      await storage.updateUser(user.id, { lastLogin: new Date() } as any);
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Utilisateur non trouvé" });
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
  
  app.get("/api/users", requireRole("admin", "laboratoire"), async (req, res) => {
    const currentUser = (req as any).user;
    let users = await storage.getUsers();
    if (currentUser.role === "laboratoire") {
      users = users.filter(u => u.entityId === currentUser.entityId);
    }
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);
    res.json(usersWithoutPasswords);
  });

  app.post("/api/users", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const userData = insertUserSchema.parse(req.body);

      if (currentUser.role === "laboratoire") {
        userData.entityId = currentUser.entityId;
      }

      const existing = await storage.getUserByEmail(userData.email);
      if (existing) {
        return res.status(400).json({ error: "Email déjà utilisé" });
      }
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/users/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const id = req.params.id as string;

      if (currentUser.role === "laboratoire") {
        const targetUser = await storage.getUser(id);
        if (!targetUser || targetUser.entityId !== currentUser.entityId) {
          return res.status(403).json({ error: "Vous ne pouvez modifier que les utilisateurs de votre laboratoire" });
        }
      }

      const user = await storage.updateUser(id, req.body);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  // ============================================
  // DELEGATE-LABORATORY ASSOCIATIONS
  // ============================================

  app.get("/api/users/:id/laboratoires", requireRole("admin", "laboratoire"), async (req, res) => {
    const id = req.params.id as string;
    const laboIds = await storage.getDelegueLaboratoireIds(id);
    res.json(laboIds);
  });

  app.put("/api/users/:id/laboratoires", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const id = req.params.id as string;
      const { laboratoireIds } = req.body;
      
      if (!Array.isArray(laboratoireIds)) {
        return res.status(400).json({ error: "laboratoireIds doit être un tableau" });
      }

      if (currentUser.role === "laboratoire") {
        const targetUser = await storage.getUser(id);
        if (!targetUser || targetUser.role !== "delegue") {
          return res.status(403).json({ error: "Utilisateur non trouvé ou n'est pas un délégué" });
        }
      }

      await storage.setDelegueLaboratoires(id, laboratoireIds);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Erreur lors de la mise à jour" });
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
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/entities/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const entity = await storage.updateEntity(id, req.body);
      if (!entity) {
        return res.status(404).json({ error: "Entité non trouvée" });
      }
      res.json(entity);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  // Block/unblock entity (lab only)
  app.patch("/api/entities/:id/block", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      const { blocked } = req.body;

      const entity = await storage.updateEntity(id, {
        blocked,
        blockedBy: blocked ? user.entityId : null,
        blockedAt: blocked ? new Date() : null
      } as any);

      if (!entity) {
        return res.status(404).json({ error: "Entité non trouvée" });
      }
      res.json(entity);
    } catch (error) {
      res.status(400).json({ error: "Erreur lors du blocage" });
    }
  });

  // Block/unblock user (lab only)
  app.patch("/api/users/:id/block", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      const { blocked } = req.body;

      const updated = await storage.updateUser(id, {
        blocked,
        blockedBy: blocked ? user.id : null,
        blockedAt: blocked ? new Date() : null
      } as any);

      if (!updated) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Erreur lors du blocage" });
    }
  });

  // ============================================
  // PRODUCTS ROUTES
  // ============================================
  
  app.get("/api/products", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    let allProducts: any[] = [];
    
    if (user?.role === "laboratoire") {
      allProducts = await storage.getProducts(user.entityId || undefined);
    } else if (user?.role === "delegue") {
      const laboIds = await storage.getDelegueLaboratoireIds(user.id);
      if (laboIds.length > 0) {
        for (const laboId of laboIds) {
          const laboProducts = await storage.getProducts(laboId);
          allProducts.push(...laboProducts);
        }
      } else if (user.entityId) {
        allProducts = await storage.getProducts(user.entityId);
      }
    } else {
      allProducts = await storage.getProducts();
    }
    
    res.json(allProducts);
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
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/products/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      
      const existing = await storage.getProduct(id);
      if (!existing) {
        return res.status(404).json({ error: "Produit non trouvé" });
      }
      
      if (user.role === "laboratoire" && existing.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  // ============================================
  // ORDERS ROUTES
  // ============================================
  
  app.get("/api/orders", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
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
    }
    
    const orders = await storage.getOrders(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(orders);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const user = await storage.getUser(req.session.userId!);
    
    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }
    
    if (user.role !== "admin") {
      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "grossiste" && order.grossisteId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "pharmacie" && order.pharmacieId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "laboratoire" && order.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
    }
    
    res.json(order);
  });

  app.get("/api/orders/:id/history", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const user = await storage.getUser(req.session.userId!);
    
    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    
    const order = await storage.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }
    
    if (user.role !== "admin") {
      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "grossiste" && order.grossisteId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "pharmacie" && order.pharmacieId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      if (user.role === "laboratoire" && order.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
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
        return res.status(400).json({ error: "Données incomplètes" });
      }

      // Check if entities are blocked
      const pharmacie = await storage.getEntity(pharmacieId);
      const grossiste = await storage.getEntity(grossisteId);
      
      if (pharmacie?.blocked) {
        return res.status(400).json({ error: "Cette pharmacie est bloquée" });
      }
      if (grossiste?.blocked) {
        return res.status(400).json({ error: "Ce grossiste est bloqué" });
      }
      if (user.blocked) {
        return res.status(400).json({ error: "Votre compte est bloqué" });
      }
      
      let laboratoireId = user.entityId;
      if (!laboratoireId && user.role === "admin") {
        const firstProduct = await storage.getProduct(lines[0].productId);
        laboratoireId = firstProduct?.laboratoireId;
      }
      
      if (!laboratoireId) {
        return res.status(400).json({ error: "Laboratoire non défini" });
      }
      
      for (const line of lines) {
        const product = await storage.getProduct(line.productId);
        if (!product) {
          return res.status(400).json({ error: `Produit ${line.productId} non trouvé` });
        }
        if (product.laboratoireId !== laboratoireId) {
          return res.status(400).json({ error: "Tous les produits doivent appartenir au même laboratoire" });
        }
        if (product.status !== "actif") {
          return res.status(400).json({ error: `Le produit ${product.nom} n'est pas actif` });
        }
        if (!line.quantiteCommandee || line.quantiteCommandee <= 0) {
          return res.status(400).json({ error: "Les quantités doivent être supérieures à 0" });
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
      res.status(400).json({ error: "Erreur lors de la création" });
    }
  });

  // Status change with double validation workflow
  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { status, commentaire } = req.body;
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(401).json({ error: "Non authentifié" });
      }
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }
      
      const currentStatus = order.status;

      // Pharmacy refuses at validee_delegue → back to brouillon
      if (status === "brouillon" && currentStatus === "validee_delegue" && (user.role === "pharmacie" || user.role === "admin")) {
        const updated = await storage.updateOrderStatus(id, "brouillon", user.id, user.role, commentaire || "Refusée par la pharmacie");
        
        await storage.createNotification({
          userId: order.delegueId,
          orderId: id,
          type: "in_app",
          titre: "Commande refusée par la pharmacie",
          message: `La pharmacie a refusé votre commande. Elle revient en brouillon.`
        });

        return res.json(updated);
      }

      // Litige: only allowed after delivery (status = livree)
      if (status === "litige") {
        if (currentStatus !== "livree") {
          return res.status(400).json({ error: "Un litige ne peut être déclaré qu'après livraison" });
        }
        if (user.role !== "pharmacie" && user.role !== "admin") {
          return res.status(403).json({ error: "Seule la pharmacie peut déclarer un litige" });
        }
      } else {
        // Validate transitions
        const transition = statusTransitions[currentStatus];
        
        if (!transition) {
          return res.status(400).json({ error: "Transition non autorisée depuis ce statut" });
        }
        
        if (!transition.nextStatuses.includes(status)) {
          return res.status(400).json({ error: `Transition de ${currentStatus} vers ${status} non autorisée` });
        }
        
        // Check role permissions
        if (user.role !== "admin") {
          if (transition.actor === "system") {
            return res.status(403).json({ error: "Cette transition est automatique" });
          }
          if (transition.actor !== user.role) {
            return res.status(403).json({ error: "Vous n'avez pas les droits pour cette action" });
          }
        }
      }
      
      // Motif obligatoire for refusal
      if (status === "refusee" && !commentaire) {
        return res.status(400).json({ error: "Le motif de refus est obligatoire" });
      }
      
      const updated = await storage.updateOrderStatus(id, status, user.id, user.role, commentaire);
      
      // Auto-transition: validee_pharmacie → envoyee (automatic)
      if (status === "validee_pharmacie") {
        await storage.updateOrderStatus(id, "envoyee", user.id, "system" as any, "Transmission automatique au grossiste");
        
        // Notify grossiste
        const grossisteUsers = await storage.getUsers();
        const grossisteUsersFiltered = grossisteUsers.filter(u => u.role === "grossiste" && u.entityId === order.grossisteId);
        for (const gu of grossisteUsersFiltered) {
          await storage.createNotification({
            userId: gu.id,
            orderId: id,
            type: "in_app",
            titre: "Nouvelle commande",
            message: `Une nouvelle commande a été validée et transmise`
          });
          if (gu.email) {
            const entities = await storage.getEntities();
            const pharmacieEntity = entities.find(e => e.id === order.pharmacieId);
            const grossisteEntity = entities.find(e => e.id === order.grossisteId);
            await sendOrderStatusEmail(gu.email, `${gu.prenom} ${gu.nom}`, 'grossiste', {
              orderId: id,
              pharmacieName: pharmacieEntity?.nom || 'Pharmacie',
              grossisteName: grossisteEntity?.nom || 'Grossiste',
              status: 'envoyee'
            });
          }
        }

        // Re-fetch the updated order
        const finalOrder = await storage.getOrder(id);
        return res.json(finalOrder);
      }

      // Get entity names for emails
      const allEntities = await storage.getEntities();
      const pharmacieEntity = allEntities.find(e => e.id === order.pharmacieId);
      const grossisteEntity = allEntities.find(e => e.id === order.grossisteId);
      
      const emailOrderData = {
        orderId: id,
        pharmacieName: pharmacieEntity?.nom || 'Pharmacie',
        grossisteName: grossisteEntity?.nom || 'Grossiste',
        status,
        commentaire
      };
      
      // Notifications based on status
      if (status === "validee_delegue") {
        // Notify pharmacie to validate
        const pharmacieUsers = await storage.getUsers();
        const pharmacieUsersFiltered = pharmacieUsers.filter(u => u.role === "pharmacie" && u.entityId === order.pharmacieId);
        for (const pu of pharmacieUsersFiltered) {
          await storage.createNotification({
            userId: pu.id,
            orderId: id,
            type: "in_app",
            titre: "Commande à valider",
            message: `Une commande attend votre validation`
          });
        }
      } else if (status === "acceptee" || status === "partiellement_acceptee") {
        const delegue = await storage.getUser(order.delegueId);
        await storage.createNotification({
          userId: order.delegueId,
          orderId: id,
          type: "in_app",
          titre: status === "acceptee" ? "Commande acceptée" : "Commande partiellement acceptée",
          message: `Votre commande a été ${status === "acceptee" ? "acceptée" : "partiellement acceptée"} par le grossiste`
        });
        if (delegue?.email) {
          await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData);
        }
      } else if (status === "refusee") {
        const delegue = await storage.getUser(order.delegueId);
        await storage.createNotification({
          userId: order.delegueId,
          orderId: id,
          type: "in_app",
          titre: "Commande refusée",
          message: `Votre commande a été refusée par le grossiste. Motif : ${commentaire}`
        });
        // Also notify laboratoire
        const laboUsers = await storage.getUsers();
        const laboUsersFiltered = laboUsers.filter(u => u.role === "laboratoire" && u.entityId === order.laboratoireId);
        for (const lu of laboUsersFiltered) {
          await storage.createNotification({
            userId: lu.id,
            orderId: id,
            type: "in_app",
            titre: "Commande refusée",
            message: `Une commande a été refusée par le grossiste. Motif : ${commentaire}`
          });
        }
        if (delegue?.email) {
          await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData);
        }
      } else if (status === "livree") {
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
          if (pu.email) {
            await sendOrderStatusEmail(pu.email, `${pu.prenom} ${pu.nom}`, 'pharmacie', emailOrderData);
          }
        }
      } else if (status === "litige") {
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
      res.status(400).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // Reassign order to another grossiste (after refusal)
  app.patch("/api/orders/:id/reassign", requireRole("admin", "delegue"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const { grossisteId } = req.body;
      const user = (req as any).user;

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }

      if (order.status !== "refusee") {
        return res.status(400).json({ error: "Seule une commande refusée peut être réattribuée" });
      }

      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Vous ne pouvez réattribuer que vos propres commandes" });
      }

      // Check grossiste not blocked
      const grossiste = await storage.getEntity(grossisteId);
      if (!grossiste || grossiste.blocked) {
        return res.status(400).json({ error: "Ce grossiste est bloqué ou introuvable" });
      }

      const updated = await storage.updateOrderGrossiste(id, grossisteId);

      await storage.createOrderHistory({
        orderId: id,
        ancienStatus: "refusee",
        nouveauStatus: "envoyee",
        userId: user.id,
        role: user.role,
        commentaire: `Réattribuée au grossiste ${grossiste.nom}`
      });

      // Notify new grossiste
      const grossisteUsers = await storage.getUsers();
      const grossisteUsersFiltered = grossisteUsers.filter(u => u.role === "grossiste" && u.entityId === grossisteId);
      for (const gu of grossisteUsersFiltered) {
        await storage.createNotification({
          userId: gu.id,
          orderId: id,
          type: "in_app",
          titre: "Nouvelle commande réattribuée",
          message: `Une commande vous a été réattribuée`
        });
      }

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Erreur lors de la réattribution" });
    }
  });

  // Cancel order (delegue only, after refusal)
  app.patch("/api/orders/:id/cancel", requireRole("admin", "delegue"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }

      if (order.status !== "refusee" && order.status !== "brouillon") {
        return res.status(400).json({ error: "Seule une commande refusée ou en brouillon peut être annulée" });
      }

      if (user.role === "delegue" && order.delegueId !== user.id) {
        return res.status(403).json({ error: "Vous ne pouvez annuler que vos propres commandes" });
      }

      const updated = await storage.updateOrderStatus(id, "annulee", user.id, user.role, "Commande annulée par le délégué");
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Erreur lors de l'annulation" });
    }
  });

  // ============================================
  // HISTORY ROUTES
  // ============================================
  
  app.get("/api/history", requireRole("admin", "laboratoire"), async (req, res) => {
    const currentUser = (req as any).user;
    let history = await storage.getAllHistory();
    if (currentUser.role === "laboratoire") {
      const labOrders = await storage.getOrders({ laboratoireId: currentUser.entityId });
      const labOrderIds = new Set(labOrders.map(o => o.id));
      history = history.filter(h => labOrderIds.has(h.orderId));
    }
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
  // COMMERCIAL OFFERS ROUTES
  // ============================================

  app.get("/api/offers", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Non authentifié" });

    let offers;
    if (user.role === "admin") {
      offers = await storage.getCommercialOffers();
    } else if (user.role === "laboratoire" || user.role === "delegue") {
      offers = await storage.getCommercialOffers(user.entityId || undefined);
    } else {
      offers = await storage.getCommercialOffers();
    }
    res.json(offers);
  });

  app.post("/api/offers", requireRole("admin", "delegue", "laboratoire"), async (req, res) => {
    try {
      const user = (req as any).user;
      const offerData = { ...req.body };

      if (user.role === "delegue") {
        offerData.delegueId = user.id;
        offerData.laboratoireId = user.entityId;
      } else if (user.role === "laboratoire") {
        offerData.laboratoireId = user.entityId;
      }

      const offer = await storage.createCommercialOffer(offerData);
      res.status(201).json(offer);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/offers/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const offer = await storage.updateCommercialOffer(id, req.body);
      if (!offer) {
        return res.status(404).json({ error: "Offre non trouvée" });
      }
      res.json(offer);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  // ============================================
  // COMMERCIAL ACTIONS ROUTES
  // ============================================

  app.get("/api/actions", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Non authentifié" });

    let actions;
    if (user.role === "laboratoire") {
      actions = await storage.getCommercialActions(user.entityId || undefined);
    } else {
      actions = await storage.getActiveCommercialActions();
    }
    res.json(actions);
  });

  app.post("/api/actions", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const user = (req as any).user;
      const actionData = { ...req.body };
      
      if (user.role === "laboratoire") {
        actionData.laboratoireId = user.entityId;
      }

      const action = await storage.createCommercialAction(actionData);
      res.status(201).json(action);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/actions/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const action = await storage.updateCommercialAction(id, req.body);
      if (!action) {
        return res.status(404).json({ error: "Action non trouvée" });
      }
      res.json(action);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  // ============================================
  // COMMUNICATIONS ROUTES
  // ============================================

  app.get("/api/communications", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Non authentifié" });

    const comms = await storage.getCommunications(user.role, user.entityId || undefined);
    res.json(comms);
  });

  app.post("/api/communications", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const user = (req as any).user;
      const commData = { ...req.body };
      
      if (user.role === "laboratoire") {
        commData.laboratoireId = user.entityId;
      }

      const comm = await storage.createCommunication(commData);
      res.status(201).json(comm);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.patch("/api/communications/:id", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const comm = await storage.updateCommunication(id, req.body);
      if (!comm) {
        return res.status(404).json({ error: "Communication non trouvée" });
      }
      res.json(comm);
    } catch (error) {
      res.status(400).json({ error: "Données invalides" });
    }
  });

  app.post("/api/communications/:id/view", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    await storage.incrementCommunicationViews(id);
    res.json({ success: true });
  });

  // ============================================
  // DASHBOARD & STATS ROUTES
  // ============================================
  
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    
    const stats = await storage.getDashboardStats(user.id, user.role, user.entityId);
    res.json(stats);
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "Non authentifié" });
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
