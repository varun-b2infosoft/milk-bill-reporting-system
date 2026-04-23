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

export const dcsStatusEnum = pgEnum("dcs_status", ["pass", "fail", "pending"]);

export const dcsRecordsTable = pgTable("dcs_records", {
  id: serial("id").primaryKey(),
  societyId: integer("society_id")
    .notNull()
    .references(() => societiesTable.id),
  societyName: text("society_name").notNull(),
  testDate: date("test_date").notNull(),
  fatReading: numeric("fat_reading", { precision: 5, scale: 2 }).notNull(),
  snfReading: numeric("snf_reading", { precision: 5, scale: 2 }).notNull(),
  status: dcsStatusEnum("status").notNull().default("pending"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDcsRecordSchema = createInsertSchema(dcsRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDcsRecord = z.infer<typeof insertDcsRecordSchema>;
export type DcsRecord = typeof dcsRecordsTable.$inferSelect;
