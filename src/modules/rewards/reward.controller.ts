import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok, created } from "../../utils/response";
import { rewardService } from "./reward.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const rewardController = {
  async list(req: Request, res: Response): Promise<void> {
    const items = await rewardService.listRewards(req.user!.id);
    ok(res, { items });
  },

  async myClaims(req: Request, res: Response): Promise<void> {
    const result = await rewardService.myClaims(req.user!.id, pageFrom(req));
    ok(res, result);
  },

  async claim(req: Request, res: Response): Promise<void> {
    const result = await rewardService.claimReward(req.user!.id, req.params.id);
    await created(res, result);
  }
};
