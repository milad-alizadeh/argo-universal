import type { SessionSnapshot } from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { sessionMachine } from '../session-machine';

export type SessionState = SnapshotFrom<typeof sessionMachine>;

// Without a Session actor, the Session runs while the Live header reader's active Turn does.
export function snapshotState(
  session: SessionState | null,
  activeTurnId: string | null,
): SessionSnapshot['state'] {
  if (session) return activeState(session);

  return activeTurnId === null ? 'idle' : 'running';
}

function activeState(session: SessionState): SessionSnapshot['state'] {
  if (needsAction(session)) return 'requires_action';

  return isRunning(session) ? 'running' : 'idle';
}

function needsAction(session: SessionState): boolean {
  return (
    session.matches({ open: { acp: { activeTurn: 'awaitingPermission' } } }) ||
    session.matches({ open: { acp: { activeTurn: 'awaitingElicitation' } } }) ||
    session.matches({ open: { acp: { activeTurn: 'awaitingPlanApproval' } } })
  );
}

function isRunning(session: SessionState): boolean {
  return (
    session.matches({ open: { acp: 'committing' } }) ||
    runningTurn(session) ||
    session.matches({ open: { acp: 'publishing' } })
  );
}

function runningTurn(session: SessionState): boolean {
  return (
    session.matches({ open: { acp: 'activeTurn' } }) &&
    !session.matches({ open: { acp: { activeTurn: 'cancelling' } } })
  );
}
