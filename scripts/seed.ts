/**
 * Database Seed Script
 * Run with: npx tsx scripts/seed.ts
 *
 * Creates:
 *  - 2 organizations (Org A & Org B)
 *  - 1 user per organization
 *  - 500 data rows belonging to Org A
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../app/lib/schema";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const ORG_A_EMAIL = process.env.ORG_A_EMAIL ?? "orga@example.com";
const ORG_B_EMAIL = process.env.ORG_B_EMAIL ?? "orgb@example.com";

// ─── Sample data vocabulary ───────────────────────────────────────────────────
const DEPARTMENTS = [
  "Engineering", "Marketing", "Finance", "Operations", "HR",
  "Legal", "Sales", "Product", "Design", "Research",
];

const STATUSES = ["Active", "Pending", "Review", "Approved", "Archived"];

const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "David", "Eva",
  "Frank", "Grace", "Henry", "Iris", "James",
  "Karen", "Liam", "Mia", "Noah", "Olivia",
  "Paul", "Quinn", "Rachel", "Sam", "Tina",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones",
  "Garcia", "Miller", "Davis", "Wilson", "Taylor",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("🌱  Starting database seed...\n");

  // ── 1. Upsert Organizations ─────────────────────────────────────────────────
  console.log("📦  Creating organizations...");

  const [orgA] = await db
    .insert(schema.organizations)
    .values({ name: "Organization A", email: ORG_A_EMAIL })
    .onConflictDoUpdate({
      target: schema.organizations.email,
      set: { name: "Organization A" },
    })
    .returning();

  const [orgB] = await db
    .insert(schema.organizations)
    .values({ name: "Organization B", email: ORG_B_EMAIL })
    .onConflictDoUpdate({
      target: schema.organizations.email,
      set: { name: "Organization B" },
    })
    .returning();

  console.log(`   ✅  Org A: ${orgA.id} (${orgA.email})`);
  console.log(`   ✅  Org B: ${orgB.id} (${orgB.email})`);

  // ── 2. Upsert Users ─────────────────────────────────────────────────────────
  console.log("\n👤  Creating users...");

  await db
    .insert(schema.users)
    .values({ orgId: orgA.id, email: ORG_A_EMAIL })
    .onConflictDoNothing();

  await db
    .insert(schema.users)
    .values({ orgId: orgB.id, email: ORG_B_EMAIL })
    .onConflictDoNothing();

  console.log(`   ✅  User for Org A: ${ORG_A_EMAIL}`);
  console.log(`   ✅  User for Org B: ${ORG_B_EMAIL}`);

  // ── 3. Seed 500 Data Rows for Org A ─────────────────────────────────────────
  console.log("\n📊  Seeding 500 rows for Organization A...");

  const rows = Array.from({ length: 500 }, (_, i) => ({
    orgId: orgA.id,
    colA: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    colB: pick(DEPARTMENTS),
    colC: pick(STATUSES),
  }));

  // Insert in batches of 100 to avoid query size limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(schema.dataRows).values(batch);
    console.log(`   ↳  Inserted rows ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)}`);
  }

  console.log("\n✅  Seed complete!");
  console.log(`\n   Organization A ID : ${orgA.id}`);
  console.log(`   Organization B ID : ${orgB.id}`);
  console.log("\n   Copy these into .env.local if needed.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
