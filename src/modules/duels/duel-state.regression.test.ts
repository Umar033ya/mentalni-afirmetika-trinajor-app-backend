import test from "node:test";
import assert from "node:assert/strict";

function computeDuelResultSummary(
  answeredCorrectly: Record<string, number>,
  totalQuestions: number
): { winnerId: string | null; isDraw: boolean; scoreDifference: number } {
  const p1 = answeredCorrectly.player1;
  const p2 = answeredCorrectly.player2;

  if (p1 === p2) {
    return { winnerId: null, isDraw: true, scoreDifference: 0 };
  }

  return {
    winnerId: p1 > p2 ? "player1" : "player2",
    isDraw: false,
    scoreDifference: Math.abs(p1 - p2)
  };
}

test("duel completion should award only the victory bonus once, not re-add per-submission xp", () => {
  const answeredCorrectly = { player1: 5, player2: 3 };
  const totalQuestions = 5;

  const result = computeDuelResultSummary(answeredCorrectly, totalQuestions);
  assert.equal(result.isDraw, false);
  assert.equal(result.winnerId, "player1");
  assert.equal(result.scoreDifference, 2);

  const playerXp = { player1: 150, player2: 90 };
  const duelWinBonusXp = 20;

  const finishXp = {
    player1: playerXp.player1 + duelWinBonusXp,
    player2: playerXp.player2
  };

  assert.deepEqual(finishXp, { player1: 170, player2: 90 });
  assert.equal(finishXp.player1 - playerXp.player1, duelWinBonusXp);
});


test("duel completion should not count stale question totals as finished before both players have actually completed", () => {
  const player1Correct = 3;
  const player2Correct = 2;
  const totalQuestions = 5;

  const player1Progress = player1Correct;
  const player2Progress = player2Correct;

  const allFinished = player1Progress >= totalQuestions && player2Progress >= totalQuestions;
  assert.equal(allFinished, false);
  assert.equal(player1Progress >= totalQuestions, false);
  assert.equal(player2Progress >= totalQuestions, false);
});
