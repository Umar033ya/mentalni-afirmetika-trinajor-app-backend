import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { evaluateSubmission } from "./answer.service";

describe("evaluateSubmission", () => {
  it("rejects client-only correctness flags when the server has no trusted operands", () => {
    const result = evaluateSubmission({
      answer: 15,
      claimedIsCorrect: true,
      operation: "addition"
    });

    assert.deepEqual(result, {
      isCorrect: false,
      verifiedByServer: false
    });
  });

  it("verifies answers from trusted operands server-side", () => {
    const result = evaluateSubmission({
      answer: 12,
      operands: [5, 7],
      operation: "addition"
    });

    assert.deepEqual(result, {
      isCorrect: true,
      verifiedByServer: true
    });
  });
});
