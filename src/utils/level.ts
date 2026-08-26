import { LEVEL_BASE_REQUIREMENTS, LEVEL_GROWTH, MAX_LEVEL } from "../config/constants";

let cachedThresholds: number[] | null = null;

export function requirementForLevel(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return Number.POSITIVE_INFINITY;
  if (level <= LEVEL_BASE_REQUIREMENTS.length) return LEVEL_BASE_REQUIREMENTS[level - 1];
  return Math.round(requirementForLevel(level - 1) * LEVEL_GROWTH);
}

function buildThresholds(): number[] {
  const cumulative: number[] = [0];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    cumulative.push(cumulative[level - 1] + requirementForLevel(level));
  }
  return cumulative;
}

function thresholds(): number[] {
  if (!cachedThresholds) cachedThresholds = buildThresholds();
  return cachedThresholds;
}

export function xpRequiredForLevel(level: number): number {
  const req = requirementForLevel(level);
  return req === Number.POSITIVE_INFINITY ? 0 : req;
}

export function totalXpForLevel(level: number): number {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  return thresholds()[clamped];
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

export function levelInfoFromTotalXp(totalXp: number): LevelInfo {
  const list = thresholds();
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= list[level]) {
    level++;
  }
  const currentFloor = list[level - 1];
  const nextFloor = level >= MAX_LEVEL ? currentFloor : list[level];
  const xpIntoLevel = totalXp - currentFloor;
  const xpForNextLevel = level >= MAX_LEVEL ? 0 : nextFloor - currentFloor;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent:
      level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((xpIntoLevel / Math.max(1, xpForNextLevel)) * 100)),
    isMaxLevel: level >= MAX_LEVEL
  };
}
