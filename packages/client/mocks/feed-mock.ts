import type { FeedMock } from '@repo/api/mocks';
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

export { recordedFeedMocks } from '@repo/api/mocks';

// One recorded Feed at the tRPC link, for any Session screen story (ADR 0010).
export function createFeedMocks(mock: FeedMock): FeedFixtures {
  return {
    'feed.page': ({ direction, cursor, limit = 40, epoch }) => {
      const staleCursor = epoch !== undefined && epoch !== mock.snapshot.epoch;
      const available =
        direction === 'before' && cursor !== undefined && !staleCursor
          ? mock.rows.filter((row) => row.position < cursor)
          : mock.rows;
      const rows = available.slice(-limit);
      return {
        epoch: mock.snapshot.epoch,
        maxRevision: mock.snapshot.maxRevision,
        rows,
        hasOlder: available.length > rows.length,
        startCursor: rows[0]?.position ?? null,
        staleCursor,
      };
    },
    'feed.row': ({ id }) => {
      const row = mock.rows.find((row) => row.id === id);
      if (!row) throw new Error(`No recorded Feed row ${id}`);
      return row;
    },
    'feed.subscribe': async function* ({ after }) {
      const revision = after?.revision ?? mock.snapshot.maxRevision;
      for (const event of mock.stream)
        if (!('rev' in event) || event.rev > revision) yield event;
    },
  } satisfies Fixtures;
}
