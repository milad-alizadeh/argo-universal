import type { NonUserPromptSender, PromptSender } from '@repo/contracts';
import type { SessionRouterDeps } from './router-deps';

// Who starts native work: the Session that started a new Session, and who sent its Prompt.
export type SessionOrigin = {
  startedBySessionId: string | null;
  sender: PromptSender;
};

// One Session's start or Prompt: its ids exist before it is admitted, so a caller can follow it.
export type NativeStart<Accepted> = {
  sessionId: string;
  turnId: string;
  accepted: Promise<Accepted>;
};

// The authenticated caller chooses the identity; Hooks and prompt JSON never do.
function sessionPromptSender(
  readSession: SessionRouterDeps['readSession'],
  sessionId: string,
): NonUserPromptSender {
  return {
    type: 'session',
    sessionId,
    title: readSession(sessionId).title.trim() || 'Session',
  };
}

// The user starts work with no calling Session.
export const userOrigin: SessionOrigin = {
  startedBySessionId: null,
  sender: { type: 'user' },
};

// A calling Session is the new Session's started-by Session and its Prompts' sender.
export function sessionOrigin(
  readSession: SessionRouterDeps['readSession'],
  callerSessionId: string,
): SessionOrigin {
  return {
    startedBySessionId: callerSessionId,
    sender: sessionPromptSender(readSession, callerSessionId),
  };
}
