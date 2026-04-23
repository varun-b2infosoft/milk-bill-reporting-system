import { Router } from "express";
import { query, T } from "../lib/oracle";
import { ListBankAdviceQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/bank-advice", async (req, res) => {
  try {
    const parsed = ListBankAdviceQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    const conditions: string[] = [];
    const binds: Record<string, unknown> = {};

    if (params.fromDate) {
      conditions.push("BILL_DATE >= TO_DATE(:fromDate,'YYYY-MM-DD')");
      binds.fromDate = params.fromDate;
    }
    if (params.toDate) {
      conditions.push("BILL_DATE <= TO_DATE(:toDate,'YYYY-MM-DD')");
      binds.toDate = params.toDate;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const bills = await query<{
      ID: number; BILL_NUMBER: string; SOCIETY_NAME: string;
      BANK_NAME: string; BANK_ACCOUNT: string; BANK_IFSC: string;
      FINAL_PAYABLE: number; BILL_DATE: unknown; STATUS: string;
    }>(
      `SELECT ID, BILL_NUMBER, SOCIETY_NAME, BANK_NAME, BANK_ACCOUNT, BANK_IFSC,
              FINAL_PAYABLE, BILL_DATE, STATUS
         FROM ${T.bills}
        ${where}
        ORDER BY BILL_DATE DESC`,
      binds
    );

    res.json(
      bills.map((b) => ({
        id: Number(b.ID),
        billId: Number(b.ID),
        billNumber: b.BILL_NUMBER,
        societyName: b.SOCIETY_NAME,
        bankName: b.BANK_NAME ?? null,
        bankAccount: b.BANK_ACCOUNT ?? null,
        bankIfsc: b.BANK_IFSC ?? null,
        amount: Number(b.FINAL_PAYABLE ?? 0),
        adviceDate: formatDateStr(b.BILL_DATE),
        status: b.STATUS === "paid" ? "processed" : "pending",
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list bank advice");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

export default router;
