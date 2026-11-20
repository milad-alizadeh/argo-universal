import type { SessionRowCall } from './session-row-call';
import { idleSession } from './session-row-fixtures';

const callStartedAt = '2026-11-18T10:00:00.000Z';

// A live Conversation attached to the idle Session, 2:43 in, at a fixed clock.
export const liveConversation = {
  sessionId: idleSession.session.sessionId,
  startedAt: callStartedAt,
  muted: false,
  now: Date.parse(callStartedAt) + 163_000,
} satisfies SessionRowCall;

// The same call with this App's microphone muted.
export const mutedConversation = {
  ...liveConversation,
  muted: true,
} satisfies SessionRowCall;

// The same call still connecting: it has no start time yet.
export const connectingConversation = {
  ...liveConversation,
  startedAt: null,
} satisfies SessionRowCall;
