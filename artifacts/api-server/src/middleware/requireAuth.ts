import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  phone: string;
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  const secret = process.env["SESSION_SECRET"] ?? "fallback-dev-secret";
  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env["SESSION_SECRET"] ?? "fallback-dev-secret";
  return jwt.sign(payload, secret, { expiresIn: "8h" });
}
