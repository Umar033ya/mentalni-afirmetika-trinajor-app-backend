import { Request, Response } from "express";
import { ok } from "../../utils/response";
import { leaderboardService, type LeaderboardType } from "./leaderboard.service";

function parseType(value: unknown): LeaderboardType {
  return value === "xp" || value === "wins" ? value : "duel";
}

export const leaderboardController = {
  async index(req: Request, res: Response): Promise<void> {
    const type = parseType(req.query.type);
    const limit = Number(req.query.limit ?? 20);
    const items = await leaderboardService.getLeaderboard(type, Number.isFinite(limit) ? limit : 20);
    ok(res, { type, items });
  },

  async duel(_req: Request, res: Response): Promise<void> {
    const items = await leaderboardService.getLeaderboard("duel", 50);
    ok(res, { type: "duel", items });
  },

  async xp(_req: Request, res: Response): Promise<void> {
    const items = await leaderboardService.getLeaderboard("xp", 50);
    ok(res, { type: "xp", items });
  }
};
