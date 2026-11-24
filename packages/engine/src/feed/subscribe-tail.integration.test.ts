import { defaultPageRows, type FeedSubscribeOutput } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import { fifthMessageRowId, createOpenMessageChange } from '#mocks/feed-inputs';
import {
  applyFeedChange,
  createFeedRouterCaller,
  startFeedTestHost,
  storeLongHistory,
} from '#mocks/feed-suite';
import { identified, type Yielded } from '#mocks/plain-feed';

async function open(
  input: { tail?: boolean; lastEventId?: string; later?: number } = {},
): Promise<AsyncIterator<Yielded>> {
  const events: AsyncIterable<Yielded> =
    await createFeedRouterCaller().feed.subscribe({
      sessionId: 'session-1',
      after: null,
      ...input,
    });

  return events[Symbol.asyncIterator]();
}

async function next(updates: AsyncIterator<Yielded>): Promise<{
  id: string | undefined;
  event: FeedSubscribeOutput;
}> {
  const result = await updates.next();

  if (result.done) throw new Error('The subscription ended');

  return identified(result.value);
}

it('opens a cold App with the tail of the Feed, then the snapshot, in the subscription itself', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const updates = await open({ tail: true });

  const { id, event } = await next(updates);

  if (event.type !== 'tail') throw new Error(`Opened with ${event.type}`);

  expect(defaultPageRows).toBe(40);
  expect(event.page.rows).toHaveLength(40);
  expect(event.page.hasOlder).toBe(true);
  expect(event.page.rows.at(-1)?.revision).toBe(event.page.maxRevision);
  expect(id).toBe(`${event.page.epoch}:${event.page.maxRevision}`);
  expect((await next(updates)).event.type).toBe('snapshot');
});

it('sends rows not yet stored after the tail, once', async (): Promise<void> => {
  await startFeedTestHost();
  applyFeedChange(createOpenMessageChange(fifthMessageRowId, 'Hel'));
  const updates = await open({ tail: true });
  const types: string[] = [];

  for (let events = 0; events < 3; events += 1)
    types.push((await next(updates)).event.type);

  await vi.advanceTimersByTimeAsync(0);

  expect(types.filter((type) => type === 'tail')).toHaveLength(1);
  expect(types).toContain('row.upsert');
});

it('sends an App that does not ask for the tail no tail, as before', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const updates = await open();

  expect((await next(updates)).event.type).toBe('snapshot');
});

it('does not repeat the tail for an App resuming with a last event id', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const updates = await open({ tail: true, lastEventId: '3:5' });

  expect((await next(updates)).event.type).not.toBe('tail');
});

it('ignores an input key it does not know, so a later App still opens', async (): Promise<void> => {
  storeLongHistory();
  await startFeedTestHost();
  const updates = await open({ tail: true, later: 1 });

  expect((await next(updates)).event.type).toBe('tail');
});
