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
  const kept: Record<string, (trpc: Procedures) => { pathKey: () => unknown[] }> =
    {
      agents: (trpc) => trpc.agent.list,
      registry: (trpc) => trpc.registry.get,
      projects: (trpc) => trpc.project.list,
      'Session list': (trpc) => trpc.session.list,
      'System info': (trpc) => trpc.system.info,
    };

  it.each(Object.entries(kept))(
    'the %s is fresh for 30 seconds and kept for 30 minutes after its screen is left',
    (_name, procedure) => {
      const client = createQueryClient();

      const defaults = client.getQueryDefaults(
        procedure(procedures(client)).pathKey(),
      );

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
