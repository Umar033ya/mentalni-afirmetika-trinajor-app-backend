import { CLOSE_MATCH_DIVIDER, DEFAULT_RATING, RATING_FLOOR, RATING_K_FACTOR } from "../config/constants";

export interface RatingResult {
  oldRating: number;
  newRating: number;
  delta: number;
}

function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function clampRating(rating: number): number {
  return Math.max(RATING_FLOOR, Math.round(rating));
}

export interface EloInput {
  playerRating: number;
  opponentRating: number;
  outcome: "win" | "loss" | "draw";
  scoreDifference: number;
}

export function calculateElo({
  playerRating,
  opponentRating,
  outcome,
  scoreDifference
}: EloInput): RatingResult {
  const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  const expected = expectedScore(playerRating, opponentRating);
  let k = RATING_K_FACTOR;

  if (playerRating < DEFAULT_RATING) k = RATING_K_FACTOR * 1.5;

  let delta = Math.round(k * (score - expected));
  if (Math.abs(scoreDifference) <= 1 && scoreDifference >= 0) {
    delta = Math.round(delta / CLOSE_MATCH_DIVIDER);
  }

  return {
    oldRating: playerRating,
    newRating: clampRating(playerRating + delta),
    delta
  };
}

export function initialRating(): number {
  return DEFAULT_RATING;
}
