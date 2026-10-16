import { useSyncExternalStore } from 'react';
import { turnSignIns } from '../stores/turn-sign-ins';

export interface TurnSignInRecord {
  // The `auth_required` Turn end a sign-in answered in this Session.
  answeredTurn: string | undefined;
  // The `auth_required` Turn end whose Authenticate was pressed, until its sign-in finishes.
  authenticating: string | undefined;
  onAuthenticate: (turnEnd: string) => void;
  // The sign-in finished; it answered this Turn end, when it was a Turn's.
  finish: (answeredTurn?: string) => void;
}

// The Session's Turn sign-in, kept across the Session page's mounts.
export function useTurnSignIn(sessionId: string): TurnSignInRecord {
  const { answered, authenticating } = useSyncExternalStore(
    turnSignIns.subscribe,
    () => turnSignIns.of(sessionId),
  );

  return {
    answeredTurn: answered,
    authenticating,
    onAuthenticate: (turnEnd) => turnSignIns.authenticate(sessionId, turnEnd),
    finish: (answeredTurn) => turnSignIns.finish(sessionId, answeredTurn),
  };
}
