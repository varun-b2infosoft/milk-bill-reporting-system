import { Router } from "express";
import { query, T } from "../lib/oracle";

const router = Router();

router.get("/routes", async (req, res) => {
  try {
    const rows = await query<{
      ID: number; CODE: string; NAME: string; DESCRIPTION: string;
    }>(
      `SELECT ID, CODE, NAME, DESCRIPTION FROM ${T.routes} ORDER BY CODE`
    );
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
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
