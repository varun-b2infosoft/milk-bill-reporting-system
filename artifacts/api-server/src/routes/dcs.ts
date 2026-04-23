import { Router } from "express";
import { query, T } from "../lib/oracle";

const router = Router();

router.get("/dcs", async (req, res) => {
  try {
    const rows = await query<{
      ID: number; SOCIETY_ID: number; SOCIETY_NAME: string;
      TEST_DATE: unknown; FAT_READING: number; SNF_READING: number;
      STATUS: string; REMARKS: string;
    }>(
      `SELECT ID, SOCIETY_ID, SOCIETY_NAME, TEST_DATE, FAT_READING, SNF_READING, STATUS, REMARKS
         FROM ${T.dcsRecords}
        ORDER BY TEST_DATE DESC`
    );
    res.json(
      rows.map((r) => ({
        id: Number(r.ID),
        societyId: Number(r.SOCIETY_ID),
        societyName: r.SOCIETY_NAME,
        testDate: formatDateStr(r.TEST_DATE),
        fatReading: Number(r.FAT_READING ?? 0),
        snfReading: Number(r.SNF_READING ?? 0),
        status: r.STATUS,
        remarks: r.REMARKS ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list DCS records");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

export default router;
