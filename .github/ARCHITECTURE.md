# Architecture

## Project identification

- Name is **eve-sre-agent-template**.
- License is MIT.
- Maintained by Vercel Labs.
- Built on the [eve](https://eve.dev) agent framework.

## Overview

sre is a Slack incident response agent. It investigates production issues with evidence from Datadog, GitHub, and Slack. Investigations start from a Slack mention or direct message, from a watched channel message, or from a `POST /v1/investigate` webhook call. The agent records typed evidence for each finding and renders it in the Slack reply.

## Directory map

```text
agent/
  agent.ts            Model, context window, and reasoning configuration
  channels/           Trigger surfaces
    slack.ts          Mentions, DMs, and channel watch (optional)
    webhook.ts        POST /v1/investigate
    eve.ts            Local development channel
  connections/        Datadog and Vercel MCP connections
  extensions/         GitHub tools extension
  instructions/       System instructions and date context
  tools/              Evidence, Slack read, Datadog link, watch, and skill tools
  skills/             Built-in investigation skills
    custom.ts         Custom skills loader (optional, needs Blob)
  lib/                Shared logic
    auth/             Slack user auth helpers
    channel-watch/    Watchlist store and admission (optional, needs Blob)
    investigation/    Evidence, rendering, and webhook session logic
    skills/           Custom skill store (optional, needs Blob)
    slack/            Message parsing helpers
    vendors/          Blob and Datadog helpers
    webhooks/         Webhook auth and request parsing
```

Channel watch and custom skills are optional. Both need the private Vercel Blob store. The rest of the agent works without Blob.

## Core components

| Component        | Location                    | Purpose                                               |
| ---------------- | --------------------------- | ----------------------------------------------------- |
| Agent definition | `agent/agent.ts`            | Selects the model and reasoning effort.               |
| Slack channel    | `agent/channels/slack.ts`   | Handles mentions, DMs, and watched channel messages.  |
| Webhook channel  | `agent/channels/webhook.ts` | Accepts `POST /v1/investigate` and starts Slack runs. |
| Instructions     | `agent/instructions/`       | Defines identity, rules, and tool guidance.           |
| Evidence system  | `agent/lib/investigation/`  | Records findings and renders them as Block Kit cards. |
| Channel watch    | `agent/lib/channel-watch/`  | Admits top-level messages from watched channels.      |
| Custom skills    | `agent/lib/skills/`         | Stores user and global runbooks in Blob.              |
| Connectors       | `agent/lib/constants.ts`    | Resolves Slack, GitHub, Datadog, and Vercel connector UIDs. |
