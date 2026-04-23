import { Router } from "express";
import oracledb from "oracledb";
import { query, execute, queryOne, T } from "../lib/oracle";
import { CreateTargetBody } from "@workspace/api-zod";

const router = Router();

router.get("/targets", async (req, res) => {
  try {
    const rows = await query<{
      ID: number; SOCIETY_ID: number; SOCIETY_NAME: string;
      PERIOD: string; TARGET_QUANTITY: number; ACHIEVED_QUANTITY: number;
      TARGET_AMOUNT: number; ACHIEVED_AMOUNT: number; PERCENT_ACHIEVED: number;
    }>(
      `SELECT ID, SOCIETY_ID, SOCIETY_NAME, PERIOD, TARGET_QUANTITY, ACHIEVED_QUANTITY,
              TARGET_AMOUNT, ACHIEVED_AMOUNT, PERCENT_ACHIEVED
         FROM ${T.targets}
        ORDER BY PERIOD`
    );
    res.json(
      rows.map((t) => ({
        id: Number(t.ID),
        societyId: Number(t.SOCIETY_ID),
        societyName: t.SOCIETY_NAME,
        period: t.PERIOD,
        targetQuantity: Number(t.TARGET_QUANTITY ?? 0),
        achievedQuantity: Number(t.ACHIEVED_QUANTITY ?? 0),
        targetAmount: Number(t.TARGET_AMOUNT ?? 0),
        achievedAmount: Number(t.ACHIEVED_AMOUNT ?? 0),
        percentAchieved: Number(t.PERCENT_ACHIEVED ?? 0),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list targets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/targets", async (req, res) => {
  const parsed = CreateTargetBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const society = await queryOne<{ ID: number; NAME: string }>(
      `SELECT ID, NAME FROM ${T.societies} WHERE ID = :id`,
      { id: parsed.data.societyId }
    );
    if (!society) return res.status(400).json({ error: "Society not found" });

    const d = parsed.data;
    const result = await execute(
      `INSERT INTO ${T.targets}
         (SOCIETY_ID, SOCIETY_NAME, PERIOD, TARGET_QUANTITY, TARGET_AMOUNT, ACHIEVED_QUANTITY, ACHIEVED_AMOUNT, PERCENT_ACHIEVED)
       VALUES
         (:societyId, :societyName, :period, :targetQuantity, :targetAmount, 0, 0, 0)
       RETURNING ID INTO :newId`,
      {
        societyId: d.societyId,
        societyName: society.NAME,
        period: d.period,
        targetQuantity: Number(d.targetQuantity),
        targetAmount: Number(d.targetAmount),
        newId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const outBinds = result.outBinds as Record<string, number[]>;
    const newId = outBinds?.newId?.[0] ?? outBinds?.NEWID?.[0];
    const target = await queryOne<Record<string, unknown>>(
      `SELECT ID, SOCIETY_ID, SOCIETY_NAME, PERIOD, TARGET_QUANTITY, ACHIEVED_QUANTITY,
              TARGET_AMOUNT, ACHIEVED_AMOUNT, PERCENT_ACHIEVED
         FROM ${T.targets} WHERE ID = :id`,
      { id: newId }
    );

    res.status(201).json({
      id: Number(target?.ID),
      societyId: Number(target?.SOCIETY_ID),
      societyName: target?.SOCIETY_NAME,
      period: target?.PERIOD,
      targetQuantity: Number(target?.TARGET_QUANTITY ?? 0),
      achievedQuantity: Number(target?.ACHIEVED_QUANTITY ?? 0),
      targetAmount: Number(target?.TARGET_AMOUNT ?? 0),
      achievedAmount: Number(target?.ACHIEVED_AMOUNT ?? 0),
      percentAchieved: Number(target?.PERCENT_ACHIEVED ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create target");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
