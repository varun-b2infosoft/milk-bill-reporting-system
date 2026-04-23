import { Router } from "express";
import { query, T } from "../lib/oracle";

const router = Router();

router.get("/routes", async (req, res) => {
  try {
    let rows: any[] = [];
    try {
      rows = await query<{
        ID: number; CODE: string; NAME: string; DESCRIPTION: string;
      }>(
        `SELECT ID, CODE, NAME, DESCRIPTION FROM ${T.routes} ORDER BY CODE`
      );
    } catch (_err) {
      // Routes table doesn't exist, return empty array
      rows = [];
    }

    res.json(
      rows.map((r) => ({
        id: Number(r.ID),
        code: r.CODE,
        name: r.NAME,
        description: r.DESCRIPTION ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list routes");
    // Return empty array instead of error
    res.json([]);
  }
});

export default router;
