import { db } from "../server/db";
import { entities, users, delegueLaboratoires, products, orders, orderLines, orderHistory, notifications, commercialOffers, commercialActions, communications } from "../shared/schema";
import * as fs from "fs";

async function exportData() {
  console.log("Exporting development data...");

  const data = {
    entities: await db.select().from(entities),
    users: await db.select().from(users),
    delegueLaboratoires: await db.select().from(delegueLaboratoires),
    products: await db.select().from(products),
    orders: await db.select().from(orders),
    orderLines: await db.select().from(orderLines),
    orderHistory: await db.select().from(orderHistory),
    notifications: await db.select().from(notifications),
    commercialOffers: await db.select().from(commercialOffers),
    commercialActions: await db.select().from(commercialActions),
    communications: await db.select().from(communications),
  };

  for (const [table, rows] of Object.entries(data)) {
    console.log(`  ${table}: ${(rows as any[]).length} rows`);
  }

  fs.writeFileSync("scripts/dev-data.json", JSON.stringify(data, null, 2));
  console.log("\nExported to scripts/dev-data.json");
  process.exit(0);
}

exportData().catch(console.error);
