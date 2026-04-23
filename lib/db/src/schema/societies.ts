import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const societiesTable = pgTable("societies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  routeCode: varchar("route_code", { length: 50 }).notNull(),
  bankName: text("bank_name"),
  bankAccount: varchar("bank_account", { length: 50 }),
  bankIfsc: varchar("bank_ifsc", { length: 20 }),
  contactPerson: text("contact_person"),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSocietySchema = createInsertSchema(societiesTable).omit({ id: true, createdAt: true });
export type InsertSociety = z.infer<typeof insertSocietySchema>;
export type Society = typeof societiesTable.$inferSelect;
