import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { cosmeticsService } from "./cosmetics.service";
import type { EmojiRow, FrameRow, TitleRow } from "../../types/cosmetics.types";

export const cosmeticsController = {
  async catalog(req: Request, res: Response): Promise<void> {
    const result = await cosmeticsService.fullCatalog(req.user!.id);
    ok(res, result);
  },

  async emojis(req: Request, res: Response): Promise<void> {
    const items = await cosmeticsService.listKind("emoji", req.user!.id);
    ok(res, { items });
  },

  async frames(req: Request, res: Response): Promise<void> {
    const items = await cosmeticsService.listKind("frame", req.user!.id);
    ok(res, { items });
  },

  async titles(req: Request, res: Response): Promise<void> {
    const items = await cosmeticsService.listKind("title", req.user!.id);
    ok(res, { items });
  },

  async equipEmoji(req: Request, res: Response): Promise<void> {
    const result = await cosmeticsService.equip("emoji", req.params.id, req.user!.id);
    ok(res, result);
  },

  async equipFrame(req: Request, res: Response): Promise<void> {
    const result = await cosmeticsService.equip("frame", req.params.id, req.user!.id);
    ok(res, result);
  },

  async equipTitle(req: Request, res: Response): Promise<void> {
    const result = await cosmeticsService.equip("title", req.params.id, req.user!.id);
    ok(res, result);
  }
};

export type { EmojiRow, FrameRow, TitleRow };
