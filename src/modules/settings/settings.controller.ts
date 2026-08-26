import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { settingsService } from "./settings.service";

export const settingsController = {
  async me(req: Request, res: Response): Promise<void> {
    const settings = await settingsService.getMySettings(req.user!.id);
    ok(res, settings);
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    const settings = await settingsService.updateMySettings(req.user!.id, req.body);
    ok(res, settings);
  }
};
