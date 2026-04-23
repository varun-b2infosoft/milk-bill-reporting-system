import { Router } from "express";
import { CreateTargetBody } from "@workspace/api-zod";

const router = Router();

router.get("/targets", async (_req, res): Promise<void> => {
  res.json([]);
});

router.post("/targets", async (req, res): Promise<void> => {
  const parsed = CreateTargetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  res.status(501).json({ error: "Target creation is not supported for the production Oracle schema." });
});

export default router;
