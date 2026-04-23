import { Router } from "express";
import { query } from "../lib/oracle";
import { CreateSocietyBody } from "@workspace/api-zod";

const router = Router();

router.get("/societies", async (req, res) => {
  try {
    const rows = await query<{
      DCSCODE: string;
      DCSNAME: string;
      DCSDISPLAYCODE: string;
    }>(
      `SELECT DCSCODE, DCSNAME, DCSDISPLAYCODE
         FROM PI_DCS_M
        WHERE ISACTIVE = 1
        ORDER BY DCSNAME`
    );

    res.json(
      rows.map((s) => ({
        id: Number(s.DCSCODE),
        name: s.DCSNAME,
        code: s.DCSDISPLAYCODE,
        routeCode: null,
        bankName: null,
        bankAccount: null,
        bankIfsc: null,
        contactPerson: null,
        phone: null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list societies");
    // Return empty array instead of error
    res.json([]);
  }
});

router.post("/societies", async (req, res): Promise<void> => {
  const parsed = CreateSocietyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  res.status(501).json({ error: "Society creation is not supported for the production Oracle schema." });
});

export default router;
