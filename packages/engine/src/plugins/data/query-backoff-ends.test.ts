import { expect, it, vi } from 'vitest';
import { address, pluginId, valueOf } from '#mocks/plugin-data-harness';
import {
  elsewhere,
  failedAfterAnswer,
  rateLimited,
} from './query-backoff-fixtures';
import { failureBackoffMs } from './query-rest';

const hour = 3_600_000;

it('ends the rest at once on a write, and reads for the page that draws next', async () => {
  const github = await failedAfterAnswer();

  github.data.written(pluginId);
  const drawn = github.read({ holder: { ...address, path: '/x' } });

  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
  await github.answer({ count: 2 });
  expect(valueOf(await drawn)).toEqual({ count: 2 });
});

it('ends the rest at once on a pull, which asks for a fresh answer', async () => {
  const github = await failedAfterAnswer();
  const pulled = github.read({ holder: undefined }, true);

  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
  await github.answer({ count: 2 });
  expect(valueOf(await pulled)).toEqual({ count: 2 });
});

it('reads again by itself when the rest ends, and marks the pages stuck on the failure once it answers', async () => {
  const github = await failedAfterAnswer();

  github.clock.advance(failureBackoffMs);
  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
  await github.answer({ count: 1 });

  await vi.waitFor(() => expect(github.marks).toHaveLength(1));
  expect(github.marks[0]).toEqual(expect.arrayContaining([address, elsewhere]));
});

it('rests again by itself when the read that ended a rest fails', async () => {
  const github = await failedAfterAnswer();

  github.clock.advance(failureBackoffMs);
  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
  const failed = github.read();

  await github.fail(rateLimited);
  await failed;

  github.clock.advance(failureBackoffMs);
  expect(github.reads()).toHaveLength(3);

  github.clock.advance(failureBackoffMs);
  await vi.waitFor(() => expect(github.reads()).toHaveLength(4));
});

it('counts a read that throws as a failure, as one that answers failed', async () => {
  const github = await failedAfterAnswer({ throws: true });
  const during = await github.read({ holder: { ...address, path: '/x' } });

  expect(github.reads()).toHaveLength(1);
  expect(during).toMatchObject({
    ok: true,
    value: { data: { count: 1 }, error: 'The read broke' },
  });

  github.faults.broken = false;
  github.clock.advance(failureBackoffMs);
  await vi.waitFor(() => expect(github.reads()).toHaveLength(2));
});

it('rests a Query until the limit it ran into reopens, when that is later than its backoff', async () => {
  const github = await failedAfterAnswer({ limitedUntil: hour });

  github.clock.advance(hour - 1);
  expect(github.reads()).toHaveLength(2);
  expect(await github.read()).toMatchObject({ value: { error: rateLimited } });
  expect(github.reads()).toHaveLength(2);

  github.faults.limitedUntil = undefined;
  github.clock.advance(1);
  await vi.waitFor(() => expect(github.reads()).toHaveLength(3));
});
