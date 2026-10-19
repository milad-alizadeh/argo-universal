import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { StatusDot } from '#primitives/status/status-dot';
import { sessionStatusDot } from '../../session-status-dot';

// The dot that ends a row while its Session is not idle; nothing when idle, so no empty lane holds the row's end. The row's label names the status.
export function rowStatusDot(status: SessionInfo['status']): React.ReactNode {
  return status === 'idle' ? undefined : (
    <StatusDot {...sessionStatusDot(status)} testID="session-status" />
  );
}
