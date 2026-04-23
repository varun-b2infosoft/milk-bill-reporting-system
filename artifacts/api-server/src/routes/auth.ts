import { Router } from "express";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { query, queryOne, execute } from "../lib/oracle";
import { createOtp, verifyOtp, hasActiveOtp } from "../lib/otp-store";
import { signToken, requireAuth } from "../middleware/requireAuth";

const router = Router();

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
  try {
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

    // Generate and store OTP
    const otp = createOtp(phoneStr);

    // Log OTP to console (no SMS integration yet)
    logger.info({ phone: phoneStr }, `[AUTH] OTP for ${phoneStr}: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  OTP for ${phoneStr}: ${otp}`);
    console.log(`  Expires in 5 minutes`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: "OTP sent. Please check the server console for the OTP.",
      phone: phoneStr,
    });
  } catch (err) {
    logger.error({ err }, "POST /auth/login error");
    res.status(503).json({ error: "Database unavailable. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* POST /auth/verify-otp                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };

    if (!phone || !otp) {
      res.status(400).json({ error: "Phone and OTP are required." });
      return;
    }

    const phoneStr = String(phone).trim();
    const otpStr = String(otp).trim();

    const result = verifyOtp(phoneStr, otpStr);

    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: "No OTP found for this number. Please login again.",
        expired: "OTP has expired. Please login again to get a new OTP.",
        wrong: "Incorrect OTP. Please try again.",
        too_many: "Too many incorrect attempts. Please login again.",
      };
      res.status(401).json({ error: messages[result.reason] ?? "OTP verification failed." });
      return;
    }

    // Fetch user to issue token
    const user = await findUserByPhone(phoneStr);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    const token = signToken({ phone: phoneStr, userId: user.ID });

    res.json({
      success: true,
      token,
      user: { phone: phoneStr, userId: user.ID },
    });
  } catch (err) {
    logger.error({ err }, "POST /auth/verify-otp error");
    res.status(503).json({ error: "Database unavailable. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* POST /auth/resend-otp                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/resend-otp", async (req, res) => {
  try {
    const { phone } = req.body as { phone?: string };

    if (!phone) {
      res.status(400).json({ error: "Phone is required." });
      return;
    }

    const phoneStr = String(phone).trim();

    // Only allow resend if user is valid
    const user = await findUserByPhone(phoneStr);
    if (!user || user.IS_ACTIVE !== 1) {
      res.status(401).json({ error: "Invalid request." });
      return;
    }

    const otp = createOtp(phoneStr);

    logger.info({ phone: phoneStr }, `[AUTH] Resent OTP for ${phoneStr}: ${otp}`);
    console.log(`\n========================================`);
    console.log(`  RESENT OTP for ${phoneStr}: ${otp}`);
    console.log(`  Expires in 5 minutes`);
    console.log(`========================================\n`);

    res.json({ success: true, message: "OTP resent." });
  } catch (err) {
    logger.error({ err }, "POST /auth/resend-otp error");
    res.status(503).json({ error: "Database unavailable. Please try again later." });
  }
});

/* ------------------------------------------------------------------ */
/* GET /auth/me  (protected)                                            */
/* ------------------------------------------------------------------ */
router.get("/auth/me", requireAuth, async (req, res) => {
  res.json({ phone: req.auth!.phone, userId: req.auth!.userId });
});

export default router;
