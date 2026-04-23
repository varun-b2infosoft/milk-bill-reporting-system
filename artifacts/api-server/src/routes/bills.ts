import { Router } from "express";
import oracledb from "oracledb";
import { query, queryOne, execute, T } from "../lib/oracle";
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

    const conditions: string[] = [];
    const binds: Record<string, unknown> = { limit, offset };

    if (params.societyId) {
      conditions.push("SOCIETY_ID = :societyId");
      binds.societyId = params.societyId;
    }
    if (params.routeCode) {
      conditions.push("ROUTE_CODE = :routeCode");
      binds.routeCode = params.routeCode;
    }
    if (params.fromDate) {
      conditions.push("BILL_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')");
      binds.fromDate = params.fromDate;
    }
    if (params.toDate) {
      conditions.push("BILL_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')");
      binds.toDate = params.toDate;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [bills, totalRows] = await Promise.all([
      query<{
        ID: number; BILL_NUMBER: string; BILL_DATE: unknown;
        SOCIETY_NAME: string; SOCIETY_CODE: string;
        TOTAL_QUANTITY: number; TOTAL_AMOUNT: number;
        FINAL_PAYABLE: number; STATUS: string;
      }>(
        `SELECT ID, BILL_NUMBER, BILL_DATE, SOCIETY_NAME, SOCIETY_CODE,
                TOTAL_QUANTITY, TOTAL_AMOUNT, FINAL_PAYABLE, STATUS
           FROM ${T.bills}
          ${where}
          ORDER BY BILL_DATE DESC
          OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        binds
      ),
      queryOne<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT FROM ${T.bills} ${where}`,
        { ...binds }
      ),
    ]);

    res.json({
      data: bills.map((b) => ({
        id: Number(b.ID),
        billNumber: b.BILL_NUMBER,
        billDate: formatDateStr(b.BILL_DATE),
        societyName: b.SOCIETY_NAME,
        societyCode: b.SOCIETY_CODE,
        totalQuantity: Number(b.TOTAL_QUANTITY ?? 0),
        totalAmount: Number(b.TOTAL_AMOUNT ?? 0),
        finalPayable: Number(b.FINAL_PAYABLE ?? 0),
        status: b.STATUS,
      })),
      total: Number(totalRows?.CNT ?? 0),
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
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const society = await queryOne<{
      ID: number; NAME: string; CODE: string;
      BANK_NAME: string; BANK_ACCOUNT: string; BANK_IFSC: string;
    }>(
      `SELECT ID, NAME, CODE, BANK_NAME, BANK_ACCOUNT, BANK_IFSC
         FROM ${T.societies} WHERE ID = :id`,
      { id: parsed.data.societyId }
    );
    if (!society) return res.status(400).json({ error: "Society not found" });

    const d = parsed.data;
    const result = await execute(
      `INSERT INTO ${T.bills} (
        BILL_NUMBER, BILL_DATE, FROM_DATE, TO_DATE,
        SOCIETY_ID, SOCIETY_NAME, SOCIETY_CODE,
        ROUTE_CODE, SHIFT,
        BANK_NAME, BANK_ACCOUNT, BANK_IFSC,
        RATE_FORMULA, LEAD_LOAD_AMOUNT, STATUS,
        TOTAL_QUANTITY, TOTAL_AMOUNT, TOTAL_DEDUCTIONS, FINAL_PAYABLE,
        CREATED_AT, UPDATED_AT
      ) VALUES (
        :billNumber, TO_DATE(:billDate,'YYYY-MM-DD'), TO_DATE(:fromDate,'YYYY-MM-DD'), TO_DATE(:toDate,'YYYY-MM-DD'),
        :societyId, :societyName, :societyCode,
        :routeCode, :shift,
        :bankName, :bankAccount, :bankIfsc,
        :rateFormula, :leadLoadAmount, :status,
        0, 0, 0, 0,
        SYSDATE, SYSDATE
      ) RETURNING ID INTO :newId`,
      {
        billNumber: d.billNumber,
        billDate: d.billDate,
        fromDate: d.fromDate,
        toDate: d.toDate,
        societyId: d.societyId,
        societyName: society.NAME,
        societyCode: society.CODE,
        routeCode: d.routeCode,
        shift: d.shift,
        bankName: d.bankName ?? society.BANK_NAME ?? null,
        bankAccount: d.bankAccount ?? society.BANK_ACCOUNT ?? null,
        bankIfsc: d.bankIfsc ?? society.BANK_IFSC ?? null,
        rateFormula: d.rateFormula ?? null,
        leadLoadAmount: d.leadLoadAmount ?? 0,
        status: d.status ?? "draft",
        newId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const outBinds = result.outBinds as { NEWID: number[] };
    const newId = outBinds?.NEWID?.[0] ?? (result.outBinds as Record<string, number[]>)?.newId?.[0];
    if (!newId) return res.status(500).json({ error: "Failed to get new bill ID" });

    const bill = await queryOne<Record<string, unknown>>(
      `SELECT * FROM ${T.bills} WHERE ID = :id`, { id: newId }
    );
    res.status(201).json(formatBill(bill!));
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
    const bill = await queryOne<Record<string, unknown>>(
      `SELECT * FROM ${T.bills} WHERE ID = :id`, { id: parsed.data.id }
    );
    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const [entries, deductions] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT * FROM ${T.milkEntries} WHERE BILL_ID = :billId ORDER BY ENTRY_DATE`,
        { billId: parsed.data.id }
      ),
      query<Record<string, unknown>>(
        `SELECT * FROM ${T.deductions} WHERE BILL_ID = :billId`,
        { billId: parsed.data.id }
      ),
    ]);

    res.json({
      ...formatBill(bill),
      entries: entries.map(formatEntry),
      deductions: deductions.map(formatDeduction),
      priceDifference: Number(bill.PRICE_DIFFERENCE ?? 0),
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
    const d = bodyParsed.data;
    const sets: string[] = ["UPDATED_AT = SYSDATE"];
    const binds: Record<string, unknown> = { id: paramParsed.data.id };

    if (d.billNumber !== undefined) { sets.push("BILL_NUMBER = :billNumber"); binds.billNumber = d.billNumber; }
    if (d.billDate !== undefined) { sets.push("BILL_DATE = TO_DATE(:billDate,'YYYY-MM-DD')"); binds.billDate = d.billDate; }
    if (d.fromDate !== undefined) { sets.push("FROM_DATE = TO_DATE(:fromDate,'YYYY-MM-DD')"); binds.fromDate = d.fromDate; }
    if (d.toDate !== undefined) { sets.push("TO_DATE = TO_DATE(:toDate,'YYYY-MM-DD')"); binds.toDate = d.toDate; }
    if (d.status !== undefined) { sets.push("STATUS = :status"); binds.status = d.status; }
    if (d.bankName !== undefined) { sets.push("BANK_NAME = :bankName"); binds.bankName = d.bankName; }
    if (d.bankAccount !== undefined) { sets.push("BANK_ACCOUNT = :bankAccount"); binds.bankAccount = d.bankAccount; }
    if (d.bankIfsc !== undefined) { sets.push("BANK_IFSC = :bankIfsc"); binds.bankIfsc = d.bankIfsc; }
    if (d.rateFormula !== undefined) { sets.push("RATE_FORMULA = :rateFormula"); binds.rateFormula = d.rateFormula; }

    await execute(
      `UPDATE ${T.bills} SET ${sets.join(", ")} WHERE ID = :id`,
      binds
    );

    const updated = await queryOne<Record<string, unknown>>(
      `SELECT * FROM ${T.bills} WHERE ID = :id`, { id: paramParsed.data.id }
    );
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
    await Promise.all([
      execute(`DELETE FROM ${T.milkEntries} WHERE BILL_ID = :id`, { id: parsed.data.id }),
      execute(`DELETE FROM ${T.deductions} WHERE BILL_ID = :id`, { id: parsed.data.id }),
    ]);
    await execute(`DELETE FROM ${T.bills} WHERE ID = :id`, { id: parsed.data.id });
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
    const entries = await query<Record<string, unknown>>(
      `SELECT * FROM ${T.milkEntries} WHERE BILL_ID = :billId ORDER BY ENTRY_DATE`,
      { billId: parsed.data.id }
    );
    res.json(entries.map(formatEntry));
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
    const deductions = await query<Record<string, unknown>>(
      `SELECT * FROM ${T.deductions} WHERE BILL_ID = :billId`,
      { billId: parsed.data.id }
    );
    res.json(deductions.map(formatDeduction));
  } catch (err) {
    req.log.error({ err }, "Failed to get bill deductions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

function formatBill(b: Record<string, unknown>) {
  return {
    id: Number(b.ID),
    billNumber: b.BILL_NUMBER,
    billDate: formatDateStr(b.BILL_DATE),
    fromDate: formatDateStr(b.FROM_DATE),
    toDate: formatDateStr(b.TO_DATE),
    societyId: Number(b.SOCIETY_ID),
    societyName: b.SOCIETY_NAME,
    societyCode: b.SOCIETY_CODE,
    routeCode: b.ROUTE_CODE,
    shift: b.SHIFT,
    bankName: b.BANK_NAME ?? null,
    bankAccount: b.BANK_ACCOUNT ?? null,
    bankIfsc: b.BANK_IFSC ?? null,
    rateFormula: b.RATE_FORMULA ?? null,
    totalQuantity: Number(b.TOTAL_QUANTITY ?? 0),
    totalAmount: Number(b.TOTAL_AMOUNT ?? 0),
    totalDeductions: Number(b.TOTAL_DEDUCTIONS ?? 0),
    leadLoadAmount: Number(b.LEAD_LOAD_AMOUNT ?? 0),
    finalPayable: Number(b.FINAL_PAYABLE ?? 0),
    status: b.STATUS,
    createdAt: b.CREATED_AT instanceof Date ? b.CREATED_AT.toISOString() : String(b.CREATED_AT ?? ""),
  };
}

function formatEntry(e: Record<string, unknown>) {
  return {
    id: Number(e.ID),
    billId: Number(e.BILL_ID),
    entryDate: formatDateStr(e.ENTRY_DATE),
    shift: e.SHIFT,
    quantity: Number(e.QUANTITY ?? 0),
    fatPercent: Number(e.FAT_PERCENT ?? 0),
    snfPercent: Number(e.SNF_PERCENT ?? 0),
    rate: Number(e.RATE ?? 0),
    amount: Number(e.AMOUNT ?? 0),
  };
}

function formatDeduction(d: Record<string, unknown>) {
  return {
    id: Number(d.ID),
    billId: Number(d.BILL_ID),
    category: d.CATEGORY,
    label: d.LABEL,
    amount: Number(d.AMOUNT ?? 0),
  };
}

export default router;
