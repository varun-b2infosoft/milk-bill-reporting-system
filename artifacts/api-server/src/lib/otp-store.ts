/**
 * In-memory OTP store with expiry and attempt tracking.
 * Phone → { otp, expiresAt, attempts }
 */

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();

function generate6Digit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createOtp(phone: string): string {
  const otp = generate6Digit();
  store.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return otp;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "wrong" | "too_many" };

export function verifyOtp(phone: string, otp: string): VerifyResult {
  const entry = store.get(phone);
  if (!entry) return { ok: false, reason: "not_found" };
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return { ok: false, reason: "expired" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(phone);
    return { ok: false, reason: "too_many" };
  }
  if (entry.otp !== otp) {
    entry.attempts += 1;
    return { ok: false, reason: "wrong" };
  }
  store.delete(phone);
  return { ok: true };
}

export function hasActiveOtp(phone: string): boolean {
  const entry = store.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return false;
  }
  return true;
}

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(phone);
  }
}, 10 * 60 * 1000);
