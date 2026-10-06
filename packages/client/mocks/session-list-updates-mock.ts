import { sessionRows } from '@repo/api/mocks';
import type { SessionInfo, SessionListUpdate } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import type { Fixtures } from './trpc-mock-link';

export function createSessionListUpdatesMock() {
  const initialSessions = (): SessionInfo[] => [
    { ...sessionRows.running, activityAt: 200 },
    { ...sessionRows.idle, activityAt: 100 },
  ];
  let sessions = initialSessions();
  const updates = createSubscriptionPublisher<SessionListUpdate>();
  return {
    reset() {
      sessions = initialSessions();
      updates.reset();
    },
    publish(update: SessionListUpdate) {
      sessions = sessions.filter(
        (session) =>
          session.sessionId !==
          (update.type === 'changed'
            ? update.session.sessionId
            : update.sessionId),
      );
      if (update.type === 'changed') sessions.push(update.session);
      updates.publish(update);
    },
    fixtures: {
      ...sessionListMocks,
      'session.list': ({ archived, query }) => ({
        sessions: sessions.filter(
          (session) =>
            Boolean(session.archivedAt !== null) === archived &&
            (!query ||
              session.title.toLowerCase().includes(query.toLowerCase())),
        ),
        nextCursor: null,
      }),
      'session.listUpdates': (_input, signal) => updates.subscribe(signal),
    } satisfies Fixtures,
  };
}
