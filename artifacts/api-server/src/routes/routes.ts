import { Router } from "express";

const router = Router();

router.get("/routes", async (req, res) => {
  res.json([]);
});

export default router;
