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
  if (session.hasTag('requiresAction')) return 'requires_action';

  return session.hasTag('running') ? 'running' : 'idle';
}
