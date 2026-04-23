import { Router } from "express";
import { query } from "../lib/oracle";
import { CreatePurchaseBody } from "@workspace/api-zod";

const router = Router();

router.get("/purchases", async (_req, res): Promise<void> => {
  res.json([]);
});

router.post("/purchases", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  res.status(501).json({ error: "Purchase creation is not supported for the production Oracle schema." });
});

export default router;
