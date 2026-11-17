import { expect, it } from 'vitest';
import { createQueryClient } from './query-cache';

const minuteMs = 60_000;

it('keeps a Plugin page tree in memory far longer than the default five minutes after its page is left', () => {
  const kept = createQueryClient().getQueryDefaults([
    'pluginPageTree',
    'tracker',
    '/issues',
  ]);

  expect(kept.gcTime).toBeGreaterThanOrEqual(60 * minuteMs);
});
