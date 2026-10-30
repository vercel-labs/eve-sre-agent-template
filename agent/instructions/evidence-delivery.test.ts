import assert from "node:assert/strict";
import test from "node:test";
import { evidenceDeliveryInstruction } from "./evidence-delivery.ts";

test("Slack delegates source serialization to the completed-reply renderer", () => {
  assert.equal(
    evidenceDeliveryInstruction("channel:slack"),
    "Recorded evidence is appended to the completed Slack reply automatically. Cite key claims inline; do not repeat the evidence list in the answer."
  );
});

test("the eve channel requires source links in the model reply", () => {
  assert.equal(
    evidenceDeliveryInstruction("channel:eve"),
    "Recorded evidence is not appended automatically in this channel. Cite each recorded source link in your answer."
  );
});
