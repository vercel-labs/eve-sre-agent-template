import { defineDynamic, defineInstructions } from "eve/instructions";

const SLACK_EVIDENCE_DELIVERY =
  "Recorded evidence is appended to the completed Slack reply automatically. Cite key claims inline; do not repeat the evidence list in the answer.";

const DIRECT_EVIDENCE_DELIVERY =
  "Recorded evidence is not appended automatically in this channel. Cite each recorded source link in your answer.";

export function evidenceDeliveryInstruction(channelKind: string): string {
  return channelKind === "channel:slack"
    ? SLACK_EVIDENCE_DELIVERY
    : DIRECT_EVIDENCE_DELIVERY;
}

export default defineDynamic((ctx) =>
  defineInstructions({
    content: evidenceDeliveryInstruction(ctx.channel.kind),
  })
);
