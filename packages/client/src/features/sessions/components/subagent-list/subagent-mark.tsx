import type { Subagent } from '@repo/contracts';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type { JSX } from 'react';
import { subagentMarkDescriptor } from '../../../../lib/product/subagents/subagent-role';

export function SubagentMark({
  subagent,
}: {
  subagent: Subagent;
}): JSX.Element {
  const { label, status, ...mark } = subagentMarkDescriptor(subagent);

  return (
    <TintedAvatar
      {...mark}
      accessibilityLabel={label}
      status={status && { tone: status.tone, accessibilityLabel: status.label }}
    />
  );
}
