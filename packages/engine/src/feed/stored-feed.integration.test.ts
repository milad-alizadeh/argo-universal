import type { ChangesSummary, FeedSubscribeOutput } from '@repo/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { closeStream, readThrough } from '#mocks/feed-stream-reading';
import { storedFeedSources } from '#mocks/stored-feed';
import { streamFeed } from './feed-stream';

const totals: ChangesSummary = { files: 3, additions: 5, deletions: 2 };

const waitMs = 1_000;

let read: PromiseWithResolvers<ChangesSummary>;

let controller: AbortController;

let stream: AsyncGenerator<FeedSubscribeOutput>;

beforeEach(() => {
  vi.useFakeTimers();
  read = Promise.withResolvers<ChangesSummary>();
  controller = new AbortController();
  stream = streamFeed(
    storedFeedSources(async () => read.promise),
    { sessionId: 'session-1', after: null },
    controller.signal,
  );
});

afterEach(async () => {
  controller.abort();
  await closeStream(stream);
  vi.useRealTimers();
});

it('sends a stored Session snapshot before its Checkout totals are read', async () => {
  expect((await stream.next()).value).toMatchObject({ type: 'snapshot' });
});

it('holds a stored Feed open while its Checkout totals are read', async () => {
  await stream.next();
  const closing = stream.next().then(() => 'delivered');

  const waiting = new Promise((resolve) => {
    setTimeout(resolve, waitMs, 'waiting');
  });

  await vi.advanceTimersByTimeAsync(waitMs);

  expect(await Promise.race([closing, waiting])).toBe('waiting');
});

it('sends the Checkout totals before a stored Feed closes', async () => {
  await stream.next();
  const remaining = readThrough(stream, (event) => event.type === 'closed');
  await vi.advanceTimersByTimeAsync(waitMs);
  read.resolve(totals);

  expect(await remaining).toMatchObject([
    { type: 'snapshot', snapshot: { changes: totals } },
    { type: 'closed' },
  ]);
});

it('yields nothing more once its caller aborts during the read', async () => {
  await stream.next();
  const next = stream.next();
  controller.abort();
  read.resolve(totals);

  expect(await next).toEqual({ done: true, value: undefined });
});
