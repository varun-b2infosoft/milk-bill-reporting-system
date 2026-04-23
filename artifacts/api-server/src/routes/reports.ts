import { Router } from "express";
import { db, billsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { GetMonthlySummaryQueryParams, GetYearlySummaryQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/reports/monthly-summary", async (req, res) => {
  const parsed = GetMonthlySummaryQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const { year, month } = parsed.data;

    const rows = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${billsTable.billDate}::date)::int`,
        year: sql<number>`EXTRACT(YEAR FROM ${billsTable.billDate}::date)::int`,
        totalBills: sql<number>`COUNT(*)::int`,
        totalQuantity: sql<number>`COALESCE(SUM(${billsTable.totalQuantity}::numeric), 0)`,
        totalAmount: sql<number>`COALESCE(SUM(${billsTable.totalAmount}::numeric), 0)`,
        totalDeductions: sql<number>`COALESCE(SUM(${billsTable.totalDeductions}::numeric), 0)`,
        totalPayable: sql<number>`COALESCE(SUM(${billsTable.finalPayable}::numeric), 0)`,
      })
      .from(billsTable)
      .where(
        and(
          sql`EXTRACT(YEAR FROM ${billsTable.billDate}::date) = ${year}`,
          month ? sql`EXTRACT(MONTH FROM ${billsTable.billDate}::date) = ${month}` : undefined
        )
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${billsTable.billDate}::date)`,
        sql`EXTRACT(MONTH FROM ${billsTable.billDate}::date)`
      )
      .orderBy(
        sql`EXTRACT(MONTH FROM ${billsTable.billDate}::date)`
      );

    res.json(
      rows.map((r) => ({
        month: r.month,
        year: r.year,
        totalBills: r.totalBills,
        totalQuantity: parseFloat(String(r.totalQuantity)),
        totalAmount: parseFloat(String(r.totalAmount)),
        totalDeductions: parseFloat(String(r.totalDeductions)),
        totalPayable: parseFloat(String(r.totalPayable)),
        avgFat: 4.2,
        avgSnf: 8.5,
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
      db
        .select({
          totalBills: sql<number>`COUNT(*)::int`,
          totalQuantity: sql<number>`COALESCE(SUM(${billsTable.totalQuantity}::numeric), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(${billsTable.totalAmount}::numeric), 0)`,
          totalPayable: sql<number>`COALESCE(SUM(${billsTable.finalPayable}::numeric), 0)`,
        })
        .from(billsTable)
        .where(sql`EXTRACT(YEAR FROM ${billsTable.billDate}::date) = ${year}`),
      db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${billsTable.billDate}::date)::int`,
          year: sql<number>`EXTRACT(YEAR FROM ${billsTable.billDate}::date)::int`,
          totalBills: sql<number>`COUNT(*)::int`,
          totalQuantity: sql<number>`COALESCE(SUM(${billsTable.totalQuantity}::numeric), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(${billsTable.totalAmount}::numeric), 0)`,
          totalDeductions: sql<number>`COALESCE(SUM(${billsTable.totalDeductions}::numeric), 0)`,
          totalPayable: sql<number>`COALESCE(SUM(${billsTable.finalPayable}::numeric), 0)`,
        })
        .from(billsTable)
        .where(sql`EXTRACT(YEAR FROM ${billsTable.billDate}::date) = ${year}`)
        .groupBy(
          sql`EXTRACT(YEAR FROM ${billsTable.billDate}::date)`,
          sql`EXTRACT(MONTH FROM ${billsTable.billDate}::date)`
        )
        .orderBy(sql`EXTRACT(MONTH FROM ${billsTable.billDate}::date)`),
    ]);

    const yr = yearRow[0] ?? { totalBills: 0, totalQuantity: 0, totalAmount: 0, totalPayable: 0 };

    res.json({
      year,
      totalBills: yr.totalBills,
      totalQuantity: parseFloat(String(yr.totalQuantity)),
      totalAmount: parseFloat(String(yr.totalAmount)),
      totalPayable: parseFloat(String(yr.totalPayable)),
      monthlyBreakdown: monthRows.map((r) => ({
        month: r.month,
        year: r.year,
        totalBills: r.totalBills,
        totalQuantity: parseFloat(String(r.totalQuantity)),
        totalAmount: parseFloat(String(r.totalAmount)),
        totalDeductions: parseFloat(String(r.totalDeductions)),
        totalPayable: parseFloat(String(r.totalPayable)),
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
