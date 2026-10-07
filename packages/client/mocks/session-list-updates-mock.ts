import { sessionRows } from '@repo/api/mocks';
import type { SessionInfo, SessionListUpdate } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import type { Fixtures } from './trpc-mock-link';

export function createSessionListUpdatesMock(options?: {
  sessions: readonly SessionInfo[];
  pageSize?: number;
}) {
  const initialSessions = (): SessionInfo[] =>
    options
      ? [...options.sessions]
      : [
          { ...sessionRows.running, activityAt: 200 },
          { ...sessionRows.idle, activityAt: 100 },
        ];
  let sessions = initialSessions();
  let held: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  const calls = { list: 0, active: 0, nextPage: 0, delivered: 0 };
  const updates = createSubscriptionPublisher<SessionListUpdate>();
  return {
    calls,
    reset() {
      held?.resolve();
      held = undefined;
      sessions = initialSessions();
      Object.assign(calls, { list: 0, active: 0, nextPage: 0, delivered: 0 });
      updates.reset();
    },
    hold() {
      held ??= Promise.withResolvers<void>();
    },
    release() {
      held?.resolve();
      held = undefined;
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
      'session.list': async ({ projectId, archived, query, cursor }) => {
        calls.list += 1;
        calls.active += 1;
        if (cursor) calls.nextPage += 1;
        const rows = sessions
          .filter(
            (session) =>
              (!projectId || session.projectId === projectId) &&
              Boolean(session.archivedAt !== null) === archived &&
              (!query ||
                session.title.toLowerCase().includes(query.toLowerCase())),
          )
          .sort((first, second) => second.activityAt - first.activityAt);
        const start = cursor ? Number(cursor) : 0;
        const end = start + (options?.pageSize ?? 50);
        const result = {
          sessions: rows.slice(start, end),
          nextCursor: rows.length > end ? String(end) : null,
        };
        try {
          await held?.promise;
          return result;
        } finally {
          calls.active -= 1;
        }
      },
      'session.listUpdates': async function* (_input, signal) {
        for await (const update of updates.subscribe(signal)) {
          calls.delivered += 1;
          yield update;
        }
      },
    } satisfies Fixtures,
  };
}
