import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { Icon } from '#primitives/content/icon';
import { Spinner } from '#primitives/status/spinner';

export function SubagentMark({
  subagent,
}: {
  subagent: Subagent;
}): JSX.Element {
  if (subagent.state !== 'idle')
    return <Spinner accessibilityLabel="Running" />;

  return (
    <Icon
      name={subagent.stopReason === 'cancelled' ? 'close' : 'check'}
      role="body"
      tone="muted"
    />
  );
}
