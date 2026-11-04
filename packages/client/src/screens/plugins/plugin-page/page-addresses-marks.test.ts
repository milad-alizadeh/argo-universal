import type { WireNode } from '@repo/contracts/plugins/wire';
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

// The second row shown finished, the rest of the tree as it was.
const finished = (root: WireNode): WireNode => {
  const [list] = root.children;

  if (!list) return root;

  const rows = list.children.map((row) =>
    row.key === '/issues#1'
      ? { ...row, props: { ...row.props, finished: true } }
      : row,
  );

  return { ...root, children: [{ ...list, children: rows }] };
};

it('patches only the address the press came from, keeps its unpatched rows and every other tree, and puts it back', async () => {
  const cache = cacheOverMemory();
  const argo = onScreen(cache, issues);
  const site = onScreen(cache, { ...issues, projectId: 'site' });

  await settled();

  const [before, untouched] = [argo.answer(), site.answer()];
  const putBack = await cache.addresses.patch(issues, finished);
  const patched = kept(argo.answer());

  expect(rowsOf(patched)[1]?.props).toMatchObject({ finished: true });
  expect(rowsOf(patched)[0]).toBe(rowsOf(before)[0]);
  expect(patched.hash).toBeUndefined();
  expect(site.answer()).toBe(untouched);
  expect(kept(untouched).hash).toBeDefined();

  putBack();

  expect(argo.answer()).toEqual(before);
  argo.leave();
  site.leave();
});
