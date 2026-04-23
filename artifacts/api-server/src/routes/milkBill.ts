import { Router } from "express";
import { getMilkBill } from "../services/getMilkBill";
import { query } from "../lib/oracle";

const router = Router();

/**
 * GET /milk-bill
 * Query params:
 *   fromDate      YYYY-MM-DD (current period start)
 *   toDate        YYYY-MM-DD (current period end)
 *   dcsCode       string     e.g. "8014"
 *   prevFromDate  YYYY-MM-DD (previous period — optional, for outstanding / price-diff)
 *   prevToDate    YYYY-MM-DD
 */
router.get("/milk-bill", async (req, res) => {
  const { fromDate, toDate, dcsCode, prevFromDate, prevToDate } = req.query as Record<string, string>;

  if (!fromDate || !toDate || !dcsCode) {
    res.status(400).json({ error: "fromDate, toDate and dcsCode are required." });
    return;
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(fromDate) || !dateRe.test(toDate)) {
    res.status(400).json({ error: "Dates must be in YYYY-MM-DD format." });
    return;
  }
  if (prevFromDate && !dateRe.test(prevFromDate)) {
    res.status(400).json({ error: "prevFromDate must be in YYYY-MM-DD format." });
    return;
  }
  if (prevToDate && !dateRe.test(prevToDate)) {
    res.status(400).json({ error: "prevToDate must be in YYYY-MM-DD format." });
    return;
  }

  try {
    const result = await getMilkBill({
      fromDate,
      toDate,
      dcsCode: dcsCode.trim(),
      prevFromDate: prevFromDate || undefined,
      prevToDate: prevToDate || undefined,
    });
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      res.status(404).json({ error: e.message ?? "Bill not found." });
      return;
    }
    req.log.error({ err }, "GET /milk-bill error");
    res.status(503).json({ error: "Database unavailable or query failed." });
  }
});

/**
 * GET /dcs-list
 * Returns all DCS (society) codes and names for the search dropdown.
 */
router.get("/dcs-list", async (req, res) => {
  try {
    const rows = await query<{ DCSDISPLAYCODE: string; DCSNAME: string }>(
      `SELECT DCSDISPLAYCODE, DCSNAME
       FROM PI_DCS_M
       WHERE ISACTIVE = 1
       ORDER BY DCSDISPLAYCODE`
    );
    res.json(
      rows.map((r) => ({
        code: r.DCSDISPLAYCODE,
        name: r.DCSNAME,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "GET /dcs-list error");
    res.status(503).json({ error: "Database unavailable." });
  }
});

export default router;
