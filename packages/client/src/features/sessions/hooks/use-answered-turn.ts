import { useSyncExternalStore } from 'react';
import { answeredTurns } from '../stores/answered-turns';

export interface AnsweredTurn {
  // The `auth_required` Turn end a sign-in answered in this Session.
  answeredTurn: string | undefined;
  answerTurn: (turnEnd: string) => void;
}

// The Session's answered Turn, kept across the Session page's mounts.
export function useAnsweredTurn(sessionId: string): AnsweredTurn {
  const answeredTurn = useSyncExternalStore(answeredTurns.subscribe, () =>
    answeredTurns.answered(sessionId),
  );

  return {
    answeredTurn,
    answerTurn: (turnEnd) => answeredTurns.answer(sessionId, turnEnd),
  };
}
