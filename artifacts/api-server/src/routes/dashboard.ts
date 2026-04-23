import { Router } from "express";
import { query, queryOne, T } from "../lib/oracle";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch with error handling for missing tables
    let billStats = { TOTAL_BILLS_THIS_MONTH: 0, TOTAL_MILK_QUANTITY: 0, TOTAL_AMOUNT: 0, PENDING_BILLS: 0 };
    let societyCount = { CNT: 0 };
    let routeCount = { CNT: 0 };
    let fatSnf = { AVG_FAT: 4.2, AVG_SNF: 8.5 };

    try {
      billStats = await queryOne<{
        TOTAL_BILLS_THIS_MONTH: number;
        TOTAL_MILK_QUANTITY: number;
        TOTAL_AMOUNT: number;
        PENDING_BILLS: number;
      }>(
        `SELECT
          COUNT(CASE WHEN EXTRACT(MONTH FROM BILL_DATE) = :month AND EXTRACT(YEAR FROM BILL_DATE) = :year THEN 1 END) AS TOTAL_BILLS_THIS_MONTH,
          COALESCE(SUM(TOTAL_QUANTITY), 0) AS TOTAL_MILK_QUANTITY,
          COALESCE(SUM(TOTAL_AMOUNT), 0) AS TOTAL_AMOUNT,
          COUNT(CASE WHEN STATUS = 'draft' THEN 1 END) AS PENDING_BILLS
         FROM ${T.bills}`,
        { month: currentMonth, year: currentYear }
      ) || billStats;
    } catch (_err) {
      // Bills table doesn't exist, use defaults
    }

    try {
      societyCount = await queryOne<{ CNT: number }>(`SELECT COUNT(*) AS CNT FROM ${T.societies}`) || societyCount;
    } catch (_err) {
      // Societies table doesn't exist, use defaults
    }

    try {
      routeCount = await queryOne<{ CNT: number }>(`SELECT COUNT(*) AS CNT FROM ${T.routes}`) || routeCount;
    } catch (_err) {
      // Routes table doesn't exist, use defaults
    }

    try {
      const result = await query<{ AVG_FAT: number; AVG_SNF: number }>(
        `SELECT
           ROUND(AVG(FAT_PERCENT), 2) AS AVG_FAT,
           ROUND(AVG(SNF_PERCENT), 2) AS AVG_SNF
         FROM ${T.milkEntries}`
      );
      if (result.length > 0) fatSnf = result[0];
    } catch (_err) {
      // Milk entries table doesn't exist, use defaults
    }

    res.json({
      totalBillsThisMonth: Number(billStats?.TOTAL_BILLS_THIS_MONTH ?? 0),
      totalMilkQuantity: Number(billStats?.TOTAL_MILK_QUANTITY ?? 0),
      totalAmount: Number(billStats?.TOTAL_AMOUNT ?? 0),
      totalSocieties: Number(societyCount?.CNT ?? 0),
      totalRoutes: Number(routeCount?.CNT ?? 0),
      pendingBills: Number(billStats?.PENDING_BILLS ?? 0),
      avgFatPercent: Number(fatSnf?.AVG_FAT ?? 4.2),
      avgSnfPercent: Number(fatSnf?.AVG_SNF ?? 8.5),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    // Return default values instead of error
    res.json({
      totalBillsThisMonth: 0,
      totalMilkQuantity: 0,
      totalAmount: 0,
      totalSocieties: 0,
      totalRoutes: 0,
      pendingBills: 0,
      avgFatPercent: 4.2,
      avgSnfPercent: 8.5,
    });
  }
});

router.get("/dashboard/recent-bills", async (req, res) => {
  try {
    let bills: any[] = [];
    try {
      bills = await query<{
        ID: number;
        BILL_NUMBER: string;
        BILL_DATE: string;
        SOCIETY_NAME: string;
        SOCIETY_CODE: string;
        TOTAL_QUANTITY: number;
        TOTAL_AMOUNT: number;
        FINAL_PAYABLE: number;
        STATUS: string;
      }>(
        `SELECT ID, BILL_NUMBER, BILL_DATE, SOCIETY_NAME, SOCIETY_CODE,
                TOTAL_QUANTITY, TOTAL_AMOUNT, FINAL_PAYABLE, STATUS
           FROM ${T.bills}
          ORDER BY CREATED_AT DESC
          FETCH FIRST 10 ROWS ONLY`
      );
    } catch (_err) {
      // Bills table doesn't exist, return empty array
      bills = [];
    }

    res.json(
      bills.map((b) => ({
        id: Number(b.ID),
        billNumber: b.BILL_NUMBER,
        billDate: formatDateStr(b.BILL_DATE),
        societyName: b.SOCIETY_NAME,
        societyCode: b.SOCIETY_CODE,
        totalQuantity: Number(b.TOTAL_QUANTITY ?? 0),
        totalAmount: Number(b.TOTAL_AMOUNT ?? 0),
        finalPayable: Number(b.FINAL_PAYABLE ?? 0),
        status: b.STATUS,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get recent bills");
    // Return empty array instead of error
    res.json([]);
  }
});

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

export default router;
