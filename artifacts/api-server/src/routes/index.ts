import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import billsRouter from "./bills";
import societiesRouter from "./societies";
import routesRouter from "./routes";
import bankAdviceRouter from "./bankAdvice";
import reportsRouter from "./reports";
import purchasesRouter from "./purchases";
import targetsRouter from "./targets";
import dcsRouter from "./dcs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(billsRouter);
router.use(societiesRouter);
router.use(routesRouter);
router.use(bankAdviceRouter);
router.use(reportsRouter);
router.use(purchasesRouter);
router.use(targetsRouter);
router.use(dcsRouter);

export default router;
