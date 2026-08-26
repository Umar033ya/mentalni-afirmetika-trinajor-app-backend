import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { practiceService } from "./practice.service";
import type { PracticeAnswerPayload } from "./practice.validation";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const practiceController = {
  async startSession(req: Request, res: Response): Promise<void> {
    const session = await practiceService.startSession(req.user!.id, req.body);
    ok(res, session, 201);
  },

  async listSessions(req: Request, res: Response): Promise<void> {
    const result = await practiceService.listSessions(req.user!.id, pageFrom(req));
    ok(res, result);
  },

  async getSession(req: Request, res: Response): Promise<void> {
    const session = await practiceService.getSession(req.user!.id, req.params.id);
    ok(res, session);
  },

  async answer(req: Request, res: Response): Promise<void> {
    const payload = req.body as PracticeAnswerPayload;
    const result = await practiceService.answer(req.user!.id, req.params.id, payload);
    ok(res, result);
  },

  async finish(req: Request, res: Response): Promise<void> {
    const result = await practiceService.finish(req.user!.id, req.params.id);
    ok(res, result);
  }
};
