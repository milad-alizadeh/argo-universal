import { describe, expect, it } from 'vitest';
import { type AgentRows, agentsPage } from './agent-rows';
import type { RegistryLoad } from './installed-agents';
import {
  amp,
  ampEntry,
  bolt,
  loaded,
  registry,
  server,
  zed,
} from './installed-agents.mocks.ts';

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
      failed: 'installed',
      rows: [],
    });
  });

  it('names the Registry when only the Registry fails to load', () => {
    expect(agentsPage(loaded(zed), { status: 'failed' })).toMatchObject({
      status: 'failed',
      failed: 'registry',
    });
  });

  it('names the Installed Agents when both fail to load', () => {
    expect(
      agentsPage({ status: 'failed' }, { status: 'failed' }),
    ).toMatchObject({ status: 'failed', failed: 'installed' });
  });
});
