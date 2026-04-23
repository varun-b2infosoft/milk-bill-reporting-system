import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { billsTable } from "./bills";

export const deductionCategoryEnum = pgEnum("deduction_category", [
  "financial",
  "dcs_training",
  "share_account",
  "test_chem",
  "cattle_feed",
  "other",
]);

export const deductionsTable = pgTable("deductions", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id")
    .notNull()
    .references(() => billsTable.id, { onDelete: "cascade" }),
  category: deductionCategoryEnum("category").notNull(),
  label: text("label").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeductionSchema = createInsertSchema(deductionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDeduction = z.infer<typeof insertDeductionSchema>;
export type Deduction = typeof deductionsTable.$inferSelect;
