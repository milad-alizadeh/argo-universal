import type { Subagent } from '@repo/contracts';
import type { Tone } from '#primitives/content/text';
import type { IconName } from '#lib/generic/symbols/icon-names';

export type SubagentRole = {
  name: 'Explore' | 'Plan' | 'Review' | 'Test' | 'General';
  icon: IconName;
  tone: Tone;
};

// Paper "Components / SubagentRow": each role's avatar glyph and tint.
const roles = new Map<string, SubagentRole>([
  ['explore', { name: 'Explore', icon: 'binoculars', tone: 'info' }],
  ['plan', { name: 'Plan', icon: 'plan-mode', tone: 'done' }],
  ['review', { name: 'Review', icon: 'search', tone: 'warning' }],
  ['test', { name: 'Test', icon: 'flask', tone: 'success' }],
]);

const general: SubagentRole = {
  name: 'General',
  icon: 'sparkle',
  tone: 'neutral',
};

const roleKey = (role: Subagent['role']): string =>
  role === null ? '' : role.trim().toLowerCase();

// The Agent names a Subagent's role freely; one Argo does not know, or none, reads as General.
export const subagentRole = (subagent: Pick<Subagent, 'role'>): SubagentRole =>
  roles.get(roleKey(subagent.role)) ?? general;
