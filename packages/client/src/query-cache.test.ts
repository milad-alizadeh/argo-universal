import { expect, it } from 'vitest';
import { feedKey, snapshotKey } from './features/feed/api/feed-cache';
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

it('keeps a Feed and its snapshot without ever going stale, far longer than ten minutes', () => {
  const client = createQueryClient();

  for (const key of [feedKey('session-1'), snapshotKey('session-1')]) {
    const kept = client.getQueryDefaults(key);

    expect(kept.staleTime).toBe(Infinity);
    expect(kept.gcTime).toBeGreaterThan(10 * minuteMs);
    expect(kept.structuralSharing).toBe(false);
  }
});
