import { Request, Response } from "express";
import { created, ok } from "../../utils/response";
import { authService } from "./auth.service";
import { toSelfUser } from "../users/user.mapper";
import { presenceService } from "../presence/presence.service";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    await created(res, result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    ok(res, result);
  },

  async me(req: Request, res: Response): Promise<void> {
    const row = await authService.me(req.user!.id);
    ok(res, { user: toSelfUser(row) });
  },

  async logout(req: Request, res: Response): Promise<void> {
    await presenceService.heartbeatOff(req.user!.id);
    ok(res, { loggedOut: true });
  }
};
