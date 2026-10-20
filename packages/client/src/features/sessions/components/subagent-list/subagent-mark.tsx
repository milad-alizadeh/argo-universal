import type { Subagent } from '@repo/contracts';
import type { ComponentProps, JSX } from 'react';
import { TintedAvatar } from '../../../../lib/generic/tinted-avatar';

type Mark = Pick<ComponentProps<typeof TintedAvatar>, 'icon' | 'tone'>;

const roles = {
  explore: { icon: 'binoculars', tone: 'info' },
  general: { icon: 'sparkle', tone: 'neutral' },
  plan: { icon: 'plan-mode', tone: 'done' },
  review: { icon: 'search', tone: 'warning' },
  test: { icon: 'flask', tone: 'success' },
} satisfies Record<string, Mark>;

const namedRole = (name: string): Mark | undefined =>
  Object.entries(roles).find(([key]) => key === name)?.[1];

const normalizedRole = (role: Subagent['role']): string =>
  role?.toLowerCase() ?? '';

const roleMark = (role: Subagent['role']): Mark =>
  namedRole(normalizedRole(role)) ?? roles.general;

const statuses = {
  running: { tone: 'success', accessibilityLabel: 'Running' },
  requires_action: { tone: 'warning', accessibilityLabel: 'Needs input' },
  idle: undefined,
} as const;

export function SubagentMark({
  subagent,
}: {
  subagent: Subagent;
}): JSX.Element {
  return (
    <TintedAvatar
      {...roleMark(subagent.role)}
      dimmed={subagent.state === 'idle'}
      status={statuses[subagent.state]}
    />
  );
}
