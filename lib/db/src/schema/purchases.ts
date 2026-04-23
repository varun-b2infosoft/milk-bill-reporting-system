import {
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { societiesTable } from "./societies";

export const purchaseShiftEnum = pgEnum("purchase_shift", ["morning", "evening"]);

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  societyId: integer("society_id")
    .notNull()
    .references(() => societiesTable.id),
  societyName: text("society_name").notNull(),
  purchaseDate: date("purchase_date").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  fatPercent: numeric("fat_percent", { precision: 5, scale: 2 }).notNull(),
  snfPercent: numeric("snf_percent", { precision: 5, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 8, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  shift: purchaseShiftEnum("shift").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
