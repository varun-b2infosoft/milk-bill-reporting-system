import {
  pgTable,
  serial,
  integer,
  date,
  numeric,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { billsTable } from "./bills";

export const milkEntryShiftEnum = pgEnum("milk_entry_shift", ["morning", "evening"]);

export const milkEntriesTable = pgTable("milk_entries", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id")
    .notNull()
    .references(() => billsTable.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  shift: milkEntryShiftEnum("shift").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  fatPercent: numeric("fat_percent", { precision: 5, scale: 2 }).notNull(),
  snfPercent: numeric("snf_percent", { precision: 5, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 8, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMilkEntrySchema = createInsertSchema(milkEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMilkEntry = z.infer<typeof insertMilkEntrySchema>;
export type MilkEntry = typeof milkEntriesTable.$inferSelect;
