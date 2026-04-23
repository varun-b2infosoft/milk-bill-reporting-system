import { Router } from "express";
import { db, targetsTable, societiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTargetBody } from "@workspace/api-zod";

const router = Router();

router.get("/targets", async (req, res) => {
  try {
    const targets = await db.select().from(targetsTable).orderBy(targetsTable.period);
    res.json(
      targets.map((t) => ({
        id: t.id,
        societyId: t.societyId,
        societyName: t.societyName,
        period: t.period,
        targetQuantity: parseFloat(t.targetQuantity),
        achievedQuantity: parseFloat(t.achievedQuantity),
        targetAmount: parseFloat(t.targetAmount),
        achievedAmount: parseFloat(t.achievedAmount),
        percentAchieved: parseFloat(t.percentAchieved),
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
    const society = await db
      .select()
      .from(societiesTable)
      .where(eq(societiesTable.id, parsed.data.societyId))
      .limit(1);
    if (!society.length) return res.status(400).json({ error: "Society not found" });

    const [target] = await db
      .insert(targetsTable)
      .values({
        ...parsed.data,
        societyName: society[0].name,
      })
      .returning();

    res.status(201).json({
      id: target.id,
      societyId: target.societyId,
      societyName: target.societyName,
      period: target.period,
      targetQuantity: parseFloat(target.targetQuantity),
      achievedQuantity: parseFloat(target.achievedQuantity),
      targetAmount: parseFloat(target.targetAmount),
      achievedAmount: parseFloat(target.achievedAmount),
      percentAchieved: parseFloat(target.percentAchieved),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create target");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
