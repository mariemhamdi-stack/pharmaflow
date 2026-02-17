import { db } from "./db";
import { users, entities, products, delegueLaboratoires, orders, orderLines, orderHistory, notifications, commercialOffers, commercialActions, communications } from "@shared/schema";
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

async function insertInBatches(table: any, data: any[], batchSize = 500) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(table).values(batch);
  }
}

export async function seedDatabase() {
  let existingUserCount = 0;
  try {
    const existingUsers = await db.select().from(users);
    existingUserCount = existingUsers.length;
  } catch (err) {
    console.error("Error checking existing users, tables may not exist yet:", err);
    return;
  }

  if (existingUserCount > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Database is empty (0 users), seeding...");

  const fullExport = loadFullExport();
  if (fullExport) {
    console.log("Seeding from full export (dev-data.json)...");
    try {
      const tableInserts: [string, any, number?][] = [
        ["entities", entities, 200],
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
