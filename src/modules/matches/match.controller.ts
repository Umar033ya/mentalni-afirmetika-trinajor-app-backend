import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { matchService } from "./match.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const matchController = {
  async list(req: Request, res: Response): Promise<void> {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const result = await matchService.listMine(req.user!.id, pageFrom(req), type);
    ok(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const result = await matchService.getById(req.user!.id, req.params.id);
    ok(res, result);
  }
};
