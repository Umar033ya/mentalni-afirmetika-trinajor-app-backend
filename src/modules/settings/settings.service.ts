import { db } from "../../config/database";

export interface UserSettingsRow {
  user_id: string;
  sound_enabled: boolean;
  music_enabled: boolean;
  haptics_enabled: boolean;
  language: string;
  theme: string;
  notifications_duels: boolean;
  notifications_results: boolean;
  daily_reminder: boolean;
  updated_at: string;
}

const DEFAULTS = {
  sound_enabled: true,
  music_enabled: true,
  haptics_enabled: true,
  language: "uz",
  theme: "system",
  notifications_duels: true,
  notifications_results: true,
  daily_reminder: true
};

async function getMySettings(userId: string): Promise<UserSettingsRow> {
  const existing = await db
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<UserSettingsRow>();
  if (existing.data) return existing.data;

  const { data, error } = await db
    .from("user_settings")
    .insert({ user_id: userId, ...DEFAULTS })
    .select("*")
    .single<UserSettingsRow>();
  if (error || !data) throw error ?? new Error("Failed to create settings");
  return data;
}

async function updateMySettings(
  userId: string,
  patch: Partial<Omit<UserSettingsRow, "user_id" | "updated_at">>
): Promise<UserSettingsRow> {
  await getMySettings(userId);
  const { data, error } = await db
    .from("user_settings")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single<UserSettingsRow>();
  if (error || !data) throw error ?? new Error("Failed to update settings");
  return data;
}

export const settingsService = { getMySettings, updateMySettings };
