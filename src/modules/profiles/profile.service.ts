import { db } from "../../config/database";
import { AppError } from "../../utils/response";

export interface ProfileRow {
  user_id: string;
  bio: string | null;
  country: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

async function getMyProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle<ProfileRow>();
  if (error) throw error;
  if (!data) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found");
  return data;
}

async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, "bio" | "country" | "birthday">>
): Promise<ProfileRow> {
  const { data, error } = await db
    .from("profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single<ProfileRow>();
  if (error) throw error;
  return data;
}

export const profileService = { getMyProfile, updateMyProfile };
