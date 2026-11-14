import type { Subagent } from '@repo/contracts';
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
const normalisedRole = (role: string | null): string =>
  role?.trim().toLowerCase() ?? '';

const roleKey = (role: string | null): string => {
  const key = normalisedRole(role);

  return key === 'general-purpose' ? 'general' : key;
};

// A role Argo does not know, and a child with none, take the General mark.
export const subagentRoleMark = (role: string | null): SubagentRoleMark =>
  namedRole(roleKey(role)) ?? roles.general;

// What assistive technology calls an Agent's mark, wherever it is drawn.
export const subagentMarkLabel = (role: string | null): string =>
  `${role ?? 'General'} Agent`;

const statusMarks = {
  running: { tone: 'success', label: 'Running' },
  requires_action: { tone: 'warning', label: 'Needs input' },
  idle: undefined,
} as const;

type AgentMark = SubagentRoleMark & {
  label: string;
  dimmed: boolean;
  status: { tone: 'success' | 'warning'; label: string } | undefined;
};

// Both Agent row renderers use the same role, status and emphasis.
export function subagentMarkDescriptor(subagent: Subagent): AgentMark {
  return {
    ...subagentRoleMark(subagent.role),
    label: subagentMarkLabel(subagent.role),
    status: statusMarks[subagent.state],
    dimmed: subagent.state === 'idle',
  };
}
