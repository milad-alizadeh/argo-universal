import type { AppRouter } from '@repo/engine/router';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { describe, expect, it } from 'vitest';
import { treeKey } from './features/plugins/utils/page-keys';
import { createQueryClient } from './query-cache';

const minuteMs = 60_000;

// Only the paths are read, so no Server is reached.
function procedures(
  queryClient: QueryClient,
): ReturnType<typeof createTRPCOptionsProxy<AppRouter>> {
  return createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient<AppRouter>({ links: [] }),
    queryClient,
  });
}

type Procedures = ReturnType<typeof procedures>;

interface ScreenQuery {
  queryKey: QueryKey;
}

it('keeps a Plugin page tree in memory far longer than the default five minutes after its page is left', () => {
  const key = treeKey({
    pluginId: 'tracker',
    path: '/issues',
    pageState: {},
  });

  const kept = createQueryClient().getQueryDefaults(key);

  expect(kept.gcTime).toBeGreaterThanOrEqual(60 * minuteMs);
});

describe('a kept Server list', () => {
  // Each list is read as its screen reads it, so the times are those the screen's own query gets.
  const kept = [
    [
      'agents',
      (trpc: Procedures): ScreenQuery => trpc.agent.list.queryOptions(),
    ],
    [
      'registry',
      (trpc: Procedures): ScreenQuery => trpc.registry.get.queryOptions(),
    ],
    [
      'projects',
      (trpc: Procedures): ScreenQuery => trpc.project.list.queryOptions(),
    ],
    [
      'Session list',
      (trpc: Procedures): ScreenQuery =>
        trpc.session.list.queryOptions({ archived: false }),
    ],
    [
      'System info',
      (trpc: Procedures): ScreenQuery => trpc.system.info.queryOptions(),
    ],
  ] as const;

  it.each(kept)(
    'the %s is fresh for 30 seconds and kept for 30 minutes after its screen is left',
    (_name, screenQuery) => {
      const client = createQueryClient();

      // The key a screen's own query carries is the key the defaults must match.
      const defaults = client.getQueryDefaults(
        screenQuery(procedures(client)).queryKey,
      );

      expect(defaults.staleTime).toBe(30_000);
      expect(defaults.gcTime).toBe(30 * minuteMs);
    },
  );

  it('does not change a query outside the kept lists', () => {
    const client = createQueryClient();

    const options = client.defaultQueryOptions(
      procedures(client).project.listBranches.queryOptions({ projectId: 'p' }),
    );

    expect(options.staleTime).toBeUndefined();
    expect(options.gcTime).toBeUndefined();
  });
});
