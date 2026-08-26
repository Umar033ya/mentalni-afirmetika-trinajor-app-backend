import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { ratingService } from "./rating.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const ratingController = {
  async me(req: Request, res: Response): Promise<void> {
    const result = await ratingService.getMyRating(req.user!.id);
    ok(res, result);
  },

  async history(req: Request, res: Response): Promise<void> {
    const result = await ratingService.getHistory(req.user!.id, pageFrom(req));
    ok(res, result);
  }
};
