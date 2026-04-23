import { Router } from "express";
import { db, societiesTable } from "@workspace/db";
import { CreateSocietyBody } from "@workspace/api-zod";

const router = Router();

router.get("/societies", async (req, res) => {
  try {
    const societies = await db.select().from(societiesTable).orderBy(societiesTable.name);
    res.json(
      societies.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        routeCode: s.routeCode,
        bankName: s.bankName,
        bankAccount: s.bankAccount,
        bankIfsc: s.bankIfsc,
        contactPerson: s.contactPerson,
        phone: s.phone,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list societies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/societies", async (req, res) => {
  const parsed = CreateSocietyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  try {
    const [society] = await db.insert(societiesTable).values(parsed.data).returning();
    res.status(201).json({
      id: society.id,
      name: society.name,
      code: society.code,
      routeCode: society.routeCode,
      bankName: society.bankName,
      bankAccount: society.bankAccount,
      bankIfsc: society.bankIfsc,
      contactPerson: society.contactPerson,
      phone: society.phone,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create society");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
