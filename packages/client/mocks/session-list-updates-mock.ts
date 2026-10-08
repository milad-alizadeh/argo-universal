import { sessionRows } from '@repo/api/mocks';
import type { SessionInfo, SessionListUpdate } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import type { FixtureArguments, FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

interface SessionListUpdatesMock {
  calls: Record<'list' | 'active' | 'nextPage' | 'delivered', number>;
  reset: () => void;
  hold: () => void;
  release: () => void;
  publish: ReturnType<
    typeof createSubscriptionPublisher<SessionListUpdate>
  >['publish'];
  fixtures: Omit<
    typeof sessionListMocks,
    'session.list' | 'session.listUpdates'
  > & {
    'session.list': (
      input: FixtureArguments<'session.list'>[0],
    ) => Promise<FixtureOutput<'session.list'>>;
    'session.listUpdates': (
      ...args: FixtureArguments<'session.listUpdates'>
    ) => AsyncGenerator<SessionListUpdate>;
  };
}

export function createSessionListUpdatesMock(options?: {
  sessions: readonly SessionInfo[];
  pageSize?: number;
}): SessionListUpdatesMock {
  const initialSessions = (): SessionInfo[] =>
    options
      ? [...options.sessions]
      : [
          { ...sessionRows.running, activityAt: 200 },
          { ...sessionRows.idle, activityAt: 100 },
        ];
  let sessions = initialSessions();
  let generation = 0;
  let held: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  const calls = { list: 0, active: 0, nextPage: 0, delivered: 0 };
  const updates = createSubscriptionPublisher<SessionListUpdate>();
  return {
    calls,
    reset(): void {
      generation += 1;
      held?.resolve();
      held = undefined;
      sessions = initialSessions();
      Object.assign(calls, { list: 0, active: 0, nextPage: 0, delivered: 0 });
      updates.reset();
    },
    hold(): void {
      held ??= Promise.withResolvers<void>();
    },
    release(): void {
      held?.resolve();
      held = undefined;
    },
    publish(update: SessionListUpdate): void {
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
        const current = generation;
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
          if (generation === current) calls.active -= 1;
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
