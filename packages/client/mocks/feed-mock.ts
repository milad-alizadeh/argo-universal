import type { FeedMock } from '@repo/mocks/app';
import type { FixtureArguments, FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

export interface FeedFixtures {
  'feed.page': (
    input: FixtureArguments<'feed.page'>[0],
  ) => FixtureOutput<'feed.page'>;
  'feed.row': (
    input: FixtureArguments<'feed.row'>[0],
  ) => FixtureOutput<'feed.row'>;
  'feed.subscribe': (
    input: FixtureArguments<'feed.subscribe'>[0],
  ) => AsyncGenerator<FeedMock['stream'][number], void>;
}

// One recorded Feed at the tRPC link, for any Session screen story (ADR 0010).
export function createFeedMocks(
  mock: FeedMock,
  pages?: Record<string, FixtureOutput<'feed.page'>>,
): FeedFixtures {
  return {
    'feed.page': ({ direction, cursor }) => {
      if (pages) {
        const page = pages[direction === 'before' ? String(cursor) : 'tail'];
        if (!page)
          throw new Error(`No recorded Feed page for ${direction}/${cursor}`);
        return page;
      }
      return {
        epoch: mock.snapshot.epoch,
        maxRevision: mock.snapshot.maxRevision,
        rows: mock.rows,
        hasOlder: false,
        startCursor: mock.rows[0]?.position ?? null,
        staleCursor: false,
      };
    },
    'feed.row': ({ id }) => {
      const row = mock.rows.find((row) => row.id === id);
      if (!row) throw new Error(`No recorded Feed row ${id}`);
      return row;
    },
    'feed.subscribe': async function* () {
      yield { type: 'snapshot', snapshot: mock.snapshot };
    },
  } satisfies Fixtures;
}
