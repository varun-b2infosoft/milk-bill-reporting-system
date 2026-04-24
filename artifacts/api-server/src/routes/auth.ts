import { Router } from "express";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { queryOne, isConnected } from "../lib/oracle";
import { createOtp, verifyOtp } from "../lib/otp-store";
import { signToken, requireAuth } from "../middleware/requireAuth";

const router = Router();

/* ------------------------------------------------------------------ */
/* Dev bypass — active when Oracle is unreachable                       */
/* Set DEV_AUTH_PHONE and DEV_AUTH_PASSWORD env vars to enable.        */
/* ------------------------------------------------------------------ */
const DEV_PHONE    = process.env["DEV_AUTH_PHONE"]    ?? "";
const DEV_PASSWORD = process.env["DEV_AUTH_PASSWORD"] ?? "";

function isDevBypassActive(): boolean {
  return !isConnected() && DEV_PHONE.length === 10 && DEV_PASSWORD.length > 0;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

interface DbUser {
  ID: number;
  PHONE: string;
  PASSWORD_HASH: string;
  IS_ACTIVE: number;
}

async function findUserByPhone(phone: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    `SELECT ID, PHONE, PASSWORD_HASH, IS_ACTIVE FROM APP_USERS WHERE PHONE = :phone`,
    { phone }
  );
}

/* ------------------------------------------------------------------ */
/* POST /auth/login                                                      */
/* ------------------------------------------------------------------ */
router.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body as { phone?: string; password?: string };

  if (!phone || !password) {
    res.status(400).json({ error: "Phone and password are required." });
    return;
  }

  const phoneStr = String(phone).trim();
  if (!/^\d{10}$/.test(phoneStr)) {
    res.status(400).json({ error: "Phone must be a 10-digit number." });
    return;
  }

  /* ---- Dev bypass path (Oracle not reachable) ---- */
  if (!isConnected()) {
    if (!isDevBypassActive()) {
      logger.warn("Login attempted but Oracle is not connected and no dev bypass is configured.");
      res.status(503).json({
        error:
          "Database unavailable. The Oracle DB at 192.168.1.35 is not reachable from this environment. " +
          "Run the API server on your local network, or set DEV_AUTH_PHONE and DEV_AUTH_PASSWORD environment variables to enable a test bypass.",
      });
      return;
    }

    // Dev bypass: check test credentials
    if (phoneStr !== DEV_PHONE || password !== DEV_PASSWORD) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }

    const otp = createOtp(phoneStr);
    logger.warn({ phone: phoneStr }, `[DEV BYPASS] OTP: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  [DEV BYPASS] OTP for ${phoneStr}: ${otp}`);
    console.log(`  Oracle is unreachable — using test credentials.`);
    console.log(`========================================\n`);

    res.json({ success: true, message: "OTP sent. Check the server console.", phone: phoneStr });
    return;
  }

  /* ---- Production path (Oracle connected) ---- */
  try {
    const user = await findUserByPhone(phoneStr);

    if (!user) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }

    if (user.IS_ACTIVE !== 1) {
      res.status(403).json({ error: "Account is inactive. Contact your administrator." });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }

    const otp = createOtp(phoneStr);
    logger.info({ phone: phoneStr }, `[AUTH] OTP generated for ${phoneStr}: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  OTP for ${phoneStr}: ${otp}`);
    console.log(`  Expires in 5 minutes`);
    console.log(`========================================\n`);

    res.json({ success: true, message: "OTP sent. Check the server console.", phone: phoneStr });
  } catch (err) {
    logger.error({ err }, "POST /auth/login error");
    res.status(503).json({ error: "Database error. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* POST /auth/verify-otp                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/verify-otp", async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ error: "Phone and OTP are required." });
    return;
  }

  const phoneStr = String(phone).trim();
  const otpStr   = String(otp).trim();

  const result = verifyOtp(phoneStr, otpStr);

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "No OTP found for this number. Please login again.",
      expired:   "OTP has expired. Please login again to get a new OTP.",
      wrong:     "Incorrect OTP. Please try again.",
      too_many:  "Too many incorrect attempts. Please login again.",
    };
    res.status(401).json({ error: messages[result.reason] ?? "OTP verification failed." });
    return;
  }

  /* ---- Dev bypass path ---- */
  if (!isConnected() && isDevBypassActive()) {
    const token = signToken({ phone: phoneStr, userId: 0 });
    res.json({ success: true, token, user: { phone: phoneStr, userId: 0 } });
    return;
  }

  /* ---- Production path ---- */
  try {
    const user = await findUserByPhone(phoneStr);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const token = signToken({ phone: phoneStr, userId: user.ID });
    res.json({ success: true, token, user: { phone: phoneStr, userId: user.ID } });
  } catch (err) {
    logger.error({ err }, "POST /auth/verify-otp error");
    res.status(503).json({ error: "Database error. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* POST /auth/resend-otp                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/resend-otp", async (req, res) => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: "Phone is required." });
    return;
  }

  const phoneStr = String(phone).trim();

  /* ---- Dev bypass path ---- */
  if (!isConnected() && isDevBypassActive()) {
    if (phoneStr !== DEV_PHONE) {
      res.status(401).json({ error: "Invalid request." });
      return;
    }
    const otp = createOtp(phoneStr);
    console.log(`\n========================================`);
    console.log(`  [DEV BYPASS] Resent OTP for ${phoneStr}: ${otp}`);
    console.log(`========================================\n`);
    res.json({ success: true, message: "OTP resent." });
    return;
  }

  /* ---- Production path ---- */
  try {
    const user = await findUserByPhone(phoneStr);
    if (!user || user.IS_ACTIVE !== 1) {
      res.status(401).json({ error: "Invalid request." });
      return;
    }
    const otp = createOtp(phoneStr);
    logger.info({ phone: phoneStr }, `[AUTH] Resent OTP for ${phoneStr}: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  RESENT OTP for ${phoneStr}: ${otp}`);
    console.log(`========================================\n`);
    res.json({ success: true, message: "OTP resent." });
  } catch (err) {
    logger.error({ err }, "POST /auth/resend-otp error");
    res.status(503).json({ error: "Database error. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* GET /auth/me  (protected)                                            */
/* ------------------------------------------------------------------ */
router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ phone: req.auth!.phone, userId: req.auth!.userId });
});

export default router;
