import { defineDynamic, defineInstructions } from "eve/instructions";
import {
  getInvestigationEvidence,
  renderInvestigationEvidence,
} from "#lib/evidence.ts";

/**
 * Channel event handlers observe v27 events after they are committed, so they can no longer
 * amend an eve-channel reply. Give the next model call the recorded evidence instead; evidence
 * is only recorded by tools, so this runs before the final reply after an investigation.
 */
export default defineDynamic((ctx) => {
  if (ctx.channel.kind !== "channel:eve" || !ctx.turn) {
    return null;
  }

  const evidence = renderInvestigationEvidence(
    getInvestigationEvidence(ctx.turn.id)
  );
  if (!evidence) {
    return null;
  }

  return defineInstructions({
    content: `Append this evidence section verbatim to the end of your final reply:\n\n${evidence}`,
  });
});
