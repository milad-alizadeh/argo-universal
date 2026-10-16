import { useSyncExternalStore } from 'react';
import { useConnection } from '#features/connection';
import { turnSignInsOf } from '../stores/turn-sign-ins';
import type { TurnSignIn } from '../types/turn-sign-in';

export interface TurnSignInRecord extends TurnSignIn {
  onAuthenticate: (turnEnd: string) => void;
  // The sign-in finished; it answered this Turn end, when it was a Turn's.
  finish: (answered?: string) => void;
}

// The Session's Turn sign-in on this Server, kept across the Session page's mounts.
export function useTurnSignIn(sessionId: string): TurnSignInRecord {
  const record = turnSignInsOf(useConnection());

  const signIn = useSyncExternalStore(record.subscribe, () =>
    record.of(sessionId),
  );

  return {
    ...signIn,
    onAuthenticate: (turnEnd) => record.authenticate(sessionId, turnEnd),
    finish: (answered) => record.finish(sessionId, answered),
  };
}
