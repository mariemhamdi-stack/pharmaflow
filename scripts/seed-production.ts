import { db } from "../server/db";
import { entities, users, delegueLaboratoires, products, orders, orderLines, orderHistory, notifications, commercialOffers, commercialActions, communications } from "../shared/schema";
import * as fs from "fs";
import { sql } from "drizzle-orm";

async function seedProduction() {
  const raw = fs.readFileSync("scripts/dev-data.json", "utf-8");
  const data = JSON.parse(raw);

  const tableMap: [string, any][] = [
    ["communications", communications],
    ["commercial_actions", commercialActions],
    ["commercial_offers", commercialOffers],
    ["notifications", notifications],
    ["order_history", orderHistory],
    ["order_lines", orderLines],
    ["orders", orders],
    ["delegue_laboratoires", delegueLaboratoires],
    ["products", products],
    ["users", users],
    ["entities", entities],
  ];

  console.log("Clearing production tables...");
  for (const [name, table] of tableMap) {
    try {
      await db.delete(table);
      console.log(`  Cleared ${name}`);
    } catch (e: any) {
      console.log(`  Warning clearing ${name}: ${e.message}`);
    }
  }

  const insertOrder: [string, any, string][] = [
    ["entities", entities, "entities"],
    ["users", users, "users"],
    ["delegueLaboratoires", delegueLaboratoires, "delegue_laboratoires"],
    ["products", products, "products"],
    ["orders", orders, "orders"],
    ["orderLines", orderLines, "order_lines"],
    ["orderHistory", orderHistory, "order_history"],
    ["notifications", notifications, "notifications"],
    ["commercialOffers", commercialOffers, "commercial_offers"],
    ["commercialActions", commercialActions, "commercial_actions"],
    ["communications", communications, "communications"],
  ];

  console.log("\nInserting data...");
  for (const [key, table, name] of insertOrder) {
    const rows = data[key];
    if (!rows || rows.length === 0) {
      console.log(`  ${name}: 0 rows (skip)`);
      continue;
    }

    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        await db.insert(table).values(batch);
        inserted += batch.length;
      } catch (e: any) {
        console.error(`  ERROR inserting batch in ${name}: ${e.message}`);
        for (const row of batch) {
          try {
            await db.insert(table).values(row);
            inserted++;
          } catch (e2: any) {
            console.error(`    Failed row in ${name}: ${e2.message}`);
          }
        }
      }
    }
    console.log(`  ${name}: ${inserted} rows inserted`);
  }

  console.log("\nProduction database seeded successfully!");
  process.exit(0);
}

seedProduction().catch(console.error);
