import { expect, it, vi } from 'vitest';
import {
  address,
  harness,
  pluginId,
  valueOf,
} from '#mocks/plugin-data-harness';

it('runs one named read for every Loader reading the Query while it is in flight', async () => {
  const { read, answer, reads } = harness();

  const first = read();
  const second = read();

  await answer({ count: 1 });

  expect(valueOf(await first)).toEqual({ count: 1 });
  expect(valueOf(await second)).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);
});

it('keeps the answer for a draw until a write makes it due', async () => {
  const { data, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  expect(valueOf(await read())).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);

  data.written(pluginId);
  const after = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await after)).toEqual({ count: 2 });
});

it('reads again when a write lands while the read is in flight', async () => {
  const { data, read, answer, reads } = harness();

  const drawn = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(1));
  data.written(pluginId);
  await answer({ count: 1 });
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await drawn)).toEqual({ count: 2 });
});

it('marks the addresses that drew an answer once it changes, and none when it does not', async () => {
  const { read, answer, marks } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  // A background pass reads fresh and holds nothing; it is what finds the answer changed.
  const same = read({ holder: undefined });
  await answer({ count: 1 });
  await same;
  expect(marks).toEqual([]);

  const changed = read({ holder: undefined });
  await answer({ count: 2 });
  await changed;
  expect(marks).toEqual([[address]]);
});

it('forgets the named reads of a worker generation that ended', async () => {
  const { workers, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  workers.run(pluginId, 2);

  const after = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 3 }, 2);

  expect(valueOf(await after)).toEqual({ count: 3 });
});
