import type {
  SessionInfo,
  SessionListUpdate,
  SessionStatus,
} from '@repo/contracts';
import { sessionNotificationBody } from './session-notification';

export interface SessionNotification {
  session: SessionInfo;
  body: string;
}

interface SessionNotifications {
  receive: (update: SessionListUpdate) => SessionNotification | null;
  reset: () => void;
}

export function createSessionNotifications(): SessionNotifications {
  const previous = new Map<string, SessionStatus>();

  return {
    receive: (update) => receiveUpdate(previous, update),
    reset: () => previous.clear(),
  };
}

function receiveUpdate(
  previous: Map<string, SessionStatus>,
  update: SessionListUpdate,
): SessionNotification | null {
  if (update.type === 'removed') {
    previous.delete(update.sessionId);

    return null;
  }

  return notificationForSession(previous, update.session);
}

function notificationForSession(
  previous: Map<string, SessionStatus>,
  session: SessionInfo,
): SessionNotification | null {
  const body = sessionNotificationBody(
    previous.get(session.sessionId),
    session,
  );

  previous.set(session.sessionId, session.status);

  return body ? { session, body } : null;
}
