import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { storedMessage } from '#mocks/feed';
import {
  createFeedRouterCaller,
  database,
  longHistoryRows,
  startFeedTestHost,
  storeLongHistory,
} from '#mocks/feed-suite';
import { identified, type Yielded } from '#mocks/plain-feed';
import { writeJobs } from '../storage';
import { FeedRowsJob } from './feed-rows-job';

interface Received {
  id: string | undefined;
  event: FeedSubscribeOutput;
}

async function open(
  input: { batched?: boolean; lastEventId?: string } = {},
): Promise<AsyncIterator<Yielded>> {
  const events: AsyncIterable<Yielded> =
    await createFeedRouterCaller().feed.subscribe({
      sessionId: 'session-1',
      after: { epoch: 3, revision: 0 },
      ...input,
    });

  return events[Symbol.asyncIterator]();
}

// The catch-up: what comes before the Feed's newest stored revision, whatever the snapshot's place among it.
async function catchUp(
  updates: AsyncIterator<Yielded>,
  through = longHistoryRows,
): Promise<Received[]> {
  const received: Received[] = [];

  for (;;) {
    const result = await updates.next();

    if (result.done) throw new Error('The subscription ended');
    const item = identified(result.value);

    if (item.event.type === 'snapshot') continue;
    received.push(item);

    if ('rev' in item.event && item.event.rev >= through) return received;
  }
}

const revisionsOf = (event: FeedSubscribeOutput | undefined): number[] =>
  event?.type === 'rows.upsert' ? event.rows.map((row) => row.revision) : [];

it('sends a catch-up of many rows in far fewer messages than rows', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const received = await catchUp(await open({ batched: true }));
  const revisions = received.flatMap(({ event }) => revisionsOf(event));

  expect(revisions.length).toBeGreaterThan(400);
  expect(received.length).toBeLessThanOrEqual(5);
  expect(received.every(({ event }) => event.type === 'rows.upsert')).toBe(
    true,
  );
});

it('keeps revision order, and gives each batch the id of its last row', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const received = await catchUp(await open({ batched: true }));
  const revisions = received.flatMap(({ event }) => revisionsOf(event));

  expect(revisions).toEqual([...revisions].sort((a, b) => a - b));

  for (const { id, event } of received) {
    const last = revisionsOf(event).at(-1);

    expect(event).toMatchObject({ rev: last });
    expect(id).toMatch(new RegExp(`:${last}$`));
  }
});

it('resumes after the id of a batch with only the rows past it', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const first = await catchUp(await open({ batched: true }));

  const resumed = await catchUp(
    await open({ batched: true, lastEventId: first[0]?.id }),
  );

  expect(resumed.flatMap(({ event }) => revisionsOf(event))).toEqual(
    first.slice(1).flatMap(({ event }) => revisionsOf(event)),
  );
});

it('sends an App that does not ask for batches one upsert per row, as before', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const received = await catchUp(await open());

  expect(received.length).toBeGreaterThan(400);
  expect(received.every(({ event }) => event.type === 'row.upsert')).toBe(true);
});

const bigRows = 40;

const lastBigRevision = 5 + bigRows;

// 40 rows of about 20 KB each: 200 rows would hold 4 MB.
const storeBigRows = (): void =>
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: Array.from({ length: bigRows }, (_, index) => ({
        ...storedMessage(index + 5),
        content: [{ type: 'text' as const, text: 'x'.repeat(20_000) }],
      })),
      maxRevision: lastBigRevision,
    }),
  ]);

it('splits a page of large rows into several batches, in order', async (): Promise<void> => {
  storeBigRows();
  await startFeedTestHost();

  const received = await catchUp(
    await open({ batched: true }),
    lastBigRevision,
  );

  const revisions = received.flatMap(({ event }) => revisionsOf(event));

  expect(received.length).toBeGreaterThanOrEqual(3);

  expect(revisions).toEqual([...revisions].sort((a, b) => a - b));
  expect(new Set(revisions).size).toBe(lastBigRevision);

  for (const { event } of received)
    expect(JSON.stringify(event).length).toBeLessThan(300_000);

  for (const { id, event } of received)
    expect(id).toMatch(new RegExp(`:${revisionsOf(event).at(-1)}$`));
});

it('resumes from the id of a middle batch with only the rest', async (): Promise<void> => {
  storeBigRows();
  await startFeedTestHost();
  const first = await catchUp(await open({ batched: true }), lastBigRevision);
  const middle = first[1];

  const resumed = await catchUp(
    await open({ batched: true, lastEventId: middle?.id }),
    lastBigRevision,
  );

  expect(resumed.flatMap(({ event }) => revisionsOf(event))).toEqual(
    first.slice(2).flatMap(({ event }) => revisionsOf(event)),
  );
});
