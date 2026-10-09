import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startRouterTestHost } from '#mocks/router';

it('coalesces concurrent catalog requests into one registry read', async (): Promise<void> => {
  const pending = Promise.withResolvers<unknown>();
  const readRegistry = vi.fn<() => Promise<unknown>>(() => pending.promise);
  const { caller } = startRouterTestHost({ registry: { readRegistry } });
  const requests = [
    caller.agents.catalog(),
    caller.agents.catalog({ refresh: true }),
  ];
  await vi.waitFor(() => expect(readRegistry).toHaveBeenCalledTimes(1));
  pending.resolve(publishedRegistry);
  const results = await Promise.all(requests);
  expect(results.map((catalog) => catalog.status)).toEqual(['fresh', 'fresh']);
  expect(readRegistry).toHaveBeenCalledTimes(1);
});

it('rejects a malformed on-disk cache before serving metadata', async (): Promise<void> => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  await writeFile(join(stored.directory, 'agent-registry.json'), '{broken');
  const { caller } = startRouterTestHost({
    database: stored.database,
    runtimeDirectory: stored.directory,
    registry: {
      readRegistry: async (): Promise<never> => {
        throw new Error('Registry is offline');
      },
    },
  });
  expect(await caller.agents.catalog()).toMatchObject({
    status: 'unavailable',
    agents: [],
    error: 'Registry is offline',
    rejectedValues: 1,
  });
});
