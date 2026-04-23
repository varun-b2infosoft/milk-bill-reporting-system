import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  date,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { societiesTable } from "./societies";

export const billShiftEnum = pgEnum("bill_shift", ["morning", "evening", "both"]);
export const billStatusEnum = pgEnum("bill_status", ["draft", "issued", "paid"]);

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: varchar("bill_number", { length: 50 }).notNull().unique(),
  billDate: date("bill_date").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  societyId: integer("society_id")
    .notNull()
    .references(() => societiesTable.id),
  societyName: text("society_name").notNull(),
  societyCode: varchar("society_code", { length: 50 }).notNull(),
  routeCode: varchar("route_code", { length: 50 }).notNull(),
  shift: billShiftEnum("shift").notNull().default("both"),
  bankName: text("bank_name"),
  bankAccount: varchar("bank_account", { length: 50 }),
  bankIfsc: varchar("bank_ifsc", { length: 20 }),
  rateFormula: text("rate_formula"),
  totalQuantity: numeric("total_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
  leadLoadAmount: numeric("lead_load_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  finalPayable: numeric("final_payable", { precision: 14, scale: 2 }).notNull().default("0"),
  priceDifference: numeric("price_difference", { precision: 14, scale: 2 }).default("0"),
  status: billStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
