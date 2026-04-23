import { db } from "./db";
import { users, entities, pharmacies, grossistes, products, delegueLaboratoires, orders, orderLines, orderHistory, notifications, commercialOffers, commercialActions, communications } from "@shared/schema";
import { inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";

function loadJSON(filename: string): any[] {
  const possiblePaths = [
    path.join(process.cwd(), "server", "data", filename),
    path.join(__dirname, "data", filename),
    path.join(__dirname, "..", "server", "data", filename),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  }
  console.log(`  Data file not found: ${filename}, tried paths: ${possiblePaths.join(", ")}`);
  return [];
}

function loadFullExport(): any | null {
  const possiblePaths = [
    path.join(process.cwd(), "scripts", "dev-data.json"),
    path.join(__dirname, "..", "scripts", "dev-data.json"),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  }
  return null;
}

const dateFields = [
  "createdAt", "lastLogin", "blockedAt", "sentAt",
  "validatedByDelegueAt", "validatedByPharmacieAt",
  "dateDebut", "dateFin", "viewedAt", "readAt",
  "startDate", "endDate", "timestamp"
];

function convertDates(rows: any[]): any[] {
  return rows.map(row => {
    const converted = { ...row };
    for (const field of dateFields) {
      if (converted[field] && typeof converted[field] === "string") {
        converted[field] = new Date(converted[field]);
      }
    }
    return converted;
  });
}

async function insertInBatches(table: any, data: any[], batchSize = 500) {
  const rows = convertDates(data);
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(table).values(batch);
  }
}

// One-time migration: move type=pharmacie/grossiste rows from `entities` table
// into dedicated `pharmacies` and `grossistes` tables, preserving IDs (so existing
// orders.pharmacieId / orders.grossisteId / users.entityId references still resolve).
async function migratePharmaciesAndGrossistes() {
  try {
    const existingPharmacies = await db.select().from(pharmacies);
    const existingGrossistes = await db.select().from(grossistes);
    if (existingPharmacies.length > 0 || existingGrossistes.length > 0) {
      return; // already migrated
    }
    const allEntities = await db.select().from(entities);
    const pharmacieRows: any[] = [];
    const grossisteRows: any[] = [];

    for (const e of allEntities) {
      if (e.type === "pharmacie") {
        pharmacieRows.push({
          id: e.id,
          nom: e.nom,
          adresse: e.adresse ?? null,
          tel1: e.telephone ?? null,
          email1: e.email ?? null,
          region: e.region ?? null,
          secteur: e.secteur ?? null,
          classification: e.classification ?? null,
          proprietaire: e.proprietaire ?? null,
          pharmacienResponsable: e.pharmacienResponsable ?? null,
          preparateurs: e.preparateurs ?? null,
          blocked: e.blocked ?? false,
          blockedAt: e.blockedAt ?? null,
          createdAt: e.createdAt,
        });
      } else if (e.type === "grossiste") {
        grossisteRows.push({
          id: e.id,
          nom: e.nom,
          adresse: e.adresse ?? null,
          tel1: e.telephone ?? null,
          email1: e.email ?? null,
          region: e.region ?? null,
          secteur: e.secteur ?? null,
          blocked: e.blocked ?? false,
          blockedAt: e.blockedAt ?? null,
          createdAt: e.createdAt,
        });
      }
    }

    if (pharmacieRows.length > 0) {
      console.log(`Migrating ${pharmacieRows.length} pharmacies from entities table...`);
      for (let i = 0; i < pharmacieRows.length; i += 200) {
        await db.insert(pharmacies).values(pharmacieRows.slice(i, i + 200));
      }
    }
    if (grossisteRows.length > 0) {
      console.log(`Migrating ${grossisteRows.length} grossistes from entities table...`);
      for (let i = 0; i < grossisteRows.length; i += 200) {
        await db.insert(grossistes).values(grossisteRows.slice(i, i + 200));
      }
    }
    if (pharmacieRows.length > 0 || grossisteRows.length > 0) {
      console.log("Removing migrated rows from entities table...");
      await db.delete(entities).where(inArray(entities.type, ["pharmacie", "grossiste"]));
    }
  } catch (err) {
    console.error("Migration error (pharmacies/grossistes):", err);
  }
}

export async function seedDatabase() {
  let existingUserCount = 0;
  let existingEntityCount = 0;
  let existingProductCount = 0;
  try {
    const existingUsers = await db.select().from(users);
    existingUserCount = existingUsers.length;
    const existingEntities = await db.select().from(entities);
    existingEntityCount = existingEntities.length;
    const existingProducts = await db.select().from(products);
    existingProductCount = existingProducts.length;
  } catch (err) {
    console.error("Error checking existing data, tables may not exist yet:", err);
    return;
  }

  if (existingUserCount > 0 && existingEntityCount > 100 && existingProductCount > 100) {
    console.log("Database already fully seeded, skipping seed.");
    await migratePharmaciesAndGrossistes();
    return;
  }

  if (existingUserCount > 0 || existingEntityCount > 0) {
    console.log("Database partially seeded, clearing and re-seeding...");
    try {
      await db.delete(communications);
      await db.delete(commercialActions);
      await db.delete(commercialOffers);
      await db.delete(notifications);
      await db.delete(orderHistory);
      await db.delete(orderLines);
      await db.delete(orders);
      await db.delete(delegueLaboratoires);
      await db.delete(products);
      await db.delete(users);
      await db.delete(entities);
      await db.delete(pharmacies);
      await db.delete(grossistes);
    } catch (err) {
      console.log("Warning during cleanup:", err);
    }
  }

  console.log("Seeding database...");

  const fullExport = loadFullExport();
  if (fullExport) {
    console.log("Seeding from full export (dev-data.json)...");

    // Split entities by type: laboratoires stay in entities; pharmacies/grossistes move to dedicated tables
    if (Array.isArray(fullExport.entities)) {
      const allEntities = fullExport.entities;
      const entityRows: any[] = [];
      const pharmacieRows: any[] = [];
      const grossisteRows: any[] = [];

      for (const e of allEntities) {
        if (e.type === "pharmacie") {
          pharmacieRows.push({
            id: e.id,
            nom: e.nom,
            adresse: e.adresse ?? null,
            tel1: e.telephone ?? null,
            email1: e.email ?? null,
            region: e.region ?? null,
            secteur: e.secteur ?? null,
            classification: e.classification ?? null,
            proprietaire: e.proprietaire ?? null,
            pharmacienResponsable: e.pharmacienResponsable ?? null,
            preparateurs: e.preparateurs ?? null,
            blocked: e.blocked ?? false,
            blockedAt: e.blockedAt ?? null,
            createdAt: e.createdAt,
          });
        } else if (e.type === "grossiste") {
          grossisteRows.push({
            id: e.id,
            nom: e.nom,
            adresse: e.adresse ?? null,
            tel1: e.telephone ?? null,
            email1: e.email ?? null,
            region: e.region ?? null,
            secteur: e.secteur ?? null,
            blocked: e.blocked ?? false,
            blockedAt: e.blockedAt ?? null,
            createdAt: e.createdAt,
          });
        } else {
          entityRows.push(e);
        }
      }

      fullExport.entities = entityRows;
      fullExport.pharmacies = pharmacieRows;
      fullExport.grossistes = grossisteRows;
    }

    try {
      const tableInserts: [string, any, number?][] = [
        ["entities", entities, 200],
        ["pharmacies", pharmacies, 200],
        ["grossistes", grossistes, 200],
        ["users", users],
        ["delegueLaboratoires", delegueLaboratoires],
        ["products", products, 200],
        ["orders", orders],
        ["orderLines", orderLines],
        ["orderHistory", orderHistory],
        ["notifications", notifications],
        ["commercialOffers", commercialOffers],
        ["commercialActions", commercialActions],
        ["communications", communications],
      ];

      for (const [key, table, batchSize] of tableInserts) {
        const rows = fullExport[key];
        if (rows && rows.length > 0) {
          console.log(`  Inserting ${rows.length} ${key}...`);
          await insertInBatches(table, rows, (batchSize as number) || 500);
        }
      }

      console.log("Database seeded successfully from full export!");
      return;
    } catch (err) {
      console.error("Error seeding from full export:", err);
    }
  }

  console.log("Seeding from individual data files...");

  try {
    const entitiesData = loadJSON("entities.json");
    if (entitiesData.length > 0) {
      console.log(`  Inserting ${entitiesData.length} entities...`);
      await insertInBatches(entities, entitiesData);
    }

    const usersData = loadJSON("users.json");
    if (usersData.length > 0) {
      console.log(`  Inserting ${usersData.length} users...`);
      await insertInBatches(users, usersData);
    }

    const productsData = loadJSON("products.json");
    if (productsData.length > 0) {
      console.log(`  Inserting ${productsData.length} products...`);
      await insertInBatches(products, productsData, 200);
    }

    const dlData = loadJSON("delegue_laboratoires.json");
    if (dlData.length > 0) {
      console.log(`  Inserting ${dlData.length} delegue_laboratoires...`);
      await insertInBatches(delegueLaboratoires, dlData);
    }

    const ordersData = loadJSON("orders.json");
    if (ordersData.length > 0) {
      console.log(`  Inserting ${ordersData.length} orders...`);
      await insertInBatches(orders, ordersData);
    }

    const orderLinesData = loadJSON("order_lines.json");
    if (orderLinesData.length > 0) {
      console.log(`  Inserting ${orderLinesData.length} order_lines...`);
      await insertInBatches(orderLines, orderLinesData);
    }

    const historyData = loadJSON("order_history.json");
    if (historyData.length > 0) {
      console.log(`  Inserting ${historyData.length} order_history...`);
      await insertInBatches(orderHistory, historyData);
    }

    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}
