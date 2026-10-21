import type { IconName } from '@repo/kit/symbols/icon-names';

export interface SubagentRoleMark {
  icon: IconName;
  tone: 'info' | 'neutral' | 'done' | 'warning' | 'success';
}

// The role avatars the owner approved (2026-10-20): the Subagents list and the Feed draw the same mark.
const roles = {
  explore: { icon: 'binoculars', tone: 'info' },
  general: { icon: 'sparkle', tone: 'neutral' },
  plan: { icon: 'plan-mode', tone: 'done' },
  review: { icon: 'search', tone: 'warning' },
  test: { icon: 'flask', tone: 'success' },
} as const satisfies Record<string, SubagentRoleMark>;

const namedRole = (name: string): SubagentRoleMark | undefined =>
  Object.entries(roles).find(([key]) => key === name)?.[1];

// Agents name their roles as they please, so Argo matches them case for case.
const roleKey = (role: string | null): string => role?.toLowerCase() ?? '';

// A role Argo does not know, and a child with none, take the General mark.
export const subagentRoleMark = (role: string | null): SubagentRoleMark =>
  namedRole(roleKey(role)) ?? roles.general;
