import test from "node:test";
import assert from "node:assert/strict";

import { isAuthorizedDuelParticipant } from "./socket";

test("authorized duel participant is allowed to join a duel room", () => {
  const authorized = isAuthorizedDuelParticipant("user-1", { creator_id: "user-1", opponent_id: "user-2" });
  assert.equal(authorized, true);
});

test("unauthorized non-participant cannot join a duel room", () => {
  const authorized = isAuthorizedDuelParticipant("user-3", { creator_id: "user-1", opponent_id: "user-2" });
  assert.equal(authorized, false);
});
