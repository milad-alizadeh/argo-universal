import { describe, expect, it } from 'vitest';
import { agentsPage } from './agent-rows';
import { filterAgents } from './agents-filter';
import { amp, bolt, loaded, registry, zed } from './installed-agents.mocks';

describe('filterAgents', () => {
  it.each([
    { filter: 'all', search: '', ids: [zed.id, amp.id, bolt.id] },
    { filter: 'installed', search: '', ids: [zed.id] },
    { filter: 'not-installed', search: '', ids: [amp.id, bolt.id] },
    { filter: 'all', search: '  BOLT ', ids: [bolt.id] },
    { filter: 'all', search: 'writes code', ids: [zed.id, amp.id, bolt.id] },
    { filter: 'installed', search: 'amp', ids: [] },
  ] as const)(
    'shows $ids for the $filter filter and search "$search"',
    ({ filter, search, ids }) => {
      const { rows } = agentsPage(loaded(zed), { status: 'loaded', registry });

      expect(filterAgents(rows, filter, search).map(({ id }) => id)).toEqual(
        ids,
      );
    },
  );
});
