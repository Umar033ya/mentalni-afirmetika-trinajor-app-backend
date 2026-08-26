import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { GenerationConfig } from "../../types/question.types";
import { applyXp } from "../progression/xp.service";
import { achievementService } from "../achievements/achievement.service";
import { challengeService } from "../challenges/challenge.service";
import {
  assertNotAfterDeadline,
  assertNotImpossibleResponseTime,
  assertNotTooEarly,
  evaluateSubmission
} from "../answers/answer.service";
import { xpForCorrectAnswer } from "../../utils/xp";
import type { Difficulty } from "../../types/question.types";

export interface PracticeSessionRow {
  id: string;
  user_id: string;
  status: "ongoing" | "completed" | "abandoned";
  operation: string;
  digit_count: number;
  rows: number;
  question_count: number;
  time_per_question_ms: number;
  difficulty: string;
  config: GenerationConfig | null;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  wrong_answers: number;
  total_xp: number;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

interface PracticeAnswerRow {
  id: string;
  session_id: string;
  user_id: string;
  question_number: number;
  answer: number;
  is_correct: boolean;
  verified_by_server: boolean;
  response_time_ms: number | null;
  created_at: string;
}

function toDto(row: PracticeSessionRow) {
  return {
    id: row.id,
    status: row.status,
    config: row.config ?? {
      operation: row.operation,
      digitCount: row.digit_count,
      rows: row.rows,
      questionCount: row.question_count,
      timePerQuestionMs: row.time_per_question_ms,
      difficulty: row.difficulty
    },
    totals: {
      questions: row.total_questions,
      answered: row.answered_questions,
      correct: row.correct_answers,
      wrong: row.wrong_answers,
      xpEarned: row.total_xp
    },
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

async function loadOwnedSession(userId: string, sessionId: string): Promise<PracticeSessionRow> {
  const { data, error } = await db
    .from("practice_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle<PracticeSessionRow>();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new AppError(404, "SESSION_NOT_FOUND", "Practice session not found");
  return data;
}

async function startSession(userId: string, config: GenerationConfig) {
  const { data, error } = await db
    .from("practice_sessions")
    .insert({
      user_id: userId,
      status: "ongoing",
      operation: config.operation,
      digit_count: config.digitCount,
      rows: config.rows,
      question_count: config.questionCount,
      time_per_question_ms: config.timePerQuestionMs,
      difficulty: config.difficulty,
      config,
      total_questions: config.questionCount
    })
    .select("*")
    .single<PracticeSessionRow>();
  if (error || !data) throw error ?? new Error("Failed to create session");
  return toDto(data);
}

async function listSessions(userId: string, page: PageParams) {
  const { data, error, count } = await db
    .from("practice_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return {
    items: ((data ?? []) as PracticeSessionRow[]).map(toDto),
    pagination: buildPaginationMeta(page, count)
  };
}

async function getSession(userId: string, sessionId: string) {
  const [session, answersRes] = await Promise.all([
    loadOwnedSession(userId, sessionId),
    db.from("practice_answers").select("*").eq("session_id", sessionId).order("question_number")
  ]);
  return { ...toDto(session), answers: (answersRes.data ?? []) as PracticeAnswerRow[] };
}

export interface PracticeAnswerInput {
  questionNumber: number;
  answer: number;
  responseTimeMs?: number;
  isCorrect?: boolean;
  operands?: number[];
}

async function answer(userId: string, sessionId: string, input: PracticeAnswerInput) {
  const session = await loadOwnedSession(userId, sessionId);
  if (session.status !== "ongoing") {
    throw new AppError(409, "SESSION_FINISHED", "This practice session is already finished");
  }
  if (input.questionNumber > session.question_count) {
    throw new AppError(422, "INVALID_QUESTION_NUMBER", "Question number is out of range");
  }

  const existing = await db
    .from("practice_answers")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("question_number", input.questionNumber)
    .maybeSingle();
  if (existing.data) throw new AppError(409, "DUPLICATE_ANSWER", "Question already answered");

  assertNotImpossibleResponseTime(input.responseTimeMs);

  const elapsed = Date.now() - new Date(session.started_at).getTime();
  assertNotTooEarly(elapsed, input.questionNumber, session.time_per_question_ms);
  assertNotAfterDeadline(elapsed, session.question_count, session.time_per_question_ms);

  const evaluation = evaluateSubmission({
    answer: input.answer,
    claimedIsCorrect: input.isCorrect,
    operands: input.operands,
    operation: session.operation
  });

  const xpEarned = evaluation.isCorrect ? xpForCorrectAnswer(session.difficulty as Difficulty) : 0;

  // Atomic insert + counter update (prevents duplicate answers under concurrency)
  const rpcRes = await db.rpc("record_practice_answer", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_question_number: input.questionNumber,
    p_answer: input.answer,
    p_is_correct: evaluation.isCorrect,
    p_verified: evaluation.verifiedByServer,
    p_response_time_ms: input.responseTimeMs ?? null,
    p_xp_reward: xpEarned
  });
  if (rpcRes.error) throw rpcRes.error;
  const inserted = (rpcRes.data as Array<{ inserted: boolean }> | null)?.[0]?.inserted ?? false;
  if (!inserted) {
    throw new AppError(409, "DUPLICATE_ANSWER", "Question already answered");
  }

  const finishedCount = session.answered_questions + 1;
  const finished = finishedCount >= session.question_count;

  return {
    isCorrect: evaluation.isCorrect,
    verifiedByServer: evaluation.verifiedByServer,
    xpEarned,
    nextQuestion: finished ? null : input.questionNumber + 1
  };
}

async function finish(userId: string, sessionId: string) {
  let session = await loadOwnedSession(userId, sessionId);
  if (session.status === "completed") {
    return {
      ...toDto(session),
      rewardApplied: false,
      message: "Session already finished"
    };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await db
    .from("practice_sessions")
    .update({ status: "completed", finished_at: nowIso })
    .eq("id", sessionId)
    .select("*")
    .single<PracticeSessionRow>();
  if (error || !updated) throw error ?? new Error("Failed to finish session");
  session = updated;

  // Apply accumulated XP and global stats
  const xpResult =
    session.total_xp > 0
      ? await applyXp(userId, session.total_xp, "practice", { description: `Practice session ${sessionId}` })
      : null;

  if (session.correct_answers > 0 || session.wrong_answers > 0) {
    const deltaCorrect = session.correct_answers;
    const deltaWrong = session.wrong_answers;
    const { data: statsRow } = await db
      .from("users")
      .select("correct_answers,wrong_answers")
      .eq("id", userId)
      .single<{ correct_answers: number; wrong_answers: number }>();
    if (statsRow) {
      await db
        .from("users")
        .update({
          correct_answers: statsRow.correct_answers + deltaCorrect,
          wrong_answers: statsRow.wrong_answers + deltaWrong
        })
        .eq("id", userId);
    }
  }

  await challengeService.recordActivity(userId, "correct_answers", session.correct_answers);
  await challengeService.recordActivity(userId, "practice_sessions", 1);
  await achievementService.evaluate(userId);

  return {
    ...toDto(session),
    rewardApplied: true,
    xpEarnedTotal: session.total_xp,
    level: xpResult?.level,
    leveledUp: xpResult?.leveledUp ?? false,
    unlocked: xpResult?.unlocked ?? []
  };
}

export const practiceService = { startSession, listSessions, getSession, answer, finish, toDto };
