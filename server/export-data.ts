import { db } from "./db";
import { users, entities, products, delegueLaboratoires, orders, orderLines, orderHistory } from "@shared/schema";
import fs from "fs";
import path from "path";

async function exportData() {
  const dataDir = path.join(process.cwd(), "server", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log("Exporting entities...");
  const allEntities = await db.select().from(entities);
  fs.writeFileSync(path.join(dataDir, "entities.json"), JSON.stringify(allEntities, null, 2));
  console.log(`  ${allEntities.length} entities exported`);

  console.log("Exporting users...");
  const allUsers = await db.select().from(users);
  fs.writeFileSync(path.join(dataDir, "users.json"), JSON.stringify(allUsers, null, 2));
  console.log(`  ${allUsers.length} users exported`);

  console.log("Exporting products...");
  const allProducts = await db.select().from(products);
  fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(allProducts, null, 2));
  console.log(`  ${allProducts.length} products exported`);

  console.log("Exporting delegue_laboratoires...");
  const allDL = await db.select().from(delegueLaboratoires);
  fs.writeFileSync(path.join(dataDir, "delegue_laboratoires.json"), JSON.stringify(allDL, null, 2));
  console.log(`  ${allDL.length} delegue_laboratoires exported`);

  console.log("Exporting orders...");
  const allOrders = await db.select().from(orders);
  fs.writeFileSync(path.join(dataDir, "orders.json"), JSON.stringify(allOrders, null, 2));
  console.log(`  ${allOrders.length} orders exported`);

  console.log("Exporting order_lines...");
  const allOrderLines = await db.select().from(orderLines);
  fs.writeFileSync(path.join(dataDir, "order_lines.json"), JSON.stringify(allOrderLines, null, 2));
  console.log(`  ${allOrderLines.length} order_lines exported`);

  console.log("Exporting order_history...");
  const allHistory = await db.select().from(orderHistory);
  fs.writeFileSync(path.join(dataDir, "order_history.json"), JSON.stringify(allHistory, null, 2));
  console.log(`  ${allHistory.length} order_history exported`);

  console.log("Export complete!");
  process.exit(0);
}

exportData().catch(err => {
  console.error("Export failed:", err);
  process.exit(1);
});
