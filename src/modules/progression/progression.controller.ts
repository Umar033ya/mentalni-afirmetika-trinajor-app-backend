import { Request, Response } from "express";
import { MAX_LEVEL } from "../../config/constants";
import type { PageParams } from "../../utils/pagination";
import { parsePageParams } from "../../utils/pagination";
import { ok } from "../../utils/response";
import { db } from "../../config/database";
import { levelService } from "./level.service";

export const progressionController = {
  async me(req: Request, res: Response): Promise<void> {
    const progress = await levelService.getMyProgress(req.user!.id);
    ok(res, progress);
  },

  async levels(_req: Request, res: Response): Promise<void> {
    ok(res, { items: levelService.getLevelTable(50), maxLevel: MAX_LEVEL });
  },

  async xpHistory(req: Request, res: Response): Promise<void> {
    const page: PageParams = parsePageParams(req.query as Record<string, string | undefined>);
    const { data, error, count } = await db
      .from("xp_history")
      .select("*", { count: "exact" })
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false })
      .range(page.from, page.to);
    if (error) throw error;

    ok(res, {
      items: data ?? [],
      pagination: {
        page: page.page,
        pageSize: page.pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / page.pageSize))
      }
    });
  }
};
