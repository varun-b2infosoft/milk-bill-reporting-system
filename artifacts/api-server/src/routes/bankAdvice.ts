import { Router } from "express";
import { db, billsTable } from "@workspace/db";
import { desc, gte, lte, and } from "drizzle-orm";
import { ListBankAdviceQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/bank-advice", async (req, res) => {
  try {
    const parsed = ListBankAdviceQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    const conditions = [];
    if (params.fromDate) conditions.push(gte(billsTable.billDate, params.fromDate));
    if (params.toDate) conditions.push(lte(billsTable.billDate, params.toDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const bills = await db
      .select()
      .from(billsTable)
      .where(whereClause)
      .orderBy(desc(billsTable.billDate));

    res.json(
      bills.map((b, idx) => ({
        id: b.id,
        billId: b.id,
        billNumber: b.billNumber,
        societyName: b.societyName,
        bankName: b.bankName,
        bankAccount: b.bankAccount,
        bankIfsc: b.bankIfsc,
        amount: parseFloat(b.finalPayable ?? "0"),
        adviceDate: b.billDate,
        status: b.status === "paid" ? "processed" : b.status === "issued" ? "pending" : "pending",
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list bank advice");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
