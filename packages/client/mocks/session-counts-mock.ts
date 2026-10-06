import type { SessionCounts } from '@repo/contracts';
import { sessionListMocks } from './session-list-mock';
import type { Fixtures } from './trpc-mock-link';

// A `session.counts` that starts at `initial` and sends each published count, as the Server does when a Session changes.
export function createSessionCountsMock(initial: SessionCounts) {
  let send: ((counts: SessionCounts) => void) | undefined;
  return {
    publish(counts: SessionCounts) {
      send?.(counts);
    },
    fixtures: {
      ...sessionListMocks,
      'session.counts': async function* (_input, signal) {
        yield initial;
        while (!signal.aborted) {
          const counts = await new Promise<SessionCounts | undefined>(
            (resolve) => {
              send = resolve;
              signal.addEventListener('abort', () => resolve(undefined), {
                once: true,
              });
            },
          );
          if (!counts) return;
          yield counts;
        }
      },
    } satisfies Fixtures,
  };
}
