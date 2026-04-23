import { type Response, Router } from "express";
import { query, queryOne } from "../lib/oracle";
import { getMilkBill } from "../services/getMilkBill";
import {
  GetBillParams,
  GetBillEntriesParams,
  GetBillDeductionsParams,
  ListBillsQueryParams,
} from "@workspace/api-zod";

const router = Router();

type BillContextRow = {
  BILLID: number;
  BILLDATE: unknown;
  BILLNO: string | null;
  BILLFROMDATE: unknown;
  BILLTILLDATE: unknown;
  DCSCODE: string;
  DCSNAME: string;
  DCSDISPLAYCODE: string;
  BANKNAME: string | null;
  ACCOUNTNO: string | null;
};

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

function notSupported(res: Response, message: string) {
  return res.status(501).json({ error: message });
}

async function getBillContextById(billId: number): Promise<BillContextRow | null> {
  return queryOne<BillContextRow>(
    `SELECT
       B.BILLID,
       B.BILLDATE,
       B.BILLNO,
       B.BILLFROMDATE,
       B.BILLTILLDATE,
       D.DCSCODE,
       D.DCSNAME,
       D.DCSDISPLAYCODE,
       F.BANKNAME,
       T.ACCOUNTNO
     FROM FA_DCSBILL_T B
     INNER JOIN PI_DCS_M D ON D.DCSCODE = B.DCSCODE
     LEFT JOIN PI_DCSBANK_T T
       ON T.DCSCODE = D.DCSCODE
      AND T.BANKUSAGEID = 'Z011'
     LEFT JOIN FA_BANK_M F ON F.BANKID = T.BANKID
     WHERE B.BILLID = :billId`,
    { billId }
  );
}

// GET /bills
router.get("/bills", async (req, res) => {
  try {
    const parsed = ListBillsQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : ({} as Partial<Record<"page" | "limit" | "societyId" | "routeCode" | "fromDate" | "toDate", unknown>>);

    const page = typeof params.page === "number" ? params.page : 1;
    const limit = typeof params.limit === "number" ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const binds: Record<string, unknown> = { limit, offset };
    const filterBinds: Record<string, unknown> = {};

    if (params.societyId != null) {
      conditions.push("B.DCSCODE = :societyId");
      binds.societyId = params.societyId;
      filterBinds.societyId = params.societyId;
    }
    if (params.routeCode) {
      conditions.push("1 = 0");
      binds.routeCode = params.routeCode;
      filterBinds.routeCode = params.routeCode;
    }
    if (params.fromDate) {
      conditions.push("B.BILLDATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')");
      binds.fromDate = params.fromDate;
      filterBinds.fromDate = params.fromDate;
    }
    if (params.toDate) {
      conditions.push("B.BILLDATE <= TO_DATE(:toDate, 'YYYY-MM-DD')");
      binds.toDate = params.toDate;
      filterBinds.toDate = params.toDate;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [bills, totalRows] = await Promise.all([
      query<{
        ID: number;
        BILL_NUMBER: string | null;
        BILL_DATE: unknown;
        SOCIETY_NAME: string;
        SOCIETY_CODE: string;
        TOTAL_QUANTITY: number | null;
        TOTAL_AMOUNT: number | null;
        FINAL_PAYABLE: number | null;
        STATUS: string;
      }>(
        `SELECT
           B.BILLID AS ID,
           B.BILLNO AS BILL_NUMBER,
           B.BILLDATE AS BILL_DATE,
           D.DCSNAME AS SOCIETY_NAME,
           D.DCSDISPLAYCODE AS SOCIETY_CODE,
           NVL(SUM(BD.QUANTITY), 0) AS TOTAL_QUANTITY,
           NVL(SUM(BD.CALCULATEDAMOUNT), 0) AS TOTAL_AMOUNT,
           NVL(B.BILLAMOUNT, 0) AS FINAL_PAYABLE,
           'fetched' AS STATUS
         FROM FA_DCSBILL_T B
         INNER JOIN PI_DCS_M D ON D.DCSCODE = B.DCSCODE
         LEFT JOIN FA_DCSBILLDETAILS_T BD ON BD.BILLID = B.BILLID
         ${where}
         GROUP BY B.BILLID, B.BILLNO, B.BILLDATE, D.DCSNAME, D.DCSDISPLAYCODE, B.BILLAMOUNT
         ORDER BY B.BILLDATE DESC, B.BILLID DESC
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        binds
      ),
      queryOne<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT
           FROM FA_DCSBILL_T B
           ${where}`,
        filterBinds
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
    res.status(503).json({ error: "Database unavailable or query failed." });
  }
});

// POST /bills
router.post("/bills", async (_req, res): Promise<void> => {
  notSupported(res, "Bill creation is not supported for the production Oracle schema.");
});

// GET /bills/:id
router.get("/bills/:id", async (req, res): Promise<void> => {
  const parsed = GetBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const context = await getBillContextById(parsed.data.id);
    if (!context) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const bill = await getMilkBill({
      fromDate: formatDateStr(context.BILLFROMDATE),
      toDate: formatDateStr(context.BILLTILLDATE),
      dcsCode: context.DCSDISPLAYCODE,
    });

    const deductions = [
      ...bill.deductions.standard.map((item, index) => ({
        id: index + 1,
        category: "standard",
        label: item.name,
        amount: item.amount,
      })),
      ...bill.deductions.other.map((item, index) => ({
        id: 1000 + index + 1,
        category: "other",
        label: item.name,
        amount: item.amount,
      })),
      ...bill.deductions.outstanding.map((item, index) => ({
        id: 2000 + index + 1,
        category: "outstanding",
        label: item.name,
        amount: item.amount,
      })),
    ];

    res.json({
      id: bill.header.billId,
      billNumber: bill.header.billNo,
      billDate: bill.header.billDate,
      fromDate: formatDateStr(context.BILLFROMDATE),
      toDate: formatDateStr(context.BILLTILLDATE),
      societyId: Number(context.DCSCODE),
      societyName: bill.header.dcsName,
      societyCode: bill.header.dcsDisplayCode,
      routeCode: null,
      shift: "both",
      bankName: bill.header.bankName || context.BANKNAME,
      bankAccount: bill.header.accountNo || context.ACCOUNTNO,
      bankIfsc: null,
      rateFormula: bill.header.rateDisplayOnBill ? String(bill.header.rateDisplayOnBill) : null,
      totalQuantity: bill.totals.quantity,
      totalAmount: bill.payments.milkCost,
      totalDeductions: bill.deductions.totalDeductions,
      leadLoadAmount: bill.payments.headload,
      finalPayable: bill.netPayable,
      status: "fetched",
      createdAt: "",
      entries: bill.entries.map((entry, index) => ({
        id: index + 1,
        billId: bill.header.billId,
        entryDate: entry.milkDate,
        shift: entry.shift,
        quantity: entry.quantity,
        fatPercent: entry.fat,
        snfPercent: entry.snf,
        rate: entry.rate,
        amount: entry.amount,
      })),
      deductions,
      priceDifference: bill.priceDiff,
    });
    return;
  } catch (err) {
    req.log.error({ err }, "Failed to get bill");
    res.status(503).json({ error: "Database unavailable or query failed." });
    return;
  }
});

// PUT /bills/:id
router.put("/bills/:id", async (req, res): Promise<void> => {
  const paramParsed = GetBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  notSupported(res, "Bill updates are not supported for the production Oracle schema.");
});

// DELETE /bills/:id
router.delete("/bills/:id", async (req, res): Promise<void> => {
  const parsed = GetBillParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  notSupported(res, "Bill deletion is not supported for the production Oracle schema.");
});

// GET /bills/:id/entries
router.get("/bills/:id/entries", async (req, res): Promise<void> => {
  const parsed = GetBillEntriesParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const entries = await query<{
      MILKDATE: unknown;
      SHIFT: number;
      QUANTITY: number | null;
      FATPERCENTAGE: number | null;
      SNFPERCENTAGE: number | null;
      CALCULATEDRATE: number | null;
      CALCULATEDAMOUNT: number | null;
    }>(
      `SELECT
         MILKDATE,
         SHIFT,
         QUANTITY,
         FATPERCENTAGE,
         SNFPERCENTAGE,
         CALCULATEDRATE,
         CALCULATEDAMOUNT
       FROM FA_DCSBILLDETAILS_T
       WHERE BILLID = :billId
       ORDER BY MILKDATE, SHIFT`,
      { billId: parsed.data.id }
    );
    res.json(
      entries.map((entry, index) => ({
        id: index + 1,
        billId: parsed.data.id,
        entryDate: formatDateStr(entry.MILKDATE),
        shift: Number(entry.SHIFT ?? 0) === 1 ? "E" : "M",
        quantity: Number(entry.QUANTITY ?? 0),
        fatPercent: Number(entry.FATPERCENTAGE ?? 0),
        snfPercent: Number(entry.SNFPERCENTAGE ?? 0),
        rate: Number(entry.CALCULATEDRATE ?? 0),
        amount: Number(entry.CALCULATEDAMOUNT ?? 0),
      }))
    );
    return;
  } catch (err) {
    req.log.error({ err }, "Failed to get bill entries");
    res.status(503).json({ error: "Database unavailable or query failed." });
    return;
  }
});

// GET /bills/:id/deductions
router.get("/bills/:id/deductions", async (req, res): Promise<void> => {
  const parsed = GetBillDeductionsParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const context = await getBillContextById(parsed.data.id);
    if (!context) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const bill = await getMilkBill({
      fromDate: formatDateStr(context.BILLFROMDATE),
      toDate: formatDateStr(context.BILLTILLDATE),
      dcsCode: context.DCSDISPLAYCODE,
    });

    res.json([
      ...bill.deductions.standard.map((item, index) => ({
        id: index + 1,
        billId: parsed.data.id,
        category: "standard",
        label: item.name,
        amount: item.amount,
      })),
      ...bill.deductions.other.map((item, index) => ({
        id: 1000 + index + 1,
        billId: parsed.data.id,
        category: "other",
        label: item.name,
        amount: item.amount,
      })),
      ...bill.deductions.outstanding.map((item, index) => ({
        id: 2000 + index + 1,
        billId: parsed.data.id,
        category: "outstanding",
        label: item.name,
        amount: item.amount,
      })),
    ]);
    return;
  } catch (err) {
    req.log.error({ err }, "Failed to get bill deductions");
    res.status(503).json({ error: "Database unavailable or query failed." });
    return;
  }
});

export default router;
