import { Text } from '@repo/kit/primitives/content/text';
import type { Tone } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type * as React from 'react';
import { sessionStatusDot, sessionStatusLabels } from '../session-status-dot';
import type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from './session-header-props';

const statusTextColor = {
  running: 'success',
  needs_input: 'warning',
  idle: 'muted',
} satisfies Record<SessionHeaderStatus, Tone>;

export function StatusDescription({
  status,
}: Pick<SessionHeaderProps, 'status'>): React.JSX.Element {
  return (
    <>
      <SessionStatusText status={status} />
      <StatusDot
        {...sessionStatusDot(status)}
        size="sm"
        testID="session-status"
      />
    </>
  );
}

function SessionStatusText({
  status,
}: Pick<SessionHeaderProps, 'status'>): React.JSX.Element {
  return (
    <Text role="secondary" tone={statusTextColor[status]}>
      {sessionStatusLabels[status]}
    </Text>
  );
}
