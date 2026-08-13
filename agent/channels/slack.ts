import { connectSlackCredentials } from "@vercel/connect/eve";
import {
  defaultSlackAuth,
  type SlackChannelEvents,
  type SlackInboundMessageContext,
  type SlackMessage,
  slackChannel,
} from "eve/channels/slack";
import { createServiceAuth } from "#lib/auth.ts";
import {
  admitChannelWatchMessage,
  type ChannelWatchMessage,
} from "#lib/channel-watch/admit.ts";
import { getChannelWatchStore } from "#lib/channel-watch/store.ts";
import { SLACK_CONNECTOR } from "#lib/constants.ts";
import { getInvestigationEvidence } from "#lib/evidence.ts";
import { buildInvestigationResultMessage } from "#lib/slack/investigation-rendering.ts";

const slackCredentials = connectSlackCredentials(SLACK_CONNECTOR);
const LINE_SPLIT = /\r?\n/u;

/**
 * Shared mention/DM handler. Eve's defaults for both hooks do exactly two things
 * (post "Thinking..." and derive auth via defaultSlackAuth); eve does not export those
 * default functions, so this restates them.
 */
async function respondToInboundMessage(
  ctx: SlackInboundMessageContext,
  message: SlackMessage
) {
  await ctx.thread.startTyping("Thinking...").catch(console.error);
  return { auth: defaultSlackAuth(message, ctx) };
}

function toChannelWatchMessage(
  message: SlackMessage
): ChannelWatchMessage | null {
  const rawTeamId = message.raw.team;
  const teamId =
    message.teamId ?? (typeof rawTeamId === "string" ? rawTeamId : undefined);
  if (!(teamId && message.channelId && message.ts)) {
    return null;
  }

  const rawSubtype = message.raw.subtype;
  return {
    author: channelWatchAuthor(message.author),
    channelId: message.channelId,
    subtype: typeof rawSubtype === "string" ? rawSubtype : undefined,
    teamId,
    threadTs: message.threadTs,
    ts: message.ts,
    visibleText: message.markdown,
  };
}

function buildChannelWatchContext(): string[] {
  return [
    "You are responding to a message in a channel that you are responsible for watching.",
    "Determine if the current message warrants an investigation. If it does, load the `deep-investigation` skill and follow it. If it clearly needs no investigation, reply with one short sentence saying why.",
  ];
}

/** Authorless bot_message posts have no Slack user; defaultSlackAuth returns null for those. */
function channelWatchServiceAuth(watched: ChannelWatchMessage) {
  return createServiceAuth({
    authenticator: "channel-watch",
    principalId: `${watched.teamId}:${watched.channelId}:${watched.ts}`,
  });
}

function channelWatchAuthor(
  author: SlackMessage["author"]
): ChannelWatchMessage["author"] {
  if (!author) {
    return { kind: "missing" };
  }
  if (author.isMe) {
    return { kind: "self" };
  }
  return { isBot: author.isBot, kind: "other" };
}

function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split(LINE_SPLIT)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Replaces eve's default message.completed handler so terminal answers with recorded
 * evidence render as Block Kit cards instead of plain text. Everything before the post
 * mirrors the default's contract exactly: buffer the model's pre-tool narration in
 * pendingToolCallMessage (the default actions.requested handler shows it as the typing
 * indicator), clear it on terminal messages, and keep typing when there is no text.
 */
const investigationMessageCompleted: NonNullable<
  SlackChannelEvents["message.completed"]
> = async (data, ctx) => {
  if (data.finishReason === "tool-calls") {
    ctx.state.pendingToolCallMessage = data.message
      ? firstNonEmptyLine(data.message)
      : null;
    return;
  }

  ctx.state.pendingToolCallMessage = null;

  if (!data.message) {
    await ctx.thread.startTyping().catch(console.error);
    return;
  }

  const evidence = getInvestigationEvidence(data.turnId);

  try {
    if (evidence.length > 0) {
      await ctx.thread.post(
        buildInvestigationResultMessage(data.message, evidence)
      );
    } else {
      await ctx.thread.post(data.message);
    }
  } catch (error) {
    // A rejected post (e.g. invalid blocks) must not fail the turn; the evidence list
    // remains available via evidence_list even when this delivery is lost.
    console.error("[sre/slack] failed to post investigation answer", {
      error: error instanceof Error ? error.message : String(error),
      evidenceCount: evidence.length,
      turnId: data.turnId,
    });
  }
};

export default slackChannel({
  botName: "sre",
  credentials: slackCredentials,

  events: {
    // Replaces only eve's default message.completed; all other event defaults still run.
    "message.completed": investigationMessageCompleted,
  },

  onAppMention: respondToInboundMessage,

  // Eve selects DMs as onDirectMessage ?? onMessage. Omit this hook and DMs hit the watchlist.
  onDirectMessage: respondToInboundMessage,

  // Channel watch has no eve default to lean on: non-mention channel messages are ignored
  // unless an onMessage hook exists. Admitted messages start an autonomous investigation.
  async onMessage(ctx, message) {
    const watched = toChannelWatchMessage(message);
    if (!watched) {
      return null;
    }

    const admission = await admitChannelWatchMessage(
      watched,
      getChannelWatchStore()
    );
    if (admission.kind === "drop") {
      return null;
    }

    await ctx.thread.startTyping("Thinking...").catch(console.error);
    const auth = message.author
      ? defaultSlackAuth(message, ctx)
      : channelWatchServiceAuth(admission.message);
    if (!auth) {
      return null;
    }
    return {
      auth,
      context: buildChannelWatchContext(),
      title: admission.title,
    };
  },
});
