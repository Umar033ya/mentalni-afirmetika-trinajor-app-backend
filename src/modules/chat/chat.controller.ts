import { Request, Response } from "express";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok, created } from "../../utils/response";
import { chatService } from "./chat.service";

function pageFrom(req: Request): PageParams {
  return parsePageParams(req.query as Record<string, string | undefined>);
}

export const chatController = {
  async listMessages(req: Request, res: Response): Promise<void> {
    const result = await chatService.listMessages(req.params.id, req.user!.id, pageFrom(req));
    ok(res, result);
  },

  async sendMessage(req: Request, res: Response): Promise<void> {
    const result = await chatService.sendMessage(req.params.id, req.user!.id, {
      message: req.body.message,
      messageType: req.body.messageType,
      isPro: Boolean(req.subscription)
    });
    await created(res, result);
  }
};
