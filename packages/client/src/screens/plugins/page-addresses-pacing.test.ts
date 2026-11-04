import { liveAnswer, type LiveTree } from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { environmentManager } from '@tanstack/react-query';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  cacheOverMemory,
  issues,
  kept,
  type Kept,
  onScreen,
  rowsOf,
  settled,
} from './page-addresses-fixtures';

const interval = 10000;

/*
 * TanStack draws again on `setInterval`, which it schedules only off a server, as an App is; the draws and
 * their answers still settle in real time.
 */
function fakeIntervals(): void {
  const server = environmentManager.isServer();

  environmentManager.setIsServer(() => false);
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  onTestFinished(() => {
    vi.useRealTimers();
    environmentManager.setIsServer(() => server);
  });
}

async function after(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await settled();
}

it('draws a tree again on the interval its answer names while on screen, naming the hash kept', async () => {
  fakeIntervals();

  const cache = cacheOverMemory();

  cache.server.pacing = { every: interval };

  const screen = onScreen(cache, issues);

  await settled();

  const first = screen.answer();

  expect(kept(first).every).toBe(interval);
  await after(interval - 1);
  expect(cache.server.requests).toHaveLength(1);
  await after(1);
  expect(cache.server.requests[1]).toMatchObject({ known: kept(first).hash });
  expect(screen.answer()).toBe(first);

  screen.leave();
  await after(interval * 3);
  expect(cache.server.requests).toHaveLength(2);
});

it('keeps the clock through a failed draw', async () => {
  fakeIntervals();

  const cache = cacheOverMemory();

  cache.server.pacing = { every: interval };

  const screen = onScreen(cache, issues);

  await settled();
  cache.server.failing = 'GitHub refused the read';
  await after(interval);
  expect(screen.answer()).toEqual({
    ok: false,
    error: 'GitHub refused the read',
    every: interval,
  });
  cache.server.failing = undefined;
  await after(interval);
  expect(kept(screen.answer()).every).toBe(interval);
  expect(cache.server.requests).toHaveLength(3);
  screen.leave();
});

it('draws a live tree only from its subscription, which builds on the tree kept', async () => {
  fakeIntervals();

  const cache = cacheOverMemory();

  cache.server.pacing = { every: interval, live: true };

  const screen = onScreen(cache, issues);

  await settled();

  const first = kept(screen.answer());

  cache.addresses.markStale({ pluginId: 'tracker' });
  await after(interval * 2);
  expect(cache.server.requests).toHaveLength(1);

  cache.addresses.followLive(issues, () => null);
  expect(cache.live.latest().request).toMatchObject({
    pluginId: 'tracker',
    path: '/issues',
    known: first.hash,
  });

  const next = retitled(first.root, 'Row 0 again');
  const patch = patchOnto(first, next);

  cache.live.send(patch);
  expect(screen.answer()).toMatchObject({
    ok: true,
    root: next,
    hash: patch.hash,
    live: true,
  });
  expect(rowsOf(screen.answer())[1]).toBe(rowsOf(first)[1]);
  screen.leave();
});

it('subscribes again from a whole tree when a patch builds on a tree the App does not keep', async () => {
  const cache = cacheOverMemory();

  cache.server.pacing = { live: true };

  const screen = onScreen(cache, issues);

  await settled();

  const before = screen.answer();
  let asked = 0;

  cache.addresses.followLive(issues, () => {
    asked += 1;
  });
  cache.live.send({ kind: 'patch', base: 'other', ops: [], hash: 'next' });

  expect(asked).toBe(1);
  expect(cache.live.latest().open).toBe(false);
  expect(screen.answer()).toBe(before);
  screen.leave();
});

it('keeps why a live page failed and draws it again, so a Plugin that ran again is followed afresh', async () => {
  const cache = cacheOverMemory();

  cache.server.pacing = { live: true };

  const screen = onScreen(cache, issues);

  await settled();
  cache.addresses.followLive(issues, () => null);
  cache.live.send({ kind: 'failed', error: 'Plugin stopped' });
  expect(screen.answer()).toEqual({ ok: false, error: 'Plugin stopped' });
  await settled();
  expect(cache.server.requests).toHaveLength(2);
  expect(kept(screen.answer()).live).toBe(true);
  screen.leave();
});

it('backs off between tries of a live page that keeps failing, so it does not loop at network speed', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  onTestFinished(() => {
    vi.useRealTimers();
  });

  const cache = cacheOverMemory();

  cache.server.pacing = { live: true };

  const screen = onScreen(cache, issues);

  await vi.advanceTimersByTimeAsync(0);

  // A page shown while it is live subscribes; its Loader fails after the first frame, and it is drawn again.
  for (let tick = 0; tick < 120_000; tick += 100) {
    const shown = screen.answer();

    if (shown?.ok && shown.live) {
      cache.addresses.followLive(issues, () => null);
      cache.live.send({ kind: 'failed', error: 'Plugin stopped' });
    }

    await vi.advanceTimersByTimeAsync(100);
  }

  // Drawn again at once, then after 1, 2, 4, 8, 16 and 30 seconds, and every 30 after: a handful in two minutes.
  expect(cache.server.requests.length).toBeGreaterThan(5);
  expect(cache.server.requests.length).toBeLessThan(15);
  screen.leave();
});

// The tree with its first List's first row titled anew.
function retitled(root: WireNode, title: string): WireNode {
  const [list] = root.children;

  if (!list) throw new Error('No List');

  const [row, ...rest] = list.children;

  if (!row) throw new Error('No row');

  const changed = { ...row, props: { ...row.props, title } };

  return { ...root, children: [{ ...list, children: [changed, ...rest] }] };
}

// The live patch from the tree kept to the next.
function patchOnto({ root, hash }: Kept, next: WireNode): LiveTree {
  const patch = liveAnswer(next, { root, hash: String(hash) });

  if (!patch) throw new Error('The trees are the same');

  return patch;
}
