import { db } from "../../config/database";
import type { ChallengeRow, ChallengeProgressRow } from "../../types/challenge.types";

const STANDARD_DAILY_CHALLENGES = [
  {
    code: "DAILY_CORRECT_20",
    title: "Daily Warm-up",
    description: "Answer 20 questions correctly today",
    target_type: "correct_answers",
    target_value: 20,
    reward_xp: 30
  },
  {
    code: "DAILY_PRACTICE_2",
    title: "Practice Makes Perfect",
    description: "Complete 2 practice sessions today",
    target_type: "practice_sessions",
    target_value: 2,
    reward_xp: 40
  },
  {
    code: "DAILY_WIN_1",
    title: "Duelist",
    description: "Win 1 duel today",
    target_type: "duel_wins",
    target_value: 1,
    reward_xp: 60
  }
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureTodayChallenges(): Promise<void> {
  const date = today();
  const { data } = await db
    .from("daily_challenges")
    .select("id")
    .eq("challenge_date", date)
    .limit(1);
  if (data && data.length > 0) return;

  const rows = STANDARD_DAILY_CHALLENGES.map((c) => ({ ...c, challenge_date: date, is_active: true }));
  const { error } = await db.from("daily_challenges").upsert(rows, {
    onConflict: "code,challenge_date",
    ignoreDuplicates: true
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[challenges] failed to seed daily challenges:", error.message);
  }
}

async function listActive(): Promise<ChallengeRow[]> {
  const { data, error } = await db
    .from("daily_challenges")
    .select("*")
    .gte("challenge_date", new Date().toISOString().slice(0, 10))
    .order("challenge_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChallengeRow[];
}

async function getTodaysChallenges(): Promise<ChallengeRow[]> {
  await ensureTodayChallenges();
  const { data, error } = await db
    .from("daily_challenges")
    .select("*")
    .eq("challenge_date", today())
    .order("target_value");
  if (error) throw error;
  return (data ?? []) as ChallengeRow[];
}

interface MergedChallenge extends ChallengeRow {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

async function myProgress(userId: string): Promise<MergedChallenge[]> {
  const [challenges, progressRes] = await Promise.all([
    getTodaysChallenges(),
    db.from("challenge_progress").select("*").eq("user_id", userId)
  ]);
  const progressMap = new Map(
    ((progressRes.data ?? []) as ChallengeProgressRow[]).map((p) => [p.challenge_id, p])
  );
  return challenges.map((c) => {
    const p = progressMap.get(c.id);
    return {
      ...c,
      progress: p?.progress ?? 0,
      completed: p?.completed ?? false,
      claimed: p?.claimed ?? false
    };
  });
}

/** Adds activity (e.g. correct answers) toward all of today's challenges of a given target type. */
export async function recordActivity(userId: string, targetType: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const challenges = await getTodaysChallenges();
  const matching = challenges.filter((c) => c.is_active && c.target_type === targetType);

  for (const challenge of matching) {
    const existingRes = await db
      .from("challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .maybeSingle<ChallengeProgressRow>();

    const current = existingRes.data;
    if (current?.claimed) continue;

    const newProgress = Math.min((current?.progress ?? 0) + amount, challenge.target_value);
    const completed = newProgress >= challenge.target_value;

    if (current) {
      await db
        .from("challenge_progress")
        .update({
          progress: newProgress,
          completed: completed || current.completed,
          completed_at: completed && !current.completed_at ? new Date().toISOString() : current.completed_at
        })
        .eq("id", current.id);
    } else {
      await db.from("challenge_progress").insert({
        user_id: userId,
        challenge_id: challenge.id,
        progress: newProgress,
        completed,
        claimed: false,
        completed_at: completed ? new Date().toISOString() : null
      });
    }
  }
}

export const challengeService = {
  listActive,
  getTodaysChallenges,
  myProgress,
  recordActivity,
  today
};

export type { MergedChallenge };
