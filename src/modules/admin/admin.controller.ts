import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { created, ok } from "../../utils/response";
import { adminService } from "./admin.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const adminController = {
  async listUsers(req: Request, res: Response): Promise<void> {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await adminService.listUsers(pageFrom(req), search);
    ok(res, result);
  },

  async updateUser(req: Request, res: Response): Promise<void> {
    const result = await adminService.updateUser(req.params.id, {
      role: req.body.role,
      is_banned: req.body.is_banned
    });
    ok(res, result);
  },

  async overview(_req: Request, res: Response): Promise<void> {
    ok(res, await adminService.overview());
  },

  async getAppSettings(_req: Request, res: Response): Promise<void> {
    ok(res, { items: await adminService.listAppSettings() });
  },

  async setAppSetting(req: Request, res: Response): Promise<void> {
    const setting = await adminService.upsertAppSetting(req.body.key, req.body.value);
    await created(res, setting);
  }
};
