import { Router } from "express";
import oracledb from "oracledb";
import { query, execute, queryOne, T } from "../lib/oracle";
import { CreatePurchaseBody } from "@workspace/api-zod";

const router = Router();

router.get("/purchases", async (req, res) => {
  try {
    const rows = await query<{
      ID: number; SOCIETY_ID: number; SOCIETY_NAME: string;
      PURCHASE_DATE: unknown; QUANTITY: number; FAT_PERCENT: number;
      SNF_PERCENT: number; RATE: number; AMOUNT: number; SHIFT: string;
    }>(
      `SELECT ID, SOCIETY_ID, SOCIETY_NAME, PURCHASE_DATE, QUANTITY,
              FAT_PERCENT, SNF_PERCENT, RATE, AMOUNT, SHIFT
         FROM ${T.purchases}
        ORDER BY PURCHASE_DATE DESC`
    );
    res.json(
      rows.map((p) => ({
        id: Number(p.ID),
        societyId: Number(p.SOCIETY_ID),
        societyName: p.SOCIETY_NAME,
        purchaseDate: formatDateStr(p.PURCHASE_DATE),
        quantity: Number(p.QUANTITY ?? 0),
        fatPercent: Number(p.FAT_PERCENT ?? 0),
        snfPercent: Number(p.SNF_PERCENT ?? 0),
        rate: Number(p.RATE ?? 0),
        amount: Number(p.AMOUNT ?? 0),
        shift: p.SHIFT,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list purchases");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/purchases", async (req, res) => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  try {
    const society = await queryOne<{ ID: number; NAME: string }>(
      `SELECT ID, NAME FROM ${T.societies} WHERE ID = :id`,
      { id: parsed.data.societyId }
    );
    if (!society) return res.status(400).json({ error: "Society not found" });

    const qty = Number(parsed.data.quantity);
    const rate = Number(parsed.data.rate);
    const amount = qty * rate;
    const d = parsed.data;

    const result = await execute(
      `INSERT INTO ${T.purchases}
         (SOCIETY_ID, SOCIETY_NAME, PURCHASE_DATE, QUANTITY, FAT_PERCENT, SNF_PERCENT, RATE, AMOUNT, SHIFT)
       VALUES
         (:societyId, :societyName, TO_DATE(:purchaseDate,'YYYY-MM-DD'), :quantity, :fatPercent, :snfPercent, :rate, :amount, :shift)
       RETURNING ID INTO :newId`,
      {
        societyId: d.societyId,
        societyName: society.NAME,
        purchaseDate: d.purchaseDate,
        quantity: qty,
        fatPercent: Number(d.fatPercent),
        snfPercent: Number(d.snfPercent),
        rate,
        amount,
        shift: d.shift,
        newId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      }
    );

    const outBinds = result.outBinds as Record<string, number[]>;
    const newId = outBinds?.newId?.[0] ?? outBinds?.NEWID?.[0];
    const purchase = await queryOne<Record<string, unknown>>(
      `SELECT ID, SOCIETY_ID, SOCIETY_NAME, PURCHASE_DATE, QUANTITY, FAT_PERCENT, SNF_PERCENT, RATE, AMOUNT, SHIFT
         FROM ${T.purchases} WHERE ID = :id`,
      { id: newId }
    );

    res.status(201).json({
      id: Number(purchase?.ID),
      societyId: Number(purchase?.SOCIETY_ID),
      societyName: purchase?.SOCIETY_NAME,
      purchaseDate: formatDateStr(purchase?.PURCHASE_DATE),
      quantity: Number(purchase?.QUANTITY ?? 0),
      fatPercent: Number(purchase?.FAT_PERCENT ?? 0),
      snfPercent: Number(purchase?.SNF_PERCENT ?? 0),
      rate: Number(purchase?.RATE ?? 0),
      amount: Number(purchase?.AMOUNT ?? 0),
      shift: purchase?.SHIFT,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create purchase");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatDateStr(d: unknown): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

export default router;
