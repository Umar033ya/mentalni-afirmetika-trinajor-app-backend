import { NextFunction, Request, Response } from "express";
import { subscriptionService } from "../modules/subscriptions/subscription.service";
import { errorBody } from "../utils/response";

export async function requirePro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json(errorBody("UNAUTHORIZED", "Authentication required"));
      return;
    }
    const active = await subscriptionService.getActiveSubscription(req.user.id);
    if (!active) {
      res
        .status(402)
        .json(errorBody("PRO_REQUIRED", "This feature requires an active Pro subscription"));
      return;
    }
    req.subscription = active;
    next();
  } catch (err) {
    next(err);
  }
}
