import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { MatchHistoryRow } from "./match.types";

async function listMine(userId: string, page: PageParams, type?: string) {
  let query = db
    .from("match_history")
    .select("*", { count: "exact" })
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
  if (type) query = query.eq("type", type);

  const { data, error, count } = await query
    .order("played_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;

  return {
    items: ((data ?? []) as MatchHistoryRow[]).map((row) => ({
      ...row,
      youWon:
        row.is_draw === true
          ? null
          : row.winner_id !== null && row.winner_id === userId
    })),
    pagination: buildPaginationMeta(page, count)
  };
}

async function getById(userId: string, matchId: string) {
  const { data, error } = await db
    .from("match_history")
    .select(
      `*,
       player1:player1_id(id,username,level,avatar_url),
       player2:player2_id(id,username,level,avatar_url),
       duel:duel_id(id,status,mode,operation,digit_count,rows,question_count,time_per_question_ms,difficulty)`
    )
    .eq("id", matchId)
    .maybeSingle<Record<string, unknown>>();
  if (error) throw error;
  if (!data) throw new AppError(404, "MATCH_NOT_FOUND", "Match not found");

  const isParticipant = data.player1_id === userId || data.player2_id === userId;
  const { data: viewer } = await db.from("users").select("role").eq("id", userId).single<{ role: string }>();
  if (!isParticipant && viewer?.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "You can only view your own matches");
  }
  return data;
}

export const matchService = { listMine, getById };
