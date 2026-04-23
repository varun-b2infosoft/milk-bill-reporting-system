import { Router } from "express";
import { query, queryOne, T } from "../lib/oracle";
import { GetMonthlySummaryQueryParams, GetYearlySummaryQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/reports/monthly-summary", async (req, res) => {
  const parsed = GetMonthlySummaryQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const { year, month } = parsed.data;
    const binds: Record<string, unknown> = { year };
    let monthFilter = "";
    if (month) {
      monthFilter = "AND EXTRACT(MONTH FROM BILL_DATE) = :month";
      binds.month = month;
    }

    const rows = await query<{
      MONTH_NUM: number; YEAR_NUM: number; TOTAL_BILLS: number;
      TOTAL_QUANTITY: number; TOTAL_AMOUNT: number;
      TOTAL_DEDUCTIONS: number; TOTAL_PAYABLE: number;
      AVG_FAT: number; AVG_SNF: number;
    }>(
      `SELECT
         EXTRACT(MONTH FROM BILL_DATE) AS MONTH_NUM,
         EXTRACT(YEAR FROM BILL_DATE) AS YEAR_NUM,
         COUNT(*) AS TOTAL_BILLS,
         COALESCE(SUM(TOTAL_QUANTITY), 0) AS TOTAL_QUANTITY,
         COALESCE(SUM(TOTAL_AMOUNT), 0) AS TOTAL_AMOUNT,
         COALESCE(SUM(TOTAL_DEDUCTIONS), 0) AS TOTAL_DEDUCTIONS,
         COALESCE(SUM(FINAL_PAYABLE), 0) AS TOTAL_PAYABLE,
         4.2 AS AVG_FAT,
         8.5 AS AVG_SNF
       FROM ${T.bills}
       WHERE EXTRACT(YEAR FROM BILL_DATE) = :year
       ${monthFilter}
       GROUP BY EXTRACT(YEAR FROM BILL_DATE), EXTRACT(MONTH FROM BILL_DATE)
       ORDER BY EXTRACT(MONTH FROM BILL_DATE)`,
      binds
    );

    res.json(
      rows.map((r) => ({
        month: Number(r.MONTH_NUM),
        year: Number(r.YEAR_NUM),
        totalBills: Number(r.TOTAL_BILLS),
        totalQuantity: Number(r.TOTAL_QUANTITY),
        totalAmount: Number(r.TOTAL_AMOUNT),
        totalDeductions: Number(r.TOTAL_DEDUCTIONS),
        totalPayable: Number(r.TOTAL_PAYABLE),
        avgFat: Number(r.AVG_FAT),
        avgSnf: Number(r.AVG_SNF),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get monthly summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/yearly-summary", async (req, res) => {
  const parsed = GetYearlySummaryQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const { year } = parsed.data;

    const [yearRow, monthRows] = await Promise.all([
      queryOne<{
        TOTAL_BILLS: number; TOTAL_QUANTITY: number;
        TOTAL_AMOUNT: number; TOTAL_PAYABLE: number;
      }>(
        `SELECT
           COUNT(*) AS TOTAL_BILLS,
           COALESCE(SUM(TOTAL_QUANTITY), 0) AS TOTAL_QUANTITY,
           COALESCE(SUM(TOTAL_AMOUNT), 0) AS TOTAL_AMOUNT,
           COALESCE(SUM(FINAL_PAYABLE), 0) AS TOTAL_PAYABLE
         FROM ${T.bills}
         WHERE EXTRACT(YEAR FROM BILL_DATE) = :year`,
        { year }
      ),
      query<{
        MONTH_NUM: number; YEAR_NUM: number; TOTAL_BILLS: number;
        TOTAL_QUANTITY: number; TOTAL_AMOUNT: number;
        TOTAL_DEDUCTIONS: number; TOTAL_PAYABLE: number;
      }>(
        `SELECT
           EXTRACT(MONTH FROM BILL_DATE) AS MONTH_NUM,
           EXTRACT(YEAR FROM BILL_DATE) AS YEAR_NUM,
           COUNT(*) AS TOTAL_BILLS,
           COALESCE(SUM(TOTAL_QUANTITY), 0) AS TOTAL_QUANTITY,
           COALESCE(SUM(TOTAL_AMOUNT), 0) AS TOTAL_AMOUNT,
           COALESCE(SUM(TOTAL_DEDUCTIONS), 0) AS TOTAL_DEDUCTIONS,
           COALESCE(SUM(FINAL_PAYABLE), 0) AS TOTAL_PAYABLE
         FROM ${T.bills}
         WHERE EXTRACT(YEAR FROM BILL_DATE) = :year
         GROUP BY EXTRACT(YEAR FROM BILL_DATE), EXTRACT(MONTH FROM BILL_DATE)
         ORDER BY EXTRACT(MONTH FROM BILL_DATE)`,
        { year }
      ),
    ]);

    const yr = yearRow ?? { TOTAL_BILLS: 0, TOTAL_QUANTITY: 0, TOTAL_AMOUNT: 0, TOTAL_PAYABLE: 0 };

    res.json({
      year,
      totalBills: Number(yr.TOTAL_BILLS),
      totalQuantity: Number(yr.TOTAL_QUANTITY),
      totalAmount: Number(yr.TOTAL_AMOUNT),
      totalPayable: Number(yr.TOTAL_PAYABLE),
      monthlyBreakdown: monthRows.map((r) => ({
        month: Number(r.MONTH_NUM),
        year: Number(r.YEAR_NUM),
        totalBills: Number(r.TOTAL_BILLS),
        totalQuantity: Number(r.TOTAL_QUANTITY),
        totalAmount: Number(r.TOTAL_AMOUNT),
        totalDeductions: Number(r.TOTAL_DEDUCTIONS),
        totalPayable: Number(r.TOTAL_PAYABLE),
        avgFat: 4.2,
        avgSnf: 8.5,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get yearly summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
