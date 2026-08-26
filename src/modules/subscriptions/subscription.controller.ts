import { Request, Response } from "express";
import { created, ok } from "../../utils/response";
import { subscriptionService } from "./subscription.service";

export const subscriptionController = {
  async me(req: Request, res: Response): Promise<void> {
    const status = await subscriptionService.getMySubscriptionStatus(req.user!.id);
    ok(res, status);
  },

  async subscribe(req: Request, res: Response): Promise<void> {
    const subscription = await subscriptionService.subscribe(req.user!.id, req.body.plan, req.body.days);
    await created(res, { plan: "PRO", isPro: true, subscription });
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const result = await subscriptionService.cancel(req.user!.id);
    ok(res, { ...result, plan: "FREE", isPro: false });
  }
};
