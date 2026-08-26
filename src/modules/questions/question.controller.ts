import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { difficultyService } from "./difficulty.service";
import { questionConfigService } from "./question-config.service";

export const questionController = {
  async getConfig(_req: Request, res: Response): Promise<void> {
    const rules = await questionConfigService.getGenerationRules();
    ok(res, rules);
  },

  async getDifficulties(_req: Request, res: Response): Promise<void> {
    const difficulties = await difficultyService.listDifficulties();
    ok(res, { items: difficulties });
  },

  async validateConfig(req: Request, res: Response): Promise<void> {
    const result = await questionConfigService.validateConfigPayload(req.body);
    ok(res, result);
  }
};
