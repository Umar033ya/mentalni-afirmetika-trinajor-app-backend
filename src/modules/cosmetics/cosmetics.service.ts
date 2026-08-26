import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import { subscriptionService } from "../subscriptions/subscription.service";
import type { EmojiRow } from "../../types/cosmetics.types";

interface EquipTarget {
  catalogTable: string;
  ownershipTable: string;
  foreignKey: string;
  activeColumn: string;
}

export const EQUIP_TARGETS: Record<"emoji" | "frame" | "title", EquipTarget> = {
  emoji: {
    catalogTable: "emojis",
    ownershipTable: "user_emojis",
    foreignKey: "emoji_id",
    activeColumn: "active_emoji_id"
  },
  frame: {
    catalogTable: "frames",
    ownershipTable: "user_frames",
    foreignKey: "frame_id",
    activeColumn: "active_frame_id"
  },
  title: {
    catalogTable: "titles",
    ownershipTable: "user_titles",
    foreignKey: "title_id",
    activeColumn: "active_title_id"
  }
};

export interface CatalogItemView {
  id: string;
  name: string;
  isPro: boolean;
  unlockLevel: number;
  unlockedByLevel: boolean;
  requiresPro: boolean;
  owned: boolean;
  canEquip: boolean;
  equipped: boolean;
  extra: Record<string, unknown>;
}

async function loadUser(userId: string) {
  const { data, error } = await db
    .from("users")
    .select("id,level,active_emoji_id,active_frame_id,active_title_id")
    .eq("id", userId)
    .single<{
      id: string;
      level: number;
      active_emoji_id: string | null;
      active_frame_id: string | null;
      active_title_id: string | null;
    }>();
  if (error || !data) throw error ?? new Error("User not found");
  return data;
}

function decorate(
  item: Record<string, unknown>,
  user: Awaited<ReturnType<typeof loadUser>>,
  isPro: boolean,
  target: EquipTarget,
  extraFields: string[],
  ownedIds: Set<string>
): CatalogItemView {
  const unlockLevel = Number(item.unlock_level ?? 1);
  const isProItem = Boolean(item.is_pro);
  const unlockedByLevel = unlockLevel <= user.level;
  const proOk = !isProItem || isPro;
  const activeId =
    target.activeColumn === "active_emoji_id"
      ? user.active_emoji_id
      : target.activeColumn === "active_frame_id"
        ? user.active_frame_id
        : user.active_title_id;

  const extra: Record<string, unknown> = {};
  for (const field of extraFields) extra[field] = item[field] ?? null;

  return {
    id: item.id as string,
    name: item.name as string,
    isPro: isProItem,
    unlockLevel,
    unlockedByLevel,
    requiresPro: isProItem,
    owned: ownedIds.has(item.id as string) || (unlockedByLevel && proOk),
    canEquip: unlockedByLevel && proOk,
    equipped: activeId === item.id,
    extra
  };
}

async function listKind(
  kind: "emoji" | "frame" | "title",
  userId: string
): Promise<CatalogItemView[]> {
  const target = EQUIP_TARGETS[kind];
  const [userRes, itemsRes, isPro, ownedRes] = await Promise.all([
    loadUser(userId),
    db.from(target.catalogTable).select("*").order("unlock_level"),
    subscriptionService.isPro(userId),
    db.from(target.ownershipTable).select(target.foreignKey).eq("user_id", userId)
  ]);

  const ownedIds = new Set(
    ((ownedRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) =>
      String(row[target.foreignKey])
    )
  );

  const extraFields =
    kind === "emoji" ? ["emoji"] : kind === "frame" ? ["image_url"] : ["description"];

  return ((itemsRes.data ?? []) as Array<Record<string, unknown>>).map((item) =>
    decorate(item, userRes, isPro, target, extraFields, ownedIds)
  );
}

export async function equip(kind: "emoji" | "frame" | "title", itemId: string, userId: string) {
  const target = EQUIP_TARGETS[kind];

  const [{ data: item }, user, isPro] = await Promise.all([
    db.from(target.catalogTable).select("*").eq("id", itemId).maybeSingle<Record<string, unknown>>(),
    loadUser(userId),
    subscriptionService.isPro(userId)
  ]);
  if (!item) throw new AppError(404, "COSMETIC_NOT_FOUND", `${kind} not found`);

  const unlockLevel = Number(item.unlock_level ?? 1);
  if (user.level < unlockLevel) {
    throw new AppError(403, "COSMETIC_LOCKED", `Requires level ${unlockLevel}`);
  }
  if (item.is_pro && !isPro) {
    throw new AppError(402, "PRO_REQUIRED", `The "${item.name}" ${kind} requires an active Pro subscription`);
  }

  await db
    .from(target.ownershipTable)
    .upsert({ user_id: userId, [target.foreignKey]: itemId } as Record<string, unknown>, {
      onConflict: `user_id,${target.foreignKey}`,
      ignoreDuplicates: true
    });

  await db.from("users").update({ [target.activeColumn]: itemId }).eq("id", userId);

  return { equipped: true, kind, id: itemId };
}

export async function fullCatalog(userId: string) {
  const [emojis, frames, titles] = await Promise.all([
    listKind("emoji", userId),
    listKind("frame", userId),
    listKind("title", userId)
  ]);
  return { emojis, frames, titles };
}

export async function listEmojis(): Promise<EmojiRow[]> {
  const { data, error } = await db.from("emojis").select("*").order("unlock_level");
  if (error) throw error;
  return (data ?? []) as EmojiRow[];
}

export const cosmeticsService = { listKind, equip, fullCatalog, listEmojis };
