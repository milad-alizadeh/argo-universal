import { expect, it } from 'vitest';
import {
  cacheOverMemory,
  issues,
  kept,
  onScreen,
  rowsOf,
  settled,
} from './page-addresses-fixtures';

it('draws again only the address a stale mark names, matched as the Server names it', async () => {
  const cache = cacheOverMemory();
  const one = onScreen(cache, issues);
  const two = onScreen(cache, { ...issues, projectId: 'site' });

  await settled();
  cache.server.requests.length = 0;

  const named = { pluginId: 'tracker', path: '/issues', pageState: {} };

  cache.addresses.markStale({
    pluginId: 'tracker',
    addresses: [{ ...named, projectId: 'site' }],
  });
  await settled();

  expect(cache.server.requests.map(({ projectId }) => projectId)).toEqual([
    'site',
  ]);
  one.leave();
  two.leave();
});

it('marks a draw in flight again once it lands, since it read before the change', async () => {
  const cache = cacheOverMemory();

  cache.server.hold();

  const screen = onScreen(cache, issues);

  await settled();
  cache.server.write();
  cache.addresses.markStale({ pluginId: 'tracker' });
  cache.server.release();
  await settled();

  expect(cache.server.requests).toHaveLength(2);
  expect(rowsOf(screen.answer())[0]?.props.edition).toBe(1);
  screen.leave();
});

it('patches only the calling Plugin trees holding a named node, keeps every other tree and its hash, and puts them back', async () => {
  const cache = cacheOverMemory();
  const tracker = onScreen(cache, issues);
  const closed = onScreen(cache, { ...issues, path: '/closed' });
  const other = onScreen(cache, { ...issues, pluginId: 'notes' });

  await settled();

  const [before, unnamed, untouched] = [tracker, closed, other].map((screen) =>
    screen.answer(),
  );

  const snapshot = await cache.addresses.showOptimistic('tracker', {
    operation: 'close',
    args: {},
    optimistic: [{ key: '/issues#1', props: { finished: true } }],
  });

  const patched = kept(tracker.answer());

  expect(rowsOf(patched)[1]?.props).toMatchObject({ finished: true });
  expect(rowsOf(patched)[0]).toBe(rowsOf(before)[0]);
  expect(patched.hash).toBeUndefined();
  expect(closed.answer()).toBe(unnamed);
  expect(other.answer()).toBe(untouched);
  expect(kept(untouched).hash).toBeDefined();

  cache.addresses.putBack(snapshot);

  expect(tracker.answer()).toEqual(before);

  for (const screen of [tracker, closed, other]) screen.leave();
});
