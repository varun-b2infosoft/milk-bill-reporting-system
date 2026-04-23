import { Router } from "express";
import { db, routesTable } from "@workspace/db";

const router = Router();

router.get("/routes", async (req, res) => {
  try {
    const routes = await db.select().from(routesTable).orderBy(routesTable.code);
    res.json(
      routes.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list routes");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
