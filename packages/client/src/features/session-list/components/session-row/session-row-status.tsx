import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { sessionStatusDot } from '#features/sessions';
import { StatusDot } from '#primitives/status/status-dot';
import { sidebarRows } from './session-row-sidebar';

// The dot that ends a row while its Session is not idle; nothing when idle, so no empty lane holds the row's end. The row's label names the status.
export function rowStatusDot(status: SessionInfo['status']): React.ReactNode {
  return status === 'idle' ? undefined : (
    <StatusDot {...sessionStatusDot(status)} testID="session-status" />
  );
}

// Paper "SessionsList" Compact: a sidebar row ends every row on its status dot, an idle Session's muted.
export function compactStatusDot(
  status: SessionInfo['status'],
): React.ReactNode {
  return sidebarRows ? (
    <StatusDot {...sessionStatusDot(status)} testID="session-status" />
  ) : (
    rowStatusDot(status)
  );
}
