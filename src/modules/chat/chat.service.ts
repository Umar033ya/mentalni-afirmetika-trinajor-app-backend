import { db } from "../../config/database";
import { CHAT_MAX_MESSAGE_LENGTH } from "../../config/constants";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { DuelRow } from "../duels/duel.types";

export interface DuelMessageRow {
  id: string;
  duel_id: string;
  user_id: string;
  message: string;
  message_type: "text" | "emoji";
  is_emoji: boolean;
  created_at: string;
}

async function assertParticipant(duelId: string, userId: string): Promise<DuelRow> {
  const { data: duel, error } = await db
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .maybeSingle<DuelRow>();
  if (error) throw error;
  if (!duel) throw new AppError(404, "DUEL_NOT_FOUND", "Duel not found");

  if (duel.creator_id !== userId && duel.opponent_id !== userId) {
    throw new AppError(403, "NOT_A_PARTICIPANT", "You are not part of this duel");
  }
  return duel;
}

async function listMessages(duelId: string, userId: string, page: PageParams) {
  await assertParticipant(duelId, userId);
  const { data, error, count } = await db
    .from("duel_messages")
    .select("*, author:user_id(id,username)", { count: "exact" })
    .eq("duel_id", duelId)
    .order("created_at", { ascending: true })
    .range(page.from, page.to);
  if (error) throw error;

  return {
    items: ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: (row.author as { username?: string } | null)?.username ?? null,
      message: row.message,
      messageType: row.message_type,
      isEmoji: row.is_emoji,
      createdAt: row.created_at
    })),
    pagination: buildPaginationMeta(page, count)
  };
}

async function isKnownEmoji(candidate: string): Promise<boolean> {
  const { data } = await db.from("emojis").select("id").eq("emoji", candidate).limit(1);
  return Boolean(data && data.length > 0);
}

async function sendMessage(
  duelId: string,
  userId: string,
  input: { message: string; messageType: "text" | "emoji"; isPro: boolean }
) {
  await assertParticipant(duelId, userId);

  const trimmed = input.message.trim();
  if (!trimmed) throw new AppError(422, "EMPTY_MESSAGE", "Message cannot be empty");
  if (trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
    throw new AppError(422, "MESSAGE_TOO_LONG", `Message must be at most ${CHAT_MAX_MESSAGE_LENGTH} characters`);
  }

  let isEmoji = false;
  if (input.messageType === "emoji") {
    isEmoji = true;
    if (!(await isKnownEmoji(trimmed))) {
      throw new AppError(422, "EMOJI_NOT_ALLOWED", "This emoji is not allowed");
    }
  }

  const { data, error } = await db
    .from("duel_messages")
    .insert({
      duel_id: duelId,
      user_id: userId,
      message: trimmed,
      message_type: input.messageType,
      is_emoji: isEmoji
    })
    .select("*")
    .single<DuelMessageRow>();
  if (error || !data) throw error ?? new Error("Failed to send message");

  return {
    id: data.id,
    userId: data.user_id,
    message: data.message,
    messageType: data.message_type,
    isEmoji: data.is_emoji,
    createdAt: data.created_at
  };
}

export const chatService = { assertParticipant, listMessages, sendMessage };
