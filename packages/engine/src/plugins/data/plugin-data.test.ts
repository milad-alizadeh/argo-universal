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
  // An address with no tree yet waits for the fresh read; one that has a tree is served what was kept.
  const after = read({ holder: { ...address, path: '/new' } });
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

it('serves a page that already has a tree from what was kept after a write, and marks it if the read behind changes', async () => {
  const { data, read, answer, reads, marks } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  data.written(pluginId);

  // No answer has come yet, and the draw is not waiting for one.
  expect(valueOf(await read())).toEqual({ count: 1 });
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  expect(marks).toEqual([]);

  await answer({ count: 2 });
  await vi.waitFor(() => expect(marks).toEqual([[address]]));
});

it('waits for a fresh read when the address has no tree yet, or the person pulled to refresh', async () => {
  const { data, read, answer, reads } = harness();
  const other = { ...address, path: '/other' };

  const first = read();
  await answer({ count: 1 });
  await first;
  data.written(pluginId);

  const pulled = read({ holder: address }, true);
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });
  expect(valueOf(await pulled)).toEqual({ count: 2 });

  data.written(pluginId);
  const unseen = read({ holder: other });
  await vi.waitFor(() => expect(reads()).toHaveLength(3));
  await answer({ count: 3 });
  expect(valueOf(await unseen)).toEqual({ count: 3 });
});

it('on a change reads again only the Queries a page holds, and marks only the addresses whose answer differs', async () => {
  const { data, read, answer, reads, marks } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  // Nothing changed: it reads again, finds the same answer and marks nothing.
  data.written(pluginId);
  const same = data.writes.changed(pluginId);
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 1 });
  await same;
  expect(marks).toEqual([]);

  data.written(pluginId);
  const differs = data.writes.changed(pluginId);
  await vi.waitFor(() => expect(reads()).toHaveLength(3));
  await answer({ count: 2 });
  await differs;
  expect(marks).toEqual([[address]]);
});

it('on a change makes due, and does not read, a Query no page holds', async () => {
  const { data, slotRead, answer, reads } = harness();

  const first = slotRead();
  await answer({ count: 1 });
  await first;

  data.written(pluginId);
  await data.writes.changed(pluginId);
  expect(reads()).toHaveLength(1);

  const next = slotRead();
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });
  expect(valueOf(await next)).toEqual({ count: 2 });
});

it('on a clock tick makes due only the Queries a Slot read that are as old as its interval', async () => {
  const { data, slotRead, read, answer, reads } = harness();

  const page = read();
  await answer({ count: 1 });
  await page;

  // Held by a page only, so a Slot's clock leaves it alone.
  data.writes.dueWhenOlder(pluginId, 0);
  expect(valueOf(await read())).toEqual({ count: 1 });
  // A read behind the draw would begin on a later turn, so let one pass before counting.
  await new Promise((settle) => setTimeout(settle, 0));
  expect(reads()).toHaveLength(1);

  const slot = slotRead();
  await answer({ count: 5 });
  await slot;
  data.writes.dueWhenOlder(pluginId, 0);
  const again = slotRead();
  await vi.waitFor(() => expect(reads()).toHaveLength(3));
  await answer({ count: 6 });
  await again;
});
