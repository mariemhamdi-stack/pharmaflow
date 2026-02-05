import { db } from "./db";
import { users, entities, products, orders, orderLines, orderHistory } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  // Check if data already exists
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  // Create entities
  const [labPharmaPlus] = await db.insert(entities).values({
    nom: "PharmaPlus Laboratoires",
    type: "laboratoire",
    email: "contact@pharmaplus.com",
    telephone: "+33 1 42 00 00 01",
    adresse: "15 Rue de la Sant\u00e9, 75013 Paris"
  }).returning();

  const [labBioMed] = await db.insert(entities).values({
    nom: "BioMed Research",
    type: "laboratoire",
    email: "info@biomed.com",
    telephone: "+33 1 42 00 00 02",
    adresse: "8 Avenue Pasteur, 69007 Lyon"
  }).returning();

  const [grossisteMediStock] = await db.insert(entities).values({
    nom: "MediStock Distribution",
    type: "grossiste",
    email: "commandes@medistock.fr",
    telephone: "+33 1 55 00 00 01",
    adresse: "Zone Industrielle Nord, 93200 Saint-Denis"
  }).returning();

  const [grossistePharmaLogis] = await db.insert(entities).values({
    nom: "PharmaLogis",
    type: "grossiste",
    email: "contact@pharmalogis.fr",
    telephone: "+33 1 55 00 00 02",
    adresse: "23 Boulevard Commerce, 33000 Bordeaux"
  }).returning();

  const [pharmacieCentrale] = await db.insert(entities).values({
    nom: "Pharmacie Centrale",
    type: "pharmacie",
    email: "pharmacie.centrale@email.com",
    telephone: "+33 1 45 00 00 01",
    adresse: "45 Avenue de la R\u00e9publique, 75011 Paris"
  }).returning();

  const [pharmacieSoleil] = await db.insert(entities).values({
    nom: "Pharmacie du Soleil",
    type: "pharmacie",
    email: "pharmacie.soleil@email.com",
    telephone: "+33 4 91 00 00 01",
    adresse: "12 Rue du Port, 13001 Marseille"
  }).returning();

  const [pharmacieLiberté] = await db.insert(entities).values({
    nom: "Pharmacie Libert\u00e9",
    type: "pharmacie",
    email: "pharmacie.liberte@email.com",
    telephone: "+33 5 56 00 00 01",
    adresse: "78 Cours Libert\u00e9, 33000 Bordeaux"
  }).returning();

  // Create users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const deleguePassword = await bcrypt.hash("delegue123", 10);
  const grossistePassword = await bcrypt.hash("grossiste123", 10);
  const pharmaciePassword = await bcrypt.hash("pharmacie123", 10);
  const laboPassword = await bcrypt.hash("labo123", 10);

  const [adminUser] = await db.insert(users).values({
    nom: "Martin",
    prenom: "Sophie",
    email: "admin@pharmaflow.com",
    telephone: "+33 6 00 00 00 00",
    password: adminPassword,
    role: "admin",
    entityId: null,
    status: "actif"
  }).returning();

  const [delegueUser] = await db.insert(users).values({
    nom: "Dubois",
    prenom: "Pierre",
    email: "delegue@pharmaflow.com",
    telephone: "+33 6 11 11 11 11",
    password: deleguePassword,
    role: "delegue",
    entityId: labPharmaPlus.id,
    status: "actif"
  }).returning();

  const [delegue2User] = await db.insert(users).values({
    nom: "Bernard",
    prenom: "Marie",
    email: "marie.bernard@pharmaflow.com",
    telephone: "+33 6 22 22 22 22",
    password: deleguePassword,
    role: "delegue",
    entityId: labBioMed.id,
    status: "actif"
  }).returning();

  const [grossisteUser] = await db.insert(users).values({
    nom: "Leroy",
    prenom: "Jean",
    email: "grossiste@pharmaflow.com",
    telephone: "+33 6 33 33 33 33",
    password: grossistePassword,
    role: "grossiste",
    entityId: grossisteMediStock.id,
    status: "actif"
  }).returning();

  const [pharmacieUser] = await db.insert(users).values({
    nom: "Moreau",
    prenom: "Claire",
    email: "pharmacie@pharmaflow.com",
    telephone: "+33 6 44 44 44 44",
    password: pharmaciePassword,
    role: "pharmacie",
    entityId: pharmacieCentrale.id,
    status: "actif"
  }).returning();

  const [laboUser] = await db.insert(users).values({
    nom: "Petit",
    prenom: "Fran\u00e7ois",
    email: "labo@pharmaflow.com",
    telephone: "+33 6 55 55 55 55",
    password: laboPassword,
    role: "laboratoire",
    entityId: labPharmaPlus.id,
    status: "actif"
  }).returning();

  // Create products
  const [prodDoliprane] = await db.insert(products).values({
    code: "DOL-500",
    nom: "Doliprane",
    laboratoireId: labPharmaPlus.id,
    forme: "Comprim\u00e9",
    dosage: "500mg",
    status: "actif"
  }).returning();

  const [prodIbuprofene] = await db.insert(products).values({
    code: "IBU-400",
    nom: "Ibuprof\u00e8ne",
    laboratoireId: labPharmaPlus.id,
    forme: "Comprim\u00e9",
    dosage: "400mg",
    status: "actif"
  }).returning();

  const [prodAmoxicilline] = await db.insert(products).values({
    code: "AMX-1G",
    nom: "Amoxicilline",
    laboratoireId: labPharmaPlus.id,
    forme: "G\u00e9lule",
    dosage: "1g",
    status: "actif"
  }).returning();

  const [prodOmeprazole] = await db.insert(products).values({
    code: "OMP-20",
    nom: "Omeprazole",
    laboratoireId: labBioMed.id,
    forme: "G\u00e9lule",
    dosage: "20mg",
    status: "actif"
  }).returning();

  const [prodMetformine] = await db.insert(products).values({
    code: "MET-850",
    nom: "Metformine",
    laboratoireId: labBioMed.id,
    forme: "Comprim\u00e9",
    dosage: "850mg",
    status: "actif"
  }).returning();

  const [prodAtorvastatin] = await db.insert(products).values({
    code: "ATV-10",
    nom: "Atorvastatine",
    laboratoireId: labBioMed.id,
    forme: "Comprim\u00e9",
    dosage: "10mg",
    status: "actif"
  }).returning();

  // Create sample orders
  const [order1] = await db.insert(orders).values({
    laboratoireId: labPharmaPlus.id,
    delegueId: delegueUser.id,
    pharmacieId: pharmacieCentrale.id,
    grossisteId: grossisteMediStock.id,
    status: "envoyee",
    commentaire: "Livraison urgente demand\u00e9e",
    sentAt: new Date()
  }).returning();

  await db.insert(orderLines).values([
    { orderId: order1.id, productId: prodDoliprane.id, quantiteCommandee: 100, status: "en_attente" },
    { orderId: order1.id, productId: prodIbuprofene.id, quantiteCommandee: 50, status: "en_attente" }
  ]);

  await db.insert(orderHistory).values({
    orderId: order1.id,
    ancienStatus: "brouillon",
    nouveauStatus: "envoyee",
    userId: delegueUser.id,
    role: "delegue"
  });

  const [order2] = await db.insert(orders).values({
    laboratoireId: labPharmaPlus.id,
    delegueId: delegueUser.id,
    pharmacieId: pharmacieSoleil.id,
    grossisteId: grossistePharmaLogis.id,
    status: "acceptee"
  }).returning();

  await db.insert(orderLines).values([
    { orderId: order2.id, productId: prodAmoxicilline.id, quantiteCommandee: 30, quantiteAcceptee: 30, status: "acceptee" }
  ]);

  await db.insert(orderHistory).values([
    { orderId: order2.id, ancienStatus: "brouillon", nouveauStatus: "envoyee", userId: delegueUser.id, role: "delegue" },
    { orderId: order2.id, ancienStatus: "envoyee", nouveauStatus: "acceptee", userId: grossisteUser.id, role: "grossiste" }
  ]);

  const [order3] = await db.insert(orders).values({
    laboratoireId: labBioMed.id,
    delegueId: delegue2User.id,
    pharmacieId: pharmacieLiberté.id,
    grossisteId: grossisteMediStock.id,
    status: "en_preparation"
  }).returning();

  await db.insert(orderLines).values([
    { orderId: order3.id, productId: prodOmeprazole.id, quantiteCommandee: 60, quantiteAcceptee: 60, status: "acceptee" },
    { orderId: order3.id, productId: prodMetformine.id, quantiteCommandee: 40, quantiteAcceptee: 40, status: "acceptee" }
  ]);

  await db.insert(orderHistory).values([
    { orderId: order3.id, ancienStatus: "brouillon", nouveauStatus: "envoyee", userId: delegue2User.id, role: "delegue" },
    { orderId: order3.id, ancienStatus: "envoyee", nouveauStatus: "acceptee", userId: grossisteUser.id, role: "grossiste" },
    { orderId: order3.id, ancienStatus: "acceptee", nouveauStatus: "en_preparation", userId: grossisteUser.id, role: "grossiste" }
  ]);

  const [order4] = await db.insert(orders).values({
    laboratoireId: labPharmaPlus.id,
    delegueId: delegueUser.id,
    pharmacieId: pharmacieCentrale.id,
    grossisteId: grossisteMediStock.id,
    status: "brouillon",
    commentaire: "Commande en attente de validation"
  }).returning();

  await db.insert(orderLines).values([
    { orderId: order4.id, productId: prodDoliprane.id, quantiteCommandee: 200, status: "en_attente" },
    { orderId: order4.id, productId: prodAmoxicilline.id, quantiteCommandee: 50, status: "en_attente" }
  ]);

  console.log("Database seeded successfully!");
}
