import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { presenceService } from "./presence.service";

export const presenceController = {
  async heartbeat(req: Request, res: Response): Promise<void> {
    await presenceService.heartbeat(req.user!.id);
    const now = new Date().toISOString();
    ok(res, { isOnline: true, serverTime: now });
  },

  async offline(req: Request, res: Response): Promise<void> {
    await presenceService.heartbeatOff(req.user!.id);
    ok(res, { isOnline: false });
  }
};
