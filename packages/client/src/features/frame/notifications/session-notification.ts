import type { SessionInfo, SessionStatus } from '@repo/contracts';

const hasRunningTurn = (status: SessionStatus): boolean =>
  status === 'running' || status === 'needs_input';

const endedTurnBody = 'Turn ended';

const bodyByStatus: Record<SessionStatus, string | null> = {
  running: null,
  needs_input: 'Needs your input',
  idle: endedTurnBody,
  unread: endedTurnBody,
  failed: endedTurnBody,
};

function bodyForTransition(
  previous: SessionStatus,
  next: SessionStatus,
): string | null {
  if (previous === next) return null;

  return hasRunningTurn(previous) ? bodyByStatus[next] : inputRequestBody(next);
}

const isExcluded = (
  session: Pick<SessionInfo, 'archivedAt' | 'parentSessionId'>,
): boolean => session.archivedAt !== null || session.parentSessionId !== null;

const inputRequestBody = (status: SessionStatus): string | null =>
  status === 'needs_input' ? 'Needs your input' : null;

export function sessionNotificationBody(
  previous: SessionStatus | undefined,
  session: Pick<SessionInfo, 'status' | 'archivedAt' | 'parentSessionId'>,
): string | null {
  if (previous === undefined) return null;

  return isExcluded(session)
    ? null
    : bodyForTransition(previous, session.status);
}
