import { defineSkill } from "eve/skills";
import type { SlackUserAuthLike } from "#lib/auth.ts";
import {
  type CustomSkillStore,
  getCustomSkillStore,
  getSkillLoadName,
  type StoredSkill,
} from "#lib/skills/store.ts";

function loadableSkill(skill: StoredSkill) {
  return defineSkill({
    content: skill.markdown,
    description: skill.description,
    metadata: {
      scope: skill.scope,
      source: "sre-custom-skills",
      updatedAt: skill.updatedAt,
    },
  });
}

export function buildCustomSkills(skills: readonly StoredSkill[]) {
  const entries = new Map<string, ReturnType<typeof defineSkill>>();
  for (const skill of skills) {
    entries.set(getSkillLoadName(skill.name), loadableSkill(skill));
  }

  return entries.size > 0 ? Object.fromEntries(entries) : null;
}

/** Loads plain JSON records so callers can memoize them before rebuilding Eve definitions. */
export async function loadCustomSkillRecords(
  auth: SlackUserAuthLike | null | undefined,
  store: Pick<CustomSkillStore, "list"> = getCustomSkillStore()
): Promise<StoredSkill[]> {
  const [globalResult, userResult] = await Promise.allSettled([
    Promise.resolve().then(() => store.list(null, "global")),
    Promise.resolve().then(() => store.list(auth, "user")),
  ]);
  const globalSkills =
    globalResult.status === "fulfilled" ? globalResult.value : [];
  const userSkills = userResult.status === "fulfilled" ? userResult.value : [];

  for (const [scope, result] of [
    ["global", globalResult],
    ["user", userResult],
  ] as const) {
    if (result.status === "rejected") {
      console.warn(
        "[sre/custom-skills] custom skills unavailable; continuing without them. Configure a Vercel Blob store to enable custom skills.",
        { error: result.reason, scope }
      );
    }
  }

  const entries = new Map<string, StoredSkill>();
  for (const skill of globalSkills) {
    entries.set(getSkillLoadName(skill.name), skill);
  }
  // A personal skill with the same name overrides the shared global skill.
  for (const skill of userSkills) {
    entries.set(getSkillLoadName(skill.name), skill);
  }

  return [...entries.values()];
}
