import { agentCatalogCache } from '@repo/db/schema';
import {
  publishedRegistryResponse,
  rejectedRegistryValues,
} from '@repo/mocks/registry/published';
import { expect, it, vi } from 'vitest';
import { startRouterTestHost } from '#mocks/router';

it.each(rejectedRegistryValues.map((value, index) => [index, value] as const))(
  'keeps exact published metadata and the last-good row after rejected refresh %i',
  async (_, value): Promise<void> => {
    const readRegistry = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(publishedRegistryResponse)
      .mockResolvedValue(value);
    const { caller, context } = startRouterTestHost({
      registry: { readRegistry },
    });
    const before = await caller.agents.catalog();
    const stored = context.database.select().from(agentCatalogCache).get();
    const after = await caller.agents.catalog({ refresh: true });
    expect(after).toMatchObject({
      status: 'stale',
      rejectedValues: 1,
      agents: before.agents,
      fetchedAt: before.fetchedAt,
      error: 'Registry metadata is malformed',
    });
    expect(context.database.select().from(agentCatalogCache).get()).toEqual(
      stored,
    );
    expect(stored && JSON.parse(stored.payload)).toEqual(
      publishedRegistryResponse,
    );
    expect(stored && JSON.parse(stored.payload).extensions).toEqual([]);
  },
);
