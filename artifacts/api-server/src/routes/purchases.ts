import { Router } from "express";
import { db, purchasesTable, societiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreatePurchaseBody } from "@workspace/api-zod";

const router = Router();

router.get("/purchases", async (req, res) => {
  try {
    const purchases = await db
      .select()
      .from(purchasesTable)
      .orderBy(desc(purchasesTable.purchaseDate));
    res.json(
      purchases.map((p) => ({
        id: p.id,
        societyId: p.societyId,
        societyName: p.societyName,
        purchaseDate: p.purchaseDate,
        quantity: parseFloat(p.quantity),
        fatPercent: parseFloat(p.fatPercent),
        snfPercent: parseFloat(p.snfPercent),
        rate: parseFloat(p.rate),
        amount: parseFloat(p.amount),
        shift: p.shift,
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
    const society = await db
      .select()
      .from(societiesTable)
      .where(eq(societiesTable.id, parsed.data.societyId))
      .limit(1);
    if (!society.length) return res.status(400).json({ error: "Society not found" });

    const qty = parseFloat(String(parsed.data.quantity));
    const rate = parseFloat(String(parsed.data.rate));
    const amount = qty * rate;

    const [purchase] = await db
      .insert(purchasesTable)
      .values({
        ...parsed.data,
        societyName: society[0].name,
        amount: String(amount),
      })
      .returning();

    res.status(201).json({
      id: purchase.id,
      societyId: purchase.societyId,
      societyName: purchase.societyName,
      purchaseDate: purchase.purchaseDate,
      quantity: parseFloat(purchase.quantity),
      fatPercent: parseFloat(purchase.fatPercent),
      snfPercent: parseFloat(purchase.snfPercent),
      rate: parseFloat(purchase.rate),
      amount: parseFloat(purchase.amount),
      shift: purchase.shift,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create purchase");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
