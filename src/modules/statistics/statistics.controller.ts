import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { statisticsService } from "./statistics.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const statisticsController = {
  async me(req: Request, res: Response): Promise<void> {
    ok(res, await statisticsService.getMyStatistics(req.user!.id));
  },

  async history(req: Request, res: Response): Promise<void> {
    ok(res, await statisticsService.getDuelHistory(req.user!.id, pageFrom(req)));
  }
};
