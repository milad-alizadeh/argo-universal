import type { AppRouter } from '@repo/engine/router';
import type { QueryClient } from '@tanstack/react-query';
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
  const kept = [
    [
      'agents',
      (trpc: Procedures): readonly unknown[] => trpc.agent.list.pathKey(),
    ],
    [
      'registry',
      (trpc: Procedures): readonly unknown[] => trpc.registry.get.pathKey(),
    ],
    [
      'projects',
      (trpc: Procedures): readonly unknown[] => trpc.project.list.pathKey(),
    ],
    [
      'Session list',
      (trpc: Procedures): readonly unknown[] => trpc.session.list.pathKey(),
    ],
    [
      'System info',
      (trpc: Procedures): readonly unknown[] => trpc.system.info.pathKey(),
    ],
  ] as const;

  it.each(kept)(
    'the %s is fresh for 30 seconds and kept for 30 minutes after its screen is left',
    (_name, pathKeyOf) => {
      const client = createQueryClient();

      const defaults = client.getQueryDefaults(pathKeyOf(procedures(client)));

      expect(defaults.staleTime).toBe(30_000);
      expect(defaults.gcTime).toBe(30 * minuteMs);
    },
  );

  it('does not change a query outside the kept lists', () => {
    const client = createQueryClient();

    const defaults = client.getQueryDefaults(
      procedures(client).project.listBranches.pathKey(),
    );

    expect(defaults.gcTime).toBeUndefined();
    expect(defaults.staleTime).toBeUndefined();
  });
});
