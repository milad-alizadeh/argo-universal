import { expect, it } from 'vitest';
import { treeKey } from './features/plugins/utils/page-keys';
import { createQueryClient } from './query-cache';

const minuteMs = 60_000;

it('keeps a Plugin page tree in memory far longer than the default five minutes after its page is left', () => {
  const key = treeKey({
    pluginId: 'tracker',
    path: '/issues',
    pageState: {},
  });

  const kept = createQueryClient().getQueryDefaults(key);

  expect(kept.gcTime).toBeGreaterThanOrEqual(60 * minuteMs);
});
