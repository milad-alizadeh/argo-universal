import type { SessionListUpdate } from '@repo/contracts';
import { sessionRows } from '@repo/mocks/app';
import { sessionListMocks } from './session-list-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import type { FixtureArguments, FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

export type SessionListPages = Record<string, FixtureOutput<'session.list'>>;

interface SessionListUpdatesMock {
  respondWith: (pages: SessionListPages) => void;
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
    ) => AsyncGenerator<SessionListUpdate, void>;
  };
}

export function createSessionListUpdatesMock(
  initialPages: SessionListPages = {
    first: {
      sessions: [
        { ...sessionRows.running, activityAt: 200 },
        { ...sessionRows.idle, activityAt: 100 },
      ],
      nextCursor: null,
    },
  },
): SessionListUpdatesMock {
  let pages = initialPages;
  let generation = 0;
  let held: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  const calls = { list: 0, active: 0, nextPage: 0, delivered: 0 };
  const updates = createSubscriptionPublisher<SessionListUpdate>();
  return {
    calls,
    respondWith(nextPages): void {
      pages = nextPages;
    },
    reset(): void {
      generation += 1;
      held?.resolve();
      held = undefined;
      pages = initialPages;
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
    publish: updates.publish,
    fixtures: {
      ...sessionListMocks,
      'session.list': async ({ cursor }) => {
        const current = generation;
        calls.list += 1;
        calls.active += 1;
        if (cursor) calls.nextPage += 1;
        const result = pages[cursor ?? 'first'];
        if (!result)
          throw new Error(`No Session list response for cursor ${cursor}`);
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
