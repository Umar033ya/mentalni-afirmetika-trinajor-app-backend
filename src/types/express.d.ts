import type { Request } from "express";
import type { AuthUser } from "./user.types";
import type { SubscriptionRow } from "./subscription.types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      subscription?: SubscriptionRow | null;
    }
  }
}

export {};
