import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import type { UserRow } from "../../types/user.types";
import { notificationService } from "../notifications/notification.service";
import { userService } from "../users/user.service";
import type { LoginPayload, RegisterPayload } from "./auth.validation";

async function assertAvailable(fields: { email: string; username: string }): Promise<void> {
  const orFilter = `email.eq.${fields.email},username.ilike.${fields.username}`;
  const { data } = await db.from("users").select("id,email,username").or(orFilter);
  if (!data) return;
  for (const row of data as Array<{ email: string; username: string }>) {
    if (row.email === fields.email) {
      throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
    }
    if (row.username.toLowerCase() === fields.username.toLowerCase()) {
      throw new AppError(409, "USERNAME_TAKEN", "Username is already taken");
    }
  }
}

function issueToken(user: Pick<UserRow, "id" | "role">): string {
  return signToken({ sub: user.id, role: user.role });
}

async function register(payload: RegisterPayload) {
  await assertAvailable({ email: payload.email, username: payload.username });
  const passwordHash = await hashPassword(payload.password);

  const { data: user, error } = await db
    .from("users")
    .insert({
      username: payload.username,
      email: payload.email,
      phone: payload.phone ?? null,
      password_hash: passwordHash
    })
    .select("*")
    .single<UserRow>();

  if (error || !user) {
    throw new AppError(500, "REGISTRATION_FAILED", error?.message ?? "Could not create account");
  }

  await Promise.all([
    db.from("profiles").insert({ user_id: user.id }).then(() => undefined),
    db.from("user_settings").insert({ user_id: user.id }).then(() => undefined)
  ]);

  await notificationService.create({
    userId: user.id,
    type: "SYSTEM",
    title: "Welcome!",
    message: "Welcome to Mental Arithmetic! Practice daily and climb the leaderboard."
  });

  await userService.touchPresence(user.id);

  return {
    token: issueToken(user),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      xp: user.xp,
      duelRating: user.duel_rating
    }
  };
}

async function login(payload: LoginPayload) {
  const isEmail = payload.identifier.includes("@");
  let query = db.from("users").select("*");
  query = isEmail
    ? query.eq("email", payload.identifier.toLowerCase())
    : query.ilike("username", payload.identifier);

  const { data: user } = await query.maybeSingle<UserRow>();
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  const valid = await verifyPassword(payload.password, user.password_hash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  if (user.is_banned) throw new AppError(403, "ACCOUNT_BANNED", "This account has been banned");

  await userService.touchPresence(user.id);
  return { token: issueToken(user) };
}

async function me(userId: string) {
  const row = await userService.findRawById(userId);
  return row;
}

export const authService = { register, login, me };
