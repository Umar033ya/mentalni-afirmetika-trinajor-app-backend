import { NextFunction, Request, Response } from "express";
import { db } from "../config/database";
import { PRESENCE_TOUCH_INTERVAL_MS } from "../config/constants";
import { verifyToken } from "../utils/jwt";
import { errorBody } from "../utils/response";
import type { UserRow } from "../types/user.types";

function toAuthUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    level: row.level,
    xp: row.xp,
    duel_rating: row.duel_rating,
    is_banned: row.is_banned
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json(errorBody("UNAUTHORIZED", "Missing bearer token"));
      return;
    }

    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      res.status(401).json(errorBody("INVALID_TOKEN", "Invalid or expired token"));
      return;
    }

    const { data, error } = await db
      .from("users")
      .select("*")
      .eq("id", payload.sub)
      .maybeSingle<UserRow>();

    if (error) {
      next(error);
      return;
    }
    if (!data) {
      res.status(401).json(errorBody("USER_NOT_FOUND", "User no longer exists"));
      return;
    }
    if (data.is_banned) {
      res.status(403).json(errorBody("ACCOUNT_BANNED", "This account has been banned"));
      return;
    }

    req.user = toAuthUser(data);

    const lastSeen = data.last_seen ? new Date(data.last_seen).getTime() : 0;
    if (!data.is_online || Date.now() - lastSeen > PRESENCE_TOUCH_INTERVAL_MS) {
      void db
        .from("users")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", data.id)
        .then(() => undefined);
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json(errorBody("FORBIDDEN", "Admin access required"));
    return;
  }
  next();
}
