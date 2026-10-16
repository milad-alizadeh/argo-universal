import { describe, expect, it } from 'vitest';
import { type AgentRows, agentsPage, featuredAgents } from './agent-rows';
import { featuredIds } from './featured-ids';
import type { InstalledAgents, RegistryLoad } from './installed-agents';
import {
  amp,
  ampEntry,
  bolt,
  entry,
  loaded,
  registry,
  registryOf,
  server,
  zed,
  zedEntry,
} from './installed-agents.mocks';

const loadedRegistry: RegistryLoad = { status: 'loaded', registry };

type RowState = { id: string; installed: boolean; unavailable: boolean };

const rowState = ({ rows }: AgentRows): RowState[] =>
  rows.map(({ id, installed, unavailable }) => ({
    id,
    installed,
    unavailable,
  }));

describe('agentsPage', () => {
  it('waits for the Installed Agents instead of offering Install on every row', () => {
    const page = agentsPage({ status: 'loading' }, loadedRegistry);

    expect(page).toEqual({ status: 'loading', rows: [] });
  });

  it('lists Installed Agents first, then the rest of the Registry by name', () => {
    const page = agentsPage(loaded(zed), loadedRegistry);

    expect({ status: page.status, rows: rowState(page) }).toEqual({
      status: 'loaded',
      rows: [
        { id: zed.id, installed: true, unavailable: false },
        { id: ampEntry.id, installed: false, unavailable: false },
        { id: bolt.id, installed: false, unavailable: true },
      ],
    });
  });

  it('keeps an Installed Agent available on a platform the Registry cannot run it on', () => {
    const page = agentsPage(loaded(server(bolt.id, bolt.name)), loadedRegistry);

    expect(rowState(page)[0]).toEqual({
      id: bolt.id,
      installed: true,
      unavailable: false,
    });
  });

  it.each([
    { load: { status: 'loading' }, status: 'loading' },
    { load: { status: 'failed' }, status: 'failed' },
  ] as const)(
    'shows the Installed Agents while the Registry is $status',
    ({ load, status }) => {
      const page = agentsPage(loaded(zed, amp), load);

      expect({ status: page.status, rows: rowState(page) }).toEqual({
        status,
        rows: [
          { id: amp.id, installed: true, unavailable: false },
          { id: zed.id, installed: true, unavailable: false },
        ],
      });
    },
  );

  it('fails with no rows when the Installed Agents fail to load', () => {
    expect(agentsPage({ status: 'failed' }, loadedRegistry)).toEqual({
      status: 'failed',
      rows: [],
    });
  });
});

describe('featuredAgents', () => {
  const [first, second, third, fourth] = featuredIds;

  const delta = entry(first, 'Delta');

  const alpha = entry(second, 'Alpha');

  const charlie = entry(third, 'Charlie');

  const bravo = entry(fourth, 'Bravo');

  const featuredRegistry: RegistryLoad = {
    status: 'loaded',
    registry: registryOf(
      { entry: delta, support: 'npx' },
      { entry: zedEntry, support: 'npx' },
      { entry: alpha, support: 'binary' },
      { entry: charlie, support: 'unavailable' },
      { entry: bravo, support: 'unavailable' },
    ),
  };

  it('offers the featured Agents this platform runs by name, marking the installed ones', () => {
    const featured = featuredAgents(
      loaded(server(delta.id, delta.name), server(charlie.id, charlie.name)),
      featuredRegistry,
    );

    expect({ status: featured.status, rows: rowState(featured) }).toEqual({
      status: 'loaded',
      rows: [
        { id: alpha.id, installed: false, unavailable: false },
        { id: charlie.id, installed: true, unavailable: false },
        { id: delta.id, installed: true, unavailable: false },
      ],
    });
  });

  it.each([
    {
      installed: { status: 'loading' },
      registry: featuredRegistry,
      status: 'loading',
    },
    { installed: loaded(), registry: { status: 'loading' }, status: 'loading' },
    { installed: loaded(), registry: { status: 'failed' }, status: 'failed' },
  ] satisfies {
    installed: InstalledAgents;
    registry: RegistryLoad;
    status: AgentRows['status'];
  }[])(
    'has no tiles while the Installed Agents are $installed.status and the Registry is $registry.status',
    ({ installed, registry: load, status }) => {
      expect(featuredAgents(installed, load)).toEqual({ status, rows: [] });
    },
  );
});
