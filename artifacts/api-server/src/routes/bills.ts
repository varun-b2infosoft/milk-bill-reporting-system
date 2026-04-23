import { Router } from "express";
import { db, billsTable, milkEntriesTable, deductionsTable, societiesTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import {
  CreateBillBody,
  UpdateBillBody,
  GetBillParams,
  UpdateBillParams,
  DeleteBillParams,
  GetBillEntriesParams,
  GetBillDeductionsParams,
  ListBillsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /bills
router.get("/bills", async (req, res) => {
  try {
    const parsed = ListBillsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (params.societyId) conditions.push(eq(billsTable.societyId, params.societyId));
    if (params.routeCode) conditions.push(eq(billsTable.routeCode, params.routeCode));
    if (params.fromDate) conditions.push(gte(billsTable.billDate, params.fromDate));
    if (params.toDate) conditions.push(lte(billsTable.billDate, params.toDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [bills, countResult] = await Promise.all([
      db
        .select()
        .from(billsTable)
        .where(whereClause)
        .orderBy(desc(billsTable.billDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(billsTable)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      data: bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        billDate: b.billDate,
        societyName: b.societyName,
        societyCode: b.societyCode,
        totalQuantity: parseFloat(b.totalQuantity ?? "0"),
        totalAmount: parseFloat(b.totalAmount ?? "0"),
        finalPayable: parseFloat(b.finalPayable ?? "0"),
        status: b.status,
      })),
      total,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list bills");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bills
router.post("/bills", async (req, res) => {
  const parsed = CreateBillBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  try {
    const society = await db
      .select()
      .from(societiesTable)
      .where(eq(societiesTable.id, parsed.data.societyId))
      .limit(1);
    if (!society.length) {
      return res.status(400).json({ error: "Society not found" });
    }
    const s = society[0];
    const [bill] = await db
      .insert(billsTable)
      .values({
        ...parsed.data,
        societyName: s.name,
        societyCode: s.code,
        bankName: parsed.data.bankName ?? s.bankName ?? null,
        bankAccount: parsed.data.bankAccount ?? s.bankAccount ?? null,
        bankIfsc: parsed.data.bankIfsc ?? s.bankIfsc ?? null,
      })
      .returning();
    res.status(201).json(formatBill(bill));
  } catch (err) {
    req.log.error({ err }, "Failed to create bill");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bills/:id
router.get("/bills/:id", async (req, res) => {
  const parsed = GetBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const [bill] = await db.select().from(billsTable).where(eq(billsTable.id, parsed.data.id));
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const [entries, deductions] = await Promise.all([
      db.select().from(milkEntriesTable).where(eq(milkEntriesTable.billId, bill.id)).orderBy(milkEntriesTable.entryDate),
      db.select().from(deductionsTable).where(eq(deductionsTable.billId, bill.id)),
    ]);

    res.json({
      ...formatBill(bill),
      entries: entries.map((e) => ({
        id: e.id,
        billId: e.billId,
        entryDate: e.entryDate,
        shift: e.shift,
        quantity: parseFloat(e.quantity),
        fatPercent: parseFloat(e.fatPercent),
        snfPercent: parseFloat(e.snfPercent),
        rate: parseFloat(e.rate),
        amount: parseFloat(e.amount),
      })),
      deductions: deductions.map((d) => ({
        id: d.id,
        billId: d.billId,
        category: d.category,
        label: d.label,
        amount: parseFloat(d.amount),
      })),
      priceDifference: parseFloat(bill.priceDifference ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get bill");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /bills/:id
router.put("/bills/:id", async (req, res) => {
  const paramParsed = UpdateBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateBillBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.issues });

  try {
    const [updated] = await db
      .update(billsTable)
      .set({ ...bodyParsed.data, updatedAt: new Date() })
      .where(eq(billsTable.id, paramParsed.data.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Bill not found" });
    res.json(formatBill(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update bill");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /bills/:id
router.delete("/bills/:id", async (req, res) => {
  const parsed = DeleteBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const result = await db.delete(billsTable).where(eq(billsTable.id, parsed.data.id));
    if (!result) return res.status(404).json({ error: "Bill not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete bill");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bills/:id/entries
router.get("/bills/:id/entries", async (req, res) => {
  const parsed = GetBillEntriesParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const entries = await db
      .select()
      .from(milkEntriesTable)
      .where(eq(milkEntriesTable.billId, parsed.data.id))
      .orderBy(milkEntriesTable.entryDate);
    res.json(
      entries.map((e) => ({
        id: e.id,
        billId: e.billId,
        entryDate: e.entryDate,
        shift: e.shift,
        quantity: parseFloat(e.quantity),
        fatPercent: parseFloat(e.fatPercent),
        snfPercent: parseFloat(e.snfPercent),
        rate: parseFloat(e.rate),
        amount: parseFloat(e.amount),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get bill entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bills/:id/deductions
router.get("/bills/:id/deductions", async (req, res) => {
  const parsed = GetBillDeductionsParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  try {
    const deductions = await db
      .select()
      .from(deductionsTable)
      .where(eq(deductionsTable.billId, parsed.data.id));
    res.json(
      deductions.map((d) => ({
        id: d.id,
        billId: d.billId,
        category: d.category,
        label: d.label,
        amount: parseFloat(d.amount),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get bill deductions");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatBill(b: typeof billsTable.$inferSelect) {
  return {
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate,
    fromDate: b.fromDate,
    toDate: b.toDate,
    societyId: b.societyId,
    societyName: b.societyName,
    societyCode: b.societyCode,
    routeCode: b.routeCode,
    shift: b.shift,
    bankName: b.bankName,
    bankAccount: b.bankAccount,
    bankIfsc: b.bankIfsc,
    rateFormula: b.rateFormula,
    totalQuantity: parseFloat(b.totalQuantity ?? "0"),
    totalAmount: parseFloat(b.totalAmount ?? "0"),
    totalDeductions: parseFloat(b.totalDeductions ?? "0"),
    leadLoadAmount: parseFloat(b.leadLoadAmount ?? "0"),
    finalPayable: parseFloat(b.finalPayable ?? "0"),
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

export default router;
