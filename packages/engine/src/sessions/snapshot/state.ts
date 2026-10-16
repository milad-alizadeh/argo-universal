import type { SessionSnapshot } from '@repo/contracts';
import type { SnapshotFrom } from 'xstate';
import type { sessionMachine } from '../session-machine';

export type SessionState = SnapshotFrom<typeof sessionMachine>;

export function snapshotState(
  session: SessionState | null,
): SessionSnapshot['state'] {
  return session ? activeState(session) : 'idle';
}

function activeState(session: SessionState): SessionSnapshot['state'] {
  if (needsAction(session)) return 'requires_action';

  return isRunning(session) ? 'running' : 'idle';
}

function needsAction(session: SessionState): boolean {
  return (
    session.matches({ open: { acp: { activeTurn: 'awaitingPermission' } } }) ||
    session.matches({ open: { acp: { activeTurn: 'awaitingElicitation' } } })
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
