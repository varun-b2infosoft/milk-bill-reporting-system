import { Router } from "express";
import { db, billsTable, societiesTable, routesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [billStats, societyCount, routeCount] = await Promise.all([
      db
        .select({
          totalBillsThisMonth: sql<number>`COUNT(CASE WHEN EXTRACT(MONTH FROM ${billsTable.billDate}::date) = ${currentMonth} AND EXTRACT(YEAR FROM ${billsTable.billDate}::date) = ${currentYear} THEN 1 END)::int`,
          totalMilkQuantity: sql<number>`COALESCE(SUM(${billsTable.totalQuantity}::numeric), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(${billsTable.totalAmount}::numeric), 0)`,
          pendingBills: sql<number>`COUNT(CASE WHEN ${billsTable.status} = 'draft' THEN 1 END)::int`,
        })
        .from(billsTable),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(societiesTable),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(routesTable),
    ]);

    const stats = billStats[0] ?? {
      totalBillsThisMonth: 0,
      totalMilkQuantity: 0,
      totalAmount: 0,
      pendingBills: 0,
    };

    res.json({
      totalBillsThisMonth: stats.totalBillsThisMonth,
      totalMilkQuantity: parseFloat(String(stats.totalMilkQuantity)),
      totalAmount: parseFloat(String(stats.totalAmount)),
      totalSocieties: societyCount[0]?.count ?? 0,
      totalRoutes: routeCount[0]?.count ?? 0,
      pendingBills: stats.pendingBills,
      avgFatPercent: 4.2,
      avgSnfPercent: 8.5,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-bills", async (req, res) => {
  try {
    const bills = await db
      .select()
      .from(billsTable)
      .orderBy(desc(billsTable.createdAt))
      .limit(10);

    res.json(
      bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        billDate: b.billDate,
        societyName: b.societyName,
        societyCode: b.societyCode,
        totalQuantity: parseFloat(b.totalQuantity ?? "0"),
        totalAmount: parseFloat(b.totalAmount ?? "0"),
        finalPayable: parseFloat(b.finalPayable ?? "0"),
        status: b.status,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent bills");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
