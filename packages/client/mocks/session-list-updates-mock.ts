import { sessionRows } from '@repo/api/mocks';
import type { SessionInfo, SessionListUpdate } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import type { Fixtures } from './trpc-mock-link';

export function createSessionListUpdatesMock() {
  const initialSessions = (): SessionInfo[] => [
    { ...sessionRows.running, activityAt: 200 },
    { ...sessionRows.idle, activityAt: 100 },
  ];
  let sessions = initialSessions();
  let send: ((update: SessionListUpdate) => void) | undefined;
  return {
    reset() {
      sessions = initialSessions();
      send = undefined;
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
      send?.(update);
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
      'session.listUpdates': async function* (_input, signal) {
        while (!signal.aborted) {
          const update = await new Promise<SessionListUpdate | undefined>(
            (resolve) => {
              const cleanup = () => {
                signal.removeEventListener('abort', abort);
                if (send === deliver) send = undefined;
              };
              const abort = () => {
                cleanup();
                resolve(undefined);
              };
              const deliver = (value: SessionListUpdate) => {
                cleanup();
                resolve(value);
              };
              if (signal.aborted) return resolve(undefined);
              send = deliver;
              signal.addEventListener('abort', abort, { once: true });
            },
          );
          if (!update) return;
          yield update;
        }
      },
    } satisfies Fixtures,
  };
}
