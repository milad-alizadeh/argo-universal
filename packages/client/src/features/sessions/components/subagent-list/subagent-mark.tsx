import type { Subagent } from '@repo/contracts';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type { JSX } from 'react';
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
    />
  );
}

export function SubagentStatus({
  subagent,
}: {
  subagent: Subagent;
}): JSX.Element | null {
  const status = statuses[subagent.state];

  return status ? <StatusDot {...status} /> : null;
}
