import assert from "node:assert/strict";
import test from "node:test";
import { decideFollowUp } from "./deadline_policy.ts";

test("a signing deadline inside forty-eight hours sends a follow-up", () => {
  const now = new Date("2026-09-30T18:00:00.000Z");
  assert.equal(decideFollowUp("2026-10-02", now), "send-now");
});
