import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { TintedAvatar } from '../../../../lib/generic/tinted-avatar';
import { subagentRoleMark } from '../../../../lib/product/subagents/subagent-role';

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
      {...subagentRoleMark(subagent.role)}
      dimmed={subagent.state === 'idle'}
      status={statuses[subagent.state]}
    />
  );
}
