import { QueryClient, type QueryFilters } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  invalidatePluginState,
  refreshLivePluginState,
} from './plugin-state-refresh';

const filters = {
  list: { queryKey: ['plugin', 'list'] },
  settings: { queryKey: ['plugin', 'getSettings'] },
  declared: { queryKey: ['plugins', 'declared'] },
};

const queryFilter = (filter: QueryFilters) => (): QueryFilters => filter;

const trpc = {
  plugin: {
    list: { queryFilter: queryFilter(filters.list) },
    getSettings: { queryFilter: queryFilter(filters.settings) },
  },
  plugins: { declared: { queryFilter: queryFilter(filters.declared) } },
};

interface SpiedClient {
  client: QueryClient;
  cancelled: QueryFilters[];
  invalidated: QueryFilters[];
}

function spiedClient(): SpiedClient {
  const client = new QueryClient();
  const cancelled: QueryFilters[] = [];
  const invalidated: QueryFilters[] = [];

  vi.spyOn(client, 'cancelQueries').mockImplementation((filter = {}) => {
    cancelled.push(filter);

    return Promise.resolve();
  });

  vi.spyOn(client, 'invalidateQueries').mockImplementation((filter = {}) => {
    invalidated.push(filter);

    return Promise.resolve();
  });

  return { client, cancelled, invalidated };
}

describe('Plugin state refreshes', () => {
  it('invalidates the list, each Plugin settings and the declared items for a Settings change, cancelling nothing', async () => {
    const { client, cancelled, invalidated } = spiedClient();

    await invalidatePluginState(client, trpc);

    expect(invalidated).toEqual([
      filters.list,
      filters.settings,
      filters.declared,
    ]);
    expect(cancelled).toEqual([]);
  });

  it('replaces the list and the declared items for a live change, leaving Plugin settings alone', async () => {
    const { client, cancelled, invalidated } = spiedClient();

    await refreshLivePluginState(client, trpc);

    expect(cancelled).toEqual([filters.list, filters.declared]);
    expect(invalidated).toEqual([filters.list, filters.declared]);
  });
});
