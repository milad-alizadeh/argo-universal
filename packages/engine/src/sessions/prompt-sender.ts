import type { NonUserPromptSender, PromptSender } from '@repo/contracts';

// Who starts native work: the Session that started a new Session, and who sent its Prompt.
export type SessionOrigin = {
  startedBySessionId: string | null;
  sender: PromptSender;
};

// A caller's origin, with a new Session's pre-allocated id and the signal that stops its admission.
export type NativeStartRequest = SessionOrigin & {
  sessionId?: string;
  signal?: AbortSignal;
};

// One Session's start or Prompt: its ids exist before it is admitted, so a caller can follow it.
export type NativeStart<Accepted> = {
  sessionId: string;
  turnId: string;
  accepted: Promise<Accepted>;
};

// The authenticated caller chooses the identity; Hooks and prompt JSON never do.
function sessionPromptSender(
  sessionId: string,
  title: string,
): NonUserPromptSender {
  return { type: 'session', sessionId, title: title.trim() || 'Session' };
}

// The user starts work with no calling Session.
export const userOrigin: SessionOrigin = {
  startedBySessionId: null,
  sender: { type: 'user' },
};

// A calling Session is the new Session's started-by Session and its Prompts' sender.
export function sessionOrigin(
  callerSessionId: string,
  title: string,
): SessionOrigin {
  return {
    startedBySessionId: callerSessionId,
    sender: sessionPromptSender(callerSessionId, title),
  };
}
