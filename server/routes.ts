import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertEntitySchema, insertProductSchema, insertOrderSchema, insertOrderLineSchema, statusTransitions, insertCommercialOfferSchema, insertCommercialActionSchema, insertCommunicationSchema, type CommercialOffer, type CommercialAction } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sendOrderStatusEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";
import { static as serveStatic } from "express";
import { parse } from "csv-parse/sync";

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

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ 
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"));
    }
  }
});

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

  app.use("/uploads", serveStatic(uploadsDir));

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
    if (currentUser.role === "laboratoire" && currentUser.entityId) {
      const delegueIds = await storage.getDelegueIdsForLaboratoire(currentUser.entityId);
      users = users.filter(u => 
        u.entityId === currentUser.entityId || 
        (u.role === "delegue" && delegueIds.includes(u.id))
      );
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
  
  app.get("/api/entities/search", requireAuth, async (req, res) => {
    const search = (req.query.q as string) || "";
    const type = req.query.type as string | undefined;
    const results = await storage.searchEntities(search, type);
    res.json(results);
  });

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

  // Import entities from CSV file
  const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.csv') {
        cb(null, true);
      } else {
        cb(new Error("Format de fichier non supporté. Utilisez un fichier CSV."));
      }
    }
  });

  app.post("/api/entities/import", requireRole("admin"), importUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const entityType = req.body.type;

      if (!file) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }
      if (!entityType || !["pharmacie", "grossiste"].includes(entityType)) {
        return res.status(400).json({ error: "Type d'entité invalide" });
      }

      const content = file.buffer.toString("utf-8");
      let rows: any[] = [];

      try {
        rows = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          delimiter: [",", ";", "\t"]
        });
      } catch (parseErr) {
        return res.status(400).json({ error: "Erreur de lecture du fichier CSV. Vérifiez le format." });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "Le fichier est vide" });
      }

      let imported = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nom = row.nom || row.Nom || row.name || row.Name || "";
        if (!nom.trim()) {
          errors.push(`Ligne ${i + 2}: nom manquant`);
          continue;
        }

        const entityData: any = {
          nom: nom.trim(),
          type: entityType,
          email: (row.email || row.Email || row.EMAIL || "").trim() || null,
          telephone: (row.telephone || row.Telephone || row.tel || row.Tel || row.phone || row.Phone || "").trim() || null,
          adresse: (row.adresse || row.Adresse || row.address || row.Address || "").trim() || null,
          region: (row.region || row.Region || row.région || row.Région || "").trim() || null,
          secteur: (row.secteur || row.Secteur || "").trim() || null,
        };

        if (entityType === "pharmacie") {
          entityData.classification = (row.classification || row.Classification || row.classe || row.Classe || "").trim() || null;
          entityData.proprietaire = (row.proprietaire || row.Proprietaire || row.propriétaire || row.Propriétaire || "").trim() || null;
          entityData.pharmacienResponsable = (row.pharmacienResponsable || row.pharmacien_responsable || row.pharmacien || row.Pharmacien || "").trim() || null;
          const prep = (row.preparateurs || row.Preparateurs || row.préparateurs || row.Préparateurs || "").trim();
          entityData.preparateurs = prep ? JSON.stringify(prep.split("|").map((p: string) => p.trim()).filter(Boolean)) : null;
        }

        try {
          await storage.createEntity(entityData);
          imported++;
        } catch (err) {
          errors.push(`Ligne ${i + 2}: erreur lors de l'importation de "${nom}"`);
        }
      }

      res.json({ imported, total: rows.length, errors: errors.length > 0 ? errors : undefined });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erreur lors de l'importation" });
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
  
  app.get("/api/products/search", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    const search = (req.query.q as string) || "";
    
    let laboratoireIds: string[] | undefined;
    if (user?.role === "laboratoire" && user.entityId) {
      laboratoireIds = [user.entityId];
    } else if (user?.role === "delegue") {
      const laboIds = await storage.getDelegueLaboratoireIds(user.id);
      if (laboIds.length > 0) {
        laboratoireIds = laboIds;
      } else if (user.entityId) {
        laboratoireIds = [user.entityId];
      }
    }
    
    const results = await storage.searchProducts(search, laboratoireIds);
    res.json(results);
  });

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
      if (!laboratoireId) {
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
        remise: l.remise || null,
        gratuite: l.gratuite || null,
        bonAchat: l.bonAchat || null,
        pack: l.pack || null,
        miseEnPlace: l.miseEnPlace || false,
        autre: l.autre || null,
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
      const { status, commentaire, lines } = req.body;
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
        if (!commentaire) {
          return res.status(400).json({ error: "Le motif du litige est obligatoire" });
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

      // Update order lines for partial acceptance
      if (status === "partiellement_acceptee" && lines && Array.isArray(lines)) {
        const orderLines = order.lines || [];
        const orderLineIds = new Set(orderLines.map(l => l.id));
        for (const line of lines) {
          if (!line.id || !orderLineIds.has(line.id)) continue;
          const dbLine = orderLines.find(l => l.id === line.id);
          if (!dbLine) continue;
          const acceptee = Math.max(0, Math.min(dbLine.quantiteCommandee, typeof line.quantiteAcceptee === "number" ? line.quantiteAcceptee : dbLine.quantiteCommandee));
          const lineStatus = acceptee === 0 ? "refusee" 
            : acceptee < dbLine.quantiteCommandee ? "partiellement_acceptee" 
            : "acceptee";
          await storage.updateOrderLine(line.id, acceptee, lineStatus);
        }
      }

      // Update all lines to "acceptee" when order is fully accepted
      if (status === "acceptee" && order.lines) {
        for (const line of order.lines) {
          await storage.updateOrderLine(line.id, line.quantiteCommandee, "acceptee");
        }
      }
      
      // Require BL upload before marking as livree
      if (status === "livree" && !order.bonLivraisonUrl) {
        return res.status(400).json({ error: "Veuillez téléverser le bon de livraison avant de marquer la commande comme livrée" });
      }

      // Require BR upload before closing
      if (status === "cloturee" && !order.bonReceptionUrl) {
        return res.status(400).json({ error: "Veuillez téléverser le bon de réception avant de clôturer la commande" });
      }

      // Auto-transition: validee_pharmacie → envoyee (automatic)
      if (status === "validee_pharmacie") {
        try {
          await storage.updateOrderStatus(id, "envoyee", user.id, "system" as any, "Transmission automatique au grossiste");
        } catch (err) {
          console.error("Auto-transition error:", err);
        }
        
        try {
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
              try {
                await sendOrderStatusEmail(gu.email, `${gu.prenom} ${gu.nom}`, 'grossiste', {
                  orderId: id,
                  pharmacieName: pharmacieEntity?.nom || 'Pharmacie',
                  grossisteName: grossisteEntity?.nom || 'Grossiste',
                  status: 'envoyee'
                });
              } catch (emailErr) {
                console.error("Email notification error:", emailErr);
              }
            }
          }
        } catch (notifErr) {
          console.error("Notification error:", notifErr);
        }

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
      
      // Notifications based on status (non-blocking)
      try {
        if (status === "validee_delegue") {
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
            try { await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData); } catch(e) { console.error("Email error:", e); }
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
            try { await sendOrderStatusEmail(delegue.email, `${delegue.prenom} ${delegue.nom}`, 'delegue', emailOrderData); } catch(e) { console.error("Email error:", e); }
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
              try { await sendOrderStatusEmail(pu.email, `${pu.prenom} ${pu.nom}`, 'pharmacie', emailOrderData); } catch(e) { console.error("Email error:", e); }
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
      } catch (notifErr) {
        console.error("Notification error (non-blocking):", notifErr);
      }
      
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Erreur lors de la mise à jour" });
    }
  });

  // Upload delivery documents
  app.post("/api/orders/:id/upload", requireAuth, upload.single("document"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Non authentifié" });
      
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ error: "Commande non trouvée" });
      
      const file = req.file;
      if (!file) return res.status(400).json({ error: "Aucun fichier" });
      
      const type = req.body.type;
      const fileUrl = `/uploads/${file.filename}`;
      
      if (type === "bon_livraison" && (user.role === "grossiste" || user.role === "admin")) {
        await storage.updateOrderDocuments(id, { bonLivraisonUrl: fileUrl });
      } else if (type === "bon_reception" && (user.role === "pharmacie" || user.role === "admin")) {
        await storage.updateOrderDocuments(id, { bonReceptionUrl: fileUrl });
      } else {
        return res.status(403).json({ error: "Action non autorisée" });
      }
      
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(400).json({ error: "Erreur lors de l'upload" });
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

    let offers: CommercialOffer[] = [];
    if (user.role === "admin") {
      offers = await storage.getCommercialOffers();
    } else if (user.role === "laboratoire") {
      offers = await storage.getCommercialOffers(user.entityId || undefined);
    } else if (user.role === "delegue") {
      const laboIds = await storage.getDelegueLaboratoireIds(user.id);
      if (laboIds.length > 0) {
        offers = await storage.getCommercialOffersByLabs(laboIds);
      } else if (user.entityId) {
        offers = await storage.getCommercialOffers(user.entityId);
      } else {
        offers = [];
      }
    } else if (user.role === "grossiste" && user.entityId) {
      offers = await storage.getCommercialOffersForGrossiste(user.entityId);
    } else if (user.role === "pharmacie" && user.entityId) {
      offers = await storage.getCommercialOffersForPharmacie(user.entityId);
    } else {
      offers = [];
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

      if (offerData.orderId === "none" || offerData.orderId === "") {
        offerData.orderId = null;
      }
      if (!offerData.pharmacieId || offerData.pharmacieId === "") {
        offerData.pharmacieId = null;
      }
      if (!offerData.laboratoireId) {
        return res.status(400).json({ error: "Laboratoire requis" });
      }

      if (offerData.dateDebut) {
        offerData.dateDebut = new Date(offerData.dateDebut);
      }
      if (offerData.dateFin) {
        offerData.dateFin = new Date(offerData.dateFin);
      }

      const offer = await storage.createCommercialOffer(offerData);

      const allUsers = await storage.getUsers();
      const notifMessage = `Nouvelle offre : ${offerData.titre}`;

      if (offerData.laboratoireId) {
        const delegueIds = await storage.getDelegueIdsForLaboratoire(offerData.laboratoireId);
        for (const dId of delegueIds) {
          await storage.createNotification({ userId: dId, type: "in_app", titre: "Nouvelle offre commerciale", message: notifMessage });
        }
      }

      if (offerData.pharmacieIds) {
        try {
          const parsed = JSON.parse(offerData.pharmacieIds);
          if (parsed === "all") {
            const pharmacieUsers = allUsers.filter(u => u.role === "pharmacie");
            for (const pu of pharmacieUsers) {
              await storage.createNotification({ userId: pu.id, type: "in_app", titre: "Nouvelle offre commerciale", message: notifMessage });
            }
          } else if (Array.isArray(parsed)) {
            const pharmacieUsers = allUsers.filter(u => u.role === "pharmacie" && parsed.includes(u.entityId));
            for (const pu of pharmacieUsers) {
              await storage.createNotification({ userId: pu.id, type: "in_app", titre: "Nouvelle offre commerciale", message: notifMessage });
            }
          }
        } catch {}
      }

      const grossisteUsers = allUsers.filter(u => u.role === "grossiste");
      for (const gu of grossisteUsers) {
        await storage.createNotification({ userId: gu.id, type: "in_app", titre: "Nouvelle offre commerciale", message: notifMessage });
      }

      res.status(201).json(offer);
    } catch (error: any) {
      console.error("Error creating offer:", error?.message || error);
      res.status(400).json({ error: error?.message || "Données invalides" });
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

  app.patch("/api/offers/:id/toggle-active", requireRole("admin", "laboratoire"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = (req as any).user;
      const existing = await storage.getCommercialOffer(id);
      if (!existing) return res.status(404).json({ error: "Offre non trouvée" });
      if (user.role === "laboratoire" && existing.laboratoireId !== user.entityId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      const newActive = !existing.active;
      const offer = await storage.updateCommercialOffer(id, { active: newActive } as any);
      
      const allUsers = await storage.getUsers();
      const message = newActive ? `L'offre "${existing.titre}" a été activée` : `L'offre "${existing.titre}" a été désactivée`;
      const titre = newActive ? "Offre activée" : "Offre désactivée";
      
      const delegueIds = await storage.getDelegueIdsForLaboratoire(existing.laboratoireId);
      for (const dId of delegueIds) {
        await storage.createNotification({ userId: dId, type: "in_app", titre, message });
      }
      
      if (existing.pharmacieIds) {
        try {
          const parsed = JSON.parse(existing.pharmacieIds);
          if (parsed === "all") {
            const pharmacieUsers = allUsers.filter(u => u.role === "pharmacie");
            for (const pu of pharmacieUsers) {
              await storage.createNotification({ userId: pu.id, type: "in_app", titre, message });
            }
          } else if (Array.isArray(parsed)) {
            const pharmacieUsers = allUsers.filter(u => u.role === "pharmacie" && parsed.includes(u.entityId));
            for (const pu of pharmacieUsers) {
              await storage.createNotification({ userId: pu.id, type: "in_app", titre, message });
            }
          }
        } catch {}
      }
      
      const grossisteUsers = allUsers.filter(u => u.role === "grossiste");
      for (const gu of grossisteUsers) {
        await storage.createNotification({ userId: gu.id, type: "in_app", titre, message });
      }
      
      res.json(offer);
    } catch (error) {
      res.status(400).json({ error: "Erreur" });
    }
  });

  // ============================================
  // COMMERCIAL ACTIONS ROUTES
  // ============================================

  app.get("/api/actions", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Non authentifié" });

    let actions: CommercialAction[] = [];
    if (user.role === "admin") {
      actions = await storage.getCommercialActions();
    } else if (user.role === "laboratoire") {
      actions = await storage.getCommercialActions(user.entityId || undefined);
    } else if (user.role === "delegue") {
      const laboIds = await storage.getDelegueLaboratoireIds(user.id);
      if (laboIds.length > 0) {
        actions = await storage.getCommercialActionsByLabs(laboIds);
      } else if (user.entityId) {
        actions = await storage.getCommercialActions(user.entityId);
      } else {
        actions = [];
      }
    } else if (user.role === "pharmacie" && user.entityId) {
      actions = await storage.getCommercialActionsForPharmacie(user.entityId);
    } else {
      actions = [];
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

      if (!actionData.laboratoireId) {
        return res.status(400).json({ error: "Laboratoire requis" });
      }

      if (actionData.dateDebut) {
        actionData.dateDebut = new Date(actionData.dateDebut);
      }
      if (actionData.dateFin) {
        actionData.dateFin = new Date(actionData.dateFin);
      }

      const action = await storage.createCommercialAction(actionData);
      res.status(201).json(action);
    } catch (error: any) {
      console.error("Error creating action:", error?.message || error);
      res.status(400).json({ error: error?.message || "Données invalides" });
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
    
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const stats = await storage.getFullStats(laboratoireId, dateFrom, dateTo);
    res.json(stats);
  });

  app.post("/api/admin/seed-production", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    try {
      const fs = await import("fs");
      const path = await import("path");
      const dataPath = path.join(process.cwd(), "scripts", "dev-data.json");
      
      if (!fs.existsSync(dataPath)) {
        return res.status(404).json({ error: "Fichier de données introuvable" });
      }

      const raw = fs.readFileSync(dataPath, "utf-8");
      const data = JSON.parse(raw);
      
      const { db } = await import("./db");
      const schema = await import("../shared/schema");

      const tablesClear = [
        schema.communications,
        schema.commercialActions,
        schema.commercialOffers,
        schema.notifications,
        schema.orderHistory,
        schema.orderLines,
        schema.orders,
        schema.delegueLaboratoires,
        schema.products,
        schema.users,
        schema.entities,
      ];

      for (const table of tablesClear) {
        await db.delete(table);
      }

      const insertOrder: [string, any][] = [
        ["entities", schema.entities],
        ["users", schema.users],
        ["delegueLaboratoires", schema.delegueLaboratoires],
        ["products", schema.products],
        ["orders", schema.orders],
        ["orderLines", schema.orderLines],
        ["orderHistory", schema.orderHistory],
        ["notifications", schema.notifications],
        ["commercialOffers", schema.commercialOffers],
        ["commercialActions", schema.commercialActions],
        ["communications", schema.communications],
      ];

      const results: Record<string, number> = {};
      for (const [key, table] of insertOrder) {
        const rows = data[key];
        if (!rows || rows.length === 0) {
          results[key] = 0;
          continue;
        }
        const batchSize = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await db.insert(table).values(batch);
          inserted += batch.length;
        }
        results[key] = inserted;
      }

      res.json({ success: true, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
