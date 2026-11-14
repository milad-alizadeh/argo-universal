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

// Agents name their roles as they please, so Argo matches them case for case.
const normalisedRole = (role: string | null): string =>
  role?.trim().toLowerCase() ?? '';

const roleKey = (role: string | null): string => {
  const key = normalisedRole(role);

  return key === 'general-purpose' ? 'general' : key;
};

// The Agent's own words for itself: the role it reports, and its title.
export type AgentIdentity = Pick<Subagent, 'role' | 'title'>;

type RoleName = keyof typeof roles;

// Own keys only, so `constructor` and the like are no role.
const isRoleName = (key: string): key is RoleName =>
  Object.keys(roles).includes(key);

// The words in a title that name a role; the spawn tool cannot set one, so a title is all many children carry (#2075).
const roleWords: [RoleName, RegExp][] = [
  ['explore', /\bexplor(?:e|er|ing|ation)\b/i],
  ['plan', /\bplan(?:s|ner|ning)?\b/i],
  ['review', /\breview(?:s|er|ing)?\b/i],
  ['test', /\btest(?:s|er|ing)?\b/i],
];

interface RoleWordAt {
  role: RoleName;
  at: number;
}

const roleWordAt =
  (title: string) =>
  ([role, word]: [RoleName, RegExp]): RoleWordAt[] => {
    const at = word.exec(title)?.index;

    return at === undefined ? [] : [{ role, at }];
  };

// The first role a title names; the guess draws a mark only and never becomes the child's role.
const guessedRole = (title: string): RoleName | undefined =>
  roleWords
    .flatMap(roleWordAt(title))
    .sort((first, second) => first.at - second.at)[0]?.role;

const capitalised = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

const markRole = ({ role, title }: AgentIdentity): RoleName => {
  const reported = roleKey(role);

  if (isRoleName(reported)) return reported;

  return guessedRole(title) ?? 'general';
};

export const subagentRoleMark = (agent: AgentIdentity): SubagentRoleMark =>
  roles[markRole(agent)];

// What assistive technology calls an Agent's mark, wherever it is drawn: the role it reports, else the one its mark shows.
export const subagentMarkLabel = (agent: AgentIdentity): string =>
  `${agent.role?.trim() || capitalised(markRole(agent))} Agent`;

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
    ...subagentRoleMark(subagent),
    label: subagentMarkLabel(subagent),
    status: statusMarks[subagent.state],
    dimmed: subagent.state === 'idle',
  };
}
