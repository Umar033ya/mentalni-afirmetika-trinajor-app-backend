import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { duelService } from "./duel.service";
import type { DuelAnswerPayload } from "./duel.validation";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const duelController = {
  async create(req: Request, res: Response): Promise<void> {
    const result = await duelService.create(req.user!.id, req.body);
    ok(res, result, 201);
  },

  async listWaiting(req: Request, res: Response): Promise<void> {
    const result = await duelService.listWaiting(pageFrom(req));
    ok(res, result);
  },

  async listOngoing(req: Request, res: Response): Promise<void> {
    const result = await duelService.listByStatus(["READY", "COUNTDOWN", "ONGOING"], pageFrom(req));
    ok(res, result);
  },

  async listCompleted(req: Request, res: Response): Promise<void> {
    const scope = (req.query.scope as string) === "mine" ? "mine" : "all";
    const result = await duelService.listCompleted(scope, req.user!.id, pageFrom(req));
    ok(res, result);
  },

  async listAll(req: Request, res: Response): Promise<void> {
    const result = await duelService.listByStatus(
      ["WAITING", "READY", "COUNTDOWN", "ONGOING", "COMPLETED"],
      pageFrom(req)
    );
    ok(res, result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const result = await duelService.getById(req.params.id);
    ok(res, result);
  },

  async getState(req: Request, res: Response): Promise<void> {
    const state = await duelService.getState(req.params.id, req.user!.id);
    ok(res, state);
  },

  async join(req: Request, res: Response): Promise<void> {
    const state = await duelService.join(req.params.id, req.user!.id);
    ok(res, state);
  },

  async accept(req: Request, res: Response): Promise<void> {
    const state = await duelService.accept(req.params.id, req.user!.id);
    ok(res, state);
  },

  async decline(req: Request, res: Response): Promise<void> {
    const result = await duelService.decline(req.params.id, req.user!.id);
    ok(res, result);
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const result = await duelService.cancel(req.params.id, req.user!.id);
    ok(res, result);
  },

  async answer(req: Request, res: Response): Promise<void> {
    const payload = req.body as DuelAnswerPayload;
    const result = await duelService.submitAnswer(req.params.id, req.user!.id, payload);
    ok(res, result);
  }
};
