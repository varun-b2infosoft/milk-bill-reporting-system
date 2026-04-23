import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { societiesTable } from "./societies";

export const targetsTable = pgTable("targets", {
  id: serial("id").primaryKey(),
  societyId: integer("society_id")
    .notNull()
    .references(() => societiesTable.id),
  societyName: text("society_name").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  targetQuantity: numeric("target_quantity", { precision: 12, scale: 3 }).notNull(),
  achievedQuantity: numeric("achieved_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
  achievedAmount: numeric("achieved_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  percentAchieved: numeric("percent_achieved", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTargetSchema = createInsertSchema(targetsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targetsTable.$inferSelect;
