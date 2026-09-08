import { db } from "../../config/database";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { GenerationConfig } from "../../types/question.types";
import {
  ANSWER_GRACE_MS,
  DUEL_WAITING_TTL_MS,
  EARLY_ANSWER_TOLERANCE,
  MIN_RESPONSE_TIME_MS,
  TOTAL_TIME_TOLERANCE,
  DEFAULT_RATING
} from "../../config/constants";
import { xpForCorrectAnswer } from "../../utils/xp";
import type { Difficulty } from "../../types/question.types";
import type {
  AnswerRequestPayload,
  AnswerResult,
  DuelPlayerRow,
  DuelRow,
  LobbyDuelItem
} from "./duel.types";
import {
  advanceToOngoingIfDue,
  buildStateResponse,
  computeSchedule,
  duelConfigFrom,
  duelStateService,
  loadPlayers,
  maybeFinalize
} from "./duel-state.service";
import { evaluateSubmission } from "../answers/answer.service";
import { notificationService } from "../notifications/notification.service";
import { userService } from "../users/user.service";
import type { CreateDuelPayload } from "./duel.validation";

const DETERMINISTIC_OPERATIONS = ["addition", "subtraction", "multiplication", "division"] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function computeExpectedAnswer(operands: number[], operation: string): number {
  if (operands.length === 0) return 0;
  switch (operation) {
    case "addition":
      return operands.reduce((sum, value) => sum + value, 0);
    case "subtraction":
      return operands.slice(1).reduce((acc, value) => acc - value, operands[0]);
    case "multiplication":
      return operands.reduce((product, value) => product * value, 1);
    case "division": {
      const quotient = operands.slice(1).reduce((acc, value) => (value === 0 ? Number.NaN : acc / value), operands[0]);
      return Number.isFinite(quotient) ? quotient : 0;
    }
    default:
      return operands[0] ?? 0;
  }
}

function buildOperands(
  operation: string,
  digitCount: number,
  rows: number,
  rng: () => number,
  numberType: string = "oddiy"
): number[] {
  const operandCount = Math.max(2, Math.min(rows, 8));
  const maxValue = 10 ** digitCount - 1;

  switch (operation) {
    case "addition":
      if (numberType === "kichik") {
        return Array.from({ length: operandCount }, () => randInt(rng, 1, Math.min(9, maxValue)));
      }
      if (numberType === "katta") {
        const min = Math.max(1, Math.floor(maxValue / 2));
        return Array.from({ length: operandCount }, () => randInt(rng, min, maxValue));
      }
      // 'dost' - prefer smaller friendly numbers
      if (numberType === "dost") {
        return Array.from({ length: operandCount }, () => randInt(rng, 1, Math.min(20, maxValue)));
      }
      return Array.from({ length: operandCount }, () => randInt(rng, 1, maxValue));
    case "subtraction": {
      const start = randInt(rng, 1, maxValue);
      const remaining = Array.from({ length: operandCount - 1 }, () =>
        randInt(rng, 0, Math.min(start, maxValue))
      );
      return [start, ...remaining];
    }
    case "multiplication":
      if (numberType === "kichik" || numberType === "dost") {
        return Array.from({ length: operandCount }, () => randInt(rng, 1, Math.max(1, Math.min(9, Math.floor(maxValue / 4)))));
      }
      return Array.from({ length: operandCount }, () => randInt(rng, 1, Math.max(1, Math.floor(maxValue / 2))));
    case "division": {
      const divisor = randInt(rng, 1, Math.max(1, Math.min(9, maxValue)));
      const quotient = randInt(rng, 1, Math.max(1, Math.min(99, maxValue)));
      return [quotient * divisor, divisor];
    }
    default:
      return [randInt(rng, 1, maxValue), randInt(rng, 1, maxValue)];
  }
}

function generateDuelQuestions(duelId: string, config: GenerationConfig) {
  const operationPool = config.operation === "mixed"
    ? [...DETERMINISTIC_OPERATIONS]
    : [config.operation];

  return Array.from({ length: config.questionCount }, (_, index) => {
    const questionNumber = index + 1;
    const operation = operationPool[questionNumber % operationPool.length];
    const rng = mulberry32(hashString(`${duelId}:${questionNumber}`));
    const operands = buildOperands(operation, config.digitCount, config.rows, rng, (config as any).numberType);
    const answer = computeExpectedAnswer(operands, operation);

    return {
      duel_id: duelId,
      question_number: questionNumber,
      operation,
      digit_count: config.digitCount,
      rows: config.rows,
      operands,
      answer
    };
  });
}

const ACTIVE_STATUSES = ["WAITING", "READY", "COUNTDOWN", "ONGOING"];

async function loadDuel(duelId: string): Promise<DuelRow> {
  const { data, error } = await db.from("duels").select("*").eq("id", duelId).maybeSingle<DuelRow>();
  if (error) throw error;
  if (!data) throw new AppError(404, "DUEL_NOT_FOUND", "Duel not found");
  return data;
}

async function assertNotInActiveDuel(userId: string): Promise<void> {
  const { data } = await db
    .from("duels")
    .select("id")
    .in("status", ACTIVE_STATUSES)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .limit(1);
  if (data && data.length > 0) {
    throw new AppError(409, "ALREADY_IN_ACTIVE_DUEL", "You already have an active duel. Finish or cancel it first.");
  }
}

async function create(userId: string, payload: CreateDuelPayload) {
  await assertNotInActiveDuel(userId);

  if (payload.mode === "challenge" && payload.opponentId) {
    if (payload.opponentId === userId) {
      throw new AppError(422, "INVALID_OPPONENT", "You cannot challenge yourself");
    }
    const opponent = await userService.findRawById(payload.opponentId);
    if (!opponent) throw new AppError(404, "USER_NOT_FOUND", "Opponent not found");
  }

  const config: GenerationConfig = {
    operation: payload.operation,
    digitCount: payload.digitCount,
    rows: payload.rows,
    questionCount: payload.questionCount,
    timePerQuestionMs: payload.timePerQuestionMs,
    difficulty: payload.difficulty
    ,numberType: (payload as any).numberType ?? "oddiy"
  };

  const { data: duel, error } = await db
    .from("duels")
    .insert({
      creator_id: userId,
      status: "WAITING",
      mode: payload.mode,
      operation: config.operation,
      digit_count: config.digitCount,
      rows: config.rows,
      question_count: config.questionCount,
      time_per_question_ms: config.timePerQuestionMs,
      difficulty: config.difficulty,
      opponent_id: payload.mode === "challenge" ? payload.opponentId : null,
      number_type: (payload as any).numberType ?? "oddiy"
    })
    .select("*")
    .single<DuelRow>();
  if (error || !duel) throw error ?? new Error("Failed to create duel");

  const questionRows = generateDuelQuestions(duel.id, config);
  const { error: questionError } = await db.from("duel_questions").insert(questionRows);
  if (questionError) throw questionError;

  const { error: playerError } = await db.from("duel_players").insert({
    duel_id: duel.id,
    user_id: userId,
    seed: (payload as any).creatorSeed ?? null
  });
  if (playerError) throw playerError;

  if (payload.mode === "challenge" && payload.opponentId) {
    const creator = await userService.findRawById(userId);
    await notificationService.create({
      userId: payload.opponentId,
      type: "DUEL_CHALLENGE",
      title: "Duel challenge!",
      message: `${creator.username} challenged you to a ${config.operation} duel (${config.digitCount} digit, ${config.rows} rows)`,
      data: { duelId: duel.id }
    });
  }

  return { id: duel.id, status: duel.status, mode: duel.mode, config };
}

interface LobbyQueryOptions {
  page: PageParams;
  excludeUserId?: string;
}

async function listWaiting(page: PageParams): Promise<{ items: LobbyDuelItem[]; pagination: unknown }> {
  const cutoff = new Date(Date.now() - DUEL_WAITING_TTL_MS).toISOString();
  const { data, error, count } = await db
    .from("duels")
    .select(
      `id,status,mode,operation,digit_count,rows,question_count,time_per_question_ms,difficulty,created_at,
       creator:creator_id(id,username,level,xp,duel_rating,avatar_url,is_online,last_seen),
       duel_players(count)`,
      { count: "exact" }
    )
    .eq("status", "WAITING")
    .eq("mode", "public")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .range(page.from, page.to);

  if (error) throw error;
  const items = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    status: row.status as LobbyDuelItem["status"],
    mode: row.mode as LobbyDuelItem["mode"],
    creator: row.creator as LobbyDuelItem["creator"],
    config: {
      operation: row.operation as string,
      digitCount: row.digit_count as number,
      rows: row.rows as number,
      questionCount: row.question_count as number,
      timePerQuestionMs: row.time_per_question_ms as number,
      difficulty: row.difficulty as string
    },
    playersCount:
      Array.isArray(row.duel_players) && row.duel_players[0]
        ? Number((row.duel_players[0] as { count: number }).count)
        : 0,
    createdAt: row.created_at as string
  }));
  return { items, pagination: buildPaginationMeta(page, count) };
}

async function listByStatus(status: string[], page: PageParams) {
  const { data, error, count } = await db
    .from("duels")
    .select("*", { count: "exact" })
    .in("status", status)
    .order("created_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return {
    items: (data ?? []) as DuelRow[],
    pagination: buildPaginationMeta(page, count)
  };
}

async function listCompleted(scope: "mine" | "all", userId: string, page: PageParams) {
  let query = db
    .from("duels")
    .select("*", { count: "exact" })
    .eq("status", "COMPLETED");

  if (scope === "mine") {
    query = query.or(`creator_id.eq.${userId},opponent_id.eq.${userId}`);
  }

  const { data, error, count } = await query
    .order("finished_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return { items: (data ?? []) as DuelRow[], pagination: buildPaginationMeta(page, count) };
}

async function getState(duelId: string, userId: string) {
  let duel = await loadDuel(duelId);
  duel = await advanceToOngoingIfDue(duel);
  duel = await maybeFinalize(duel);

  const players = await loadPlayers(duelId);
  if (!players.some((p) => p.user_id === userId)) {
    // Spectators may only view completed duels.
    if (duel.status !== "COMPLETED") {
      throw new AppError(403, "NOT_A_PARTICIPANT", "You are not part of this duel");
    }
  }
  return buildStateResponse(duel, players, userId);
}

/** Second player joins; atomically transitions WAITING -> READY and schedules the synchronized start. */
export async function join(duelId: string, userId: string, payload?: { seed?: string; numberType?: string }) {
  const duel = await loadDuel(duelId);
  if (payload?.numberType && (duel as any).number_type && payload.numberType !== (duel as any).number_type) {
    throw new AppError(422, "NUMBER_TYPE_MISMATCH", "Provided numberType does not match duel configuration");
  }
  if (duel.status !== "WAITING") {
    throw new AppError(409, "DUEL_NOT_JOINABLE", `Duel is not joinable (status: ${duel.status})`);
  }
  if (duel.creator_id === userId) {
    throw new AppError(422, "OWN_DUEL", "You cannot join your own duel");
  }
  if (duel.mode === "challenge" && duel.opponent_id && duel.opponent_id !== userId) {
    throw new AppError(403, "NOT_INVITED", "This duel was challenged to another player");
  }

  await assertNotInActiveDuel(userId);

  const schedule = computeSchedule(duel.question_count, duel.time_per_question_ms);
  const { data: claimed, error: claimError } = await db
    .from("duels")
    .update({
      opponent_id: userId,
      status: "READY",
      start_at: schedule.startAt,
      ends_at: schedule.endsAt
    })
    .eq("id", duelId)
    .eq("status", "WAITING")
    .neq("creator_id", userId)
    .select("*")
    .maybeSingle<DuelRow>();

  if (claimError) throw claimError;
  if (!claimed) {
    throw new AppError(409, "DUEL_ALREADY_JOINED", "Someone else already joined this duel");
  }

  const { error: insertError } = await db.from("duel_players").insert({
    duel_id: duelId,
    user_id: userId,
    seed: payload?.seed ?? null
  });
  if (insertError) throw insertError;

  await notificationService.createMany([
    {
      userId: claimed.creator_id,
      type: "DUEL_ACCEPTED",
      title: "Duel accepted!",
      message: "Your duel has an opponent. Get ready!",
      data: { duelId }
    },
    {
      userId,
      type: "DUEL_STARTED",
      title: "Duel starting",
      message: "Get ready! The duel starts in a few seconds.",
      data: { duelId }
    }
  ]);

  return getState(duelId, userId);
}

async function accept(duelId: string, userId: string) {
  const duel = await loadDuel(duelId);
  if (duel.mode !== "challenge") {
    throw new AppError(422, "NOT_A_CHALLENGE", "Accept is only used for challenge duels. Use join instead.");
  }
  return join(duelId, userId);
}

export async function decline(duelId: string, userId: string) {
  const duel = await loadDuel(duelId);
  if (duel.status !== "WAITING") {
    throw new AppError(409, "DUEL_NOT_DECLINABLE", "Only waiting duels can be declined");
  }
  if (duel.mode !== "challenge" || duel.opponent_id !== userId) {
    throw new AppError(403, "NOT_INVITED", "This challenge was not sent to you");
  }

  const { error } = await db
    .from("duels")
    .update({ status: "DECLINED" })
    .eq("id", duelId)
    .eq("status", "WAITING");
  if (error) throw error;

  await notificationService.create({
    userId: duel.creator_id,
    type: "DUEL_DECLINED",
    title: "Challenge declined",
    message: "Your duel challenge was declined.",
    data: { duelId }
  });

  return { declined: true };
}

export async function cancel(duelId: string, userId: string) {
  const duel = await loadDuel(duelId);
  if (duel.creator_id !== userId) {
    throw new AppError(403, "NOT_CREATOR", "Only the creator can cancel a duel");
  }
  if (duel.status !== "WAITING") {
    throw new AppError(409, "DUEL_NOT_CANCELLABLE", "Only waiting duels can be cancelled");
  }

  const { error } = await db
    .from("duels")
    .update({ status: "CANCELLED" })
    .eq("id", duelId)
    .eq("status", "WAITING");
  if (error) throw error;

  if (duel.opponent_id) {
    await notificationService.create({
      userId: duel.opponent_id,
      type: "SYSTEM",
      title: "Duel cancelled",
      message: "The duel you were invited to was cancelled.",
      data: { duelId }
    });
  }

  return { cancelled: true };
}

export interface DuelAnswerInput extends AnswerRequestPayload {}

export async function submitAnswer(duelId: string, userId: string, input: DuelAnswerInput): Promise<AnswerResult> {
  let duel = await loadDuel(duelId);

  if (duel.status === "READY") {
    duel = await advanceToOngoingIfDue(duel);
  }

  if (duel.status === "ONGOING") {
    duel = await maybeFinalize(duel);
  }

  if (duel.status !== "ONGOING") {
    throw new AppError(409, "DUEL_NOT_ONGOING", `Duel is not ongoing (status: ${duel.status})`);
  }
  if (!duel.start_at) {
    throw new AppError(409, "DUEL_NOT_STARTED", "Duel has not started yet");
  }

  const myPlayersRes = await db
    .from("duel_players")
    .select("*")
    .eq("duel_id", duelId)
    .eq("user_id", userId)
    .maybeSingle<DuelPlayerRow>();
  const me = myPlayersRes.data;
  if (!me) throw new AppError(403, "NOT_A_PARTICIPANT", "You are not part of this duel");
  if (me.finished_at) throw new AppError(409, "PLAYER_FINISHED", "You already answered all questions");

  if (input.questionNumber > duel.question_count) {
    throw new AppError(422, "INVALID_QUESTION_NUMBER", "Question number is out of range");
  }

  const elapsedSinceStart = Date.now() - new Date(duel.start_at).getTime();
  if (elapsedSinceStart < -(ANSWER_GRACE_MS / 2)) {
    throw new AppError(422, "ANSWER_TOO_EARLY", "The duel has not started yet");
  }
  if (input.questionNumber > 1) {
    const earliest =
      (input.questionNumber - 1) * duel.time_per_question_ms * EARLY_ANSWER_TOLERANCE - ANSWER_GRACE_MS;
    if (elapsedSinceStart < earliest) {
      throw new AppError(422, "ANSWER_TOO_EARLY", "Answer submitted before the question was available");
    }
  }
  const deadline =
    duel.question_count * duel.time_per_question_ms * TOTAL_TIME_TOLERANCE + ANSWER_GRACE_MS * 2;
  if (elapsedSinceStart > deadline) {
    throw new AppError(422, "ANSWER_TOO_LATE", "Time for answering has expired");
  }
  const responseTimeMs = input.responseTimeMs ?? input.clientTimeMs ?? undefined;
  if (responseTimeMs !== undefined && responseTimeMs < MIN_RESPONSE_TIME_MS) {
    throw new AppError(422, "IMPOSSIBLE_RESPONSE_TIME", "Answer submitted faster than physically possible");
  }

  // Compute expected answer deterministically per-player using optional per-player seed.
  // Load player row to access seed (we already fetched `me` above).
  const playerSeed = (me as any).seed ?? null;
  const numberType = (duel as any).number_type ?? "oddiy";
  const rngSeed = playerSeed ? `${duelId}:${me.user_id}:${playerSeed}:${input.questionNumber}` : `${duelId}:${input.questionNumber}`;
  const rng = mulberry32(hashString(rngSeed));
  const operationPool = duel.operation === "mixed" ? [...DETERMINISTIC_OPERATIONS] : [duel.operation];
  const operation = operationPool[input.questionNumber % operationPool.length];
  const operands = buildOperands(operation, duel.digit_count, duel.rows, rng, numberType);
  const expected = computeExpectedAnswer(operands, operation);
  const evaluation = { isCorrect: Math.abs(Number(expected) - input.answer) < 1e-9, verifiedByServer: true };

  const previousAnswersRes = await db
    .from("duel_answers")
    .select("question_number")
    .eq("duel_id", duelId)
    .eq("user_id", userId)
    .order("question_number", { ascending: true });
  const answeredNumbers = new Set((previousAnswersRes.data ?? []).map((row) => Number(row.question_number)));
  if (answeredNumbers.has(input.questionNumber)) {
    throw new AppError(409, "DUPLICATE_ANSWER", "You already answered this question");
  }
  for (let questionNumber = 1; questionNumber < input.questionNumber; questionNumber += 1) {
    if (!answeredNumbers.has(questionNumber)) {
      throw new AppError(422, "QUESTION_OUT_OF_ORDER", "Answer questions in order");
    }
  }

  const xpReward = evaluation.isCorrect ? xpForCorrectAnswer(duel.difficulty as Difficulty) : 0;

  const rpcRes = await db.rpc("record_duel_answer", {
    p_duel_id: duelId,
    p_user_id: userId,
    p_question_number: input.questionNumber,
    p_answer: input.answer,
    p_is_correct: evaluation.isCorrect,
    p_verified: evaluation.verifiedByServer,
    p_response_time_ms: responseTimeMs ?? null,
    p_xp_reward: xpReward
  });
  const inserted = (rpcRes.data as Array<{ inserted: boolean }> | null)?.[0]?.inserted ?? false;
  if (rpcRes.error) throw rpcRes.error;
  if (!inserted) {
    throw new AppError(409, "DUPLICATE_ANSWER", "You already answered this question");
  }

  const answeredCount = me.correct_answers + me.wrong_answers + 1;
  const finished = answeredCount >= duel.question_count;
  if (finished) {
    await db
      .from("duel_players")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", me.id);
  }

  const refreshed = await loadDuel(duelId);
  await maybeFinalize(refreshed);

  return {
    isCorrect: evaluation.isCorrect,
    verifiedByServer: evaluation.verifiedByServer,
    score: evaluation.isCorrect ? me.score + 1 : me.score,
    xpEarned: xpReward,
    nextQuestion: finished ? null : input.questionNumber + 1,
    duelFinished: finished
  };
}

async function getById(duelId: string) {
  const duel = await loadDuel(duelId);
  const players = await loadPlayers(duelId).then((rows) =>
    rows.map((p) => ({
      userId: p.user_id,
      username: p.user?.username ?? null,
      level: p.user?.level ?? null,
      score: p.score,
      correctAnswers: p.correct_answers,
      wrongAnswers: p.wrong_answers,
      totalXp: p.total_xp,
      finished: p.finished_at !== null
    }))
  );
  return { ...duel, config: duelConfigFrom(duel), players };
}

export const duelService = {
  create,
  join,
  accept,
  decline,
  cancel,
  submitAnswer,
  getState,
  getById,
  listWaiting,
  listByStatus,
  listCompleted,
  assertNotInActiveDuel,
  loadDuel
};
