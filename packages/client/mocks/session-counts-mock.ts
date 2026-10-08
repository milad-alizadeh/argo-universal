import type { SessionCounts } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import type { Fixtures } from './trpc-mock-link';

// A `session.counts` that starts at `initial` and sends each published count, as the Server does when a Session changes.
export function createSessionCountsMock(initial: SessionCounts): Pick<
  ReturnType<typeof createSubscriptionPublisher<SessionCounts>>,
  'reset' | 'publish'
> & {
  fixtures: Omit<typeof sessionListMocks, 'session.counts'> & {
    'session.counts': (
      input: void,
      signal: AbortSignal,
    ) => AsyncGenerator<SessionCounts, void>;
  };
} {
  const counts = createSubscriptionPublisher<SessionCounts>();
  return {
    reset: counts.reset,
    publish: counts.publish,
    fixtures: {
      ...sessionListMocks,
      'session.counts': async function* (_input, signal) {
        yield initial;
        yield* counts.subscribe(signal);
      },
    } satisfies Fixtures,
  };
}
