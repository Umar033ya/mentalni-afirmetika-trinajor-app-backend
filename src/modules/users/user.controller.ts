import { Request, Response } from "express";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { userService } from "./user.service";
import { toPublicUser, toSelfUser } from "./user.mapper";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const userController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const row = await userService.getMe(req.user!.id);
    ok(res, toSelfUser(row));
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    const row = await userService.updateMe(req.user!.id, {
      username: req.body.username,
      phone: req.body.phone,
      avatarUrl: req.body.avatarUrl
    });
    await userService.touchPresence(req.user!.id);
    ok(res, toSelfUser(row));
  },

  async getPublicUser(req: Request, res: Response): Promise<void> {
    const profile = await userService.getPublicUser(req.params.id);
    ok(res, profile);
  },

  async listOnline(req: Request, res: Response): Promise<void> {
    const result = await userService.listOnline(pageFrom(req));
    ok(res, result);
  }
};
