import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Organizations ──────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── OTP Codes ───────────────────────────────────────────────────────────────
export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Transfers ───────────────────────────────────────────────────────────────
export const transfers = pgTable("transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromOrgId: uuid("from_org_id")
    .notNull()
    .references(() => organizations.id),
  toOrgId: uuid("to_org_id")
    .notNull()
    .references(() => organizations.id),
  message: text("message").notNull().default(""),
  rowCount: text("row_count").notNull().default("0"),
  transferredAt: timestamp("transferred_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Data Rows ────────────────────────────────────────────────────────────────
// source_transfer_id is NULL for natively-created rows.
// When set, the row was received via that transfer.
// This enables post-transfer data independence: new native rows are never
// mixed with the other org's data.
export const dataRows = pgTable("data_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  colA: text("col_a").notNull().default("unlisted"),
  colB: text("col_b").notNull().default("unlisted"),
  colC: text("col_c").notNull().default("unlisted"),
  sourceTransferId: uuid("source_transfer_id").references(() => transfers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  dataRows: many(dataRows),
  transfersFrom: many(transfers, { relationName: "transfersFrom" }),
  transfersTo: many(transfers, { relationName: "transfersTo" }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

export const dataRowsRelations = relations(dataRows, ({ one }) => ({
  organization: one(organizations, {
    fields: [dataRows.orgId],
    references: [organizations.id],
  }),
  transfer: one(transfers, {
    fields: [dataRows.sourceTransferId],
    references: [transfers.id],
  }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  fromOrg: one(organizations, {
    fields: [transfers.fromOrgId],
    references: [organizations.id],
    relationName: "transfersFrom",
  }),
  toOrg: one(organizations, {
    fields: [transfers.toOrgId],
    references: [organizations.id],
    relationName: "transfersTo",
  }),
}));

// ─── TypeScript Types ─────────────────────────────────────────────────────────
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type DataRow = typeof dataRows.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
