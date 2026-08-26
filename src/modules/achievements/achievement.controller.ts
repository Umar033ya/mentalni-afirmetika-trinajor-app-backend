import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { achievementService } from "./achievement.service";

export const achievementController = {
  async list(_req: Request, res: Response): Promise<void> {
    const items = await achievementService.listCatalog();
    ok(res, { items });
  },

  async myAchievements(req: Request, res: Response): Promise<void> {
    const items = await achievementService.myAchievements(req.user!.id);
    ok(res, { items });
  }
};
