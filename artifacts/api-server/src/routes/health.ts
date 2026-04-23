import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { queryOne } from "../lib/oracle";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    // Lightweight Oracle ping
    await queryOne("SELECT 1 AS ALIVE FROM DUAL");
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: "error", error: "Oracle DB unavailable" });
  }
});

export default router;
