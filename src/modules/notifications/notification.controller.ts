import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { notificationService } from "./notification.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const result = await notificationService.list(userId, pageFrom(req));
    const unreadCount = await notificationService.countUnread(userId);
    ok(res, { ...result, unreadCount });
  },

  async markRead(req: Request, res: Response): Promise<void> {
    await notificationService.markRead(req.user!.id, req.params.id);
    ok(res, { updated: true });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    await notificationService.markAllRead(req.user!.id);
    ok(res, { updated: true });
  }
};
