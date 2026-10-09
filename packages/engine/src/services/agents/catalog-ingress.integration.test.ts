import { agents } from '@repo/db/schema';
import {
  publishedRegistryResponse,
  rejectedRegistryValues,
} from '@repo/mocks/registry/published';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it.each(rejectedRegistryValues.map((value, index) => [index, value] as const))(
  'keeps exact published metadata and the last-good row after rejected refresh %i',
  async (_, value): Promise<void> => {
    const fetchAgents = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(publishedRegistryResponse)
      .mockResolvedValue(value);
    const { caller, database } = await startEngineTestHost({
      fetchAgents,
    });
    await caller.agents.syncCatalog();
    await expect
      .poll(async () => (await caller.agents.catalog()).syncStatus)
      .not.toMatch(/pending|running/);
    const before = await caller.agents.catalog();
    const stored = database.select().from(agents).all();
    await caller.agents.syncCatalog();
    await expect
      .poll(async () => (await caller.agents.catalog()).syncStatus)
      .not.toMatch(/pending|running/);
    const after = await caller.agents.catalog();
    expect(after).toMatchObject({
      status: 'stale',
      rejectedValues: 1,
      agents: before.agents,
      fetchedAt: before.fetchedAt,
      error: 'Registry metadata is malformed',
    });
    expect(database.select().from(agents).all()).toEqual(stored);
    expect(
      stored.map((row) => JSON.parse(row.registryMetadata ?? 'null')),
    ).toEqual(publishedRegistryResponse.agents);
  },
);
