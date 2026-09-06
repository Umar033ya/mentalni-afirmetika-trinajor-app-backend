import { ANSWER_GRACE_MS, EARLY_ANSWER_TOLERANCE, MIN_RESPONSE_TIME_MS, TOTAL_TIME_TOLERANCE } from "../../config/constants";
import { AppError } from "../../utils/response";

export interface EvaluationResult {
  isCorrect: boolean;
  verifiedByServer: boolean;
}

function foldOperands(operands: number[], operation: string): number | null {
  if (operands.length === 0) return null;
  switch (operation) {
    case "addition":
      return operands.reduce((a, b) => a + b, 0);
    case "multiplication":
      return operands.reduce((a, b) => a * b, 1);
    case "subtraction":
      return operands.slice(1).reduce((acc, v) => acc - v, operands[0]);
    case "division": {
      const result = operands.slice(1).reduce((acc, v) => (v === 0 ? Number.NaN : acc / v), operands[0]);
      return Number.isFinite(result) ? result : null;
    }
    default:
      return null;
  }
}

/**
 * Server-authoritative answer checking.
 *
 * The client may include operands or a claimed flag, but only a server-side
 * recomputation of the real equation is trusted. Without a trusted computation,
 * correctness must default to false instead of accepting the client value.
 */
export function evaluateSubmission(input: {
  answer: number;
  claimedIsCorrect?: boolean;
  operands?: number[];
  operation?: string;
}): EvaluationResult {
  if (input.operands && input.operands.length > 0 && input.operation) {
    const expected = foldOperands(input.operands, input.operation);
    if (expected !== null && Number.isFinite(expected)) {
      return { isCorrect: Math.abs(expected - input.answer) < 1e-9, verifiedByServer: true };
    }
  }

  return { isCorrect: false, verifiedByServer: false };
}

export function assertNotImpossibleResponseTime(responseTimeMs: number | undefined): void {
  if (responseTimeMs !== undefined && responseTimeMs < MIN_RESPONSE_TIME_MS) {
    throw new AppError(
      422,
      "IMPOSSIBLE_RESPONSE_TIME",
      `Answer submitted faster than physically possible (< ${MIN_RESPONSE_TIME_MS}ms)`
    );
  }
}

/** Rejects answers that arrive before the player could plausibly reach this question. */
export function assertNotTooEarly(elapsedSinceStartMs: number, questionNumber: number, timePerQuestionMs: number): void {
  const earliest = (questionNumber - 1) * timePerQuestionMs * EARLY_ANSWER_TOLERANCE;
  if (elapsedSinceStartMs < earliest - ANSWER_GRACE_MS) {
    throw new AppError(422, "ANSWER_TOO_EARLY", "Answer submitted before the question was available");
  }
}

/** Rejects answers arriving after the whole session could have ended (+ tolerance & grace). */
export function assertNotAfterDeadline(
  elapsedSinceStartMs: number,
  totalQuestions: number,
  timePerQuestionMs: number
): void {
  const deadline = totalQuestions * timePerQuestionMs * TOTAL_TIME_TOLERANCE + ANSWER_GRACE_MS;
  if (elapsedSinceStartMs > deadline) {
    throw new AppError(422, "ANSWER_TOO_LATE", "Time for answering has expired");
  }
}
