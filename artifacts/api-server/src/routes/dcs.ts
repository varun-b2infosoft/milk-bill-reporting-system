import { Router } from "express";
import { db, dcsRecordsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/dcs", async (req, res) => {
  try {
    const records = await db
      .select()
      .from(dcsRecordsTable)
      .orderBy(desc(dcsRecordsTable.testDate));
    res.json(
      records.map((r) => ({
        id: r.id,
        societyId: r.societyId,
        societyName: r.societyName,
        testDate: r.testDate,
        fatReading: parseFloat(r.fatReading),
        snfReading: parseFloat(r.snfReading),
        status: r.status,
        remarks: r.remarks,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list DCS records");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
