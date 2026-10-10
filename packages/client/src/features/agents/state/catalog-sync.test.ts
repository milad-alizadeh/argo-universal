import type { AgentsCatalogOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { applyCatalogSync } from './catalog-sync';

const saved: AgentsCatalogOutput = {
  status: 'fresh',
  syncStatus: 'idle',
  serverPlatform: 'darwin-aarch64',
  fetchedAt: 1791504000000,
  error: null,
  rejectedValues: 0,
  agents: [],
};
const stopping = 'The Server is stopping';
const idle = { pending: false, error: null };

describe('applyCatalogSync', () => {
  it('waits for the saved catalog', () => {
    expect(
      applyCatalogSync({ catalog: undefined, error: null }, idle).load,
    ).toEqual({
      status: 'loading',
    });
  });

  it('reports a catalog the Server could not read', () => {
    expect(
      applyCatalogSync({ catalog: undefined, error: stopping }, idle).load,
    ).toEqual({
      status: 'failed',
      message: stopping,
    });
  });

  it('shows the saved catalog while no refresh has failed', () => {
    expect(
      applyCatalogSync({ catalog: saved, error: null }, idle).load,
    ).toEqual({ status: 'loaded', catalog: saved });
  });

  it('keeps the saved catalog over a later read error', () => {
    expect(
      applyCatalogSync({ catalog: saved, error: 'Server lost' }, idle).load,
    ).toEqual({ status: 'loaded', catalog: saved });
  });

  it('marks a saved catalog stale when its refresh is refused', () => {
    const sync = { pending: false, error: stopping };
    expect(
      applyCatalogSync({ catalog: saved, error: null }, sync).load,
    ).toEqual({
      status: 'loaded',
      catalog: { ...saved, status: 'stale', error: stopping },
    });
  });

  it('marks a never-fetched catalog unavailable when its refresh is refused', () => {
    const never = { ...saved, fetchedAt: null };
    const sync = { pending: false, error: stopping };
    expect(
      applyCatalogSync({ catalog: never, error: null }, sync).load,
    ).toEqual({
      status: 'loaded',
      catalog: {
        ...never,
        status: 'unavailable',
        error: stopping,
      },
    });
  });

  it.each(['pending', 'running'] as const)(
    'is refreshing while the Server sync is %s',
    (syncStatus) => {
      const catalog = { ...saved, syncStatus };
      expect(applyCatalogSync({ catalog, error: null }, idle).refreshing).toBe(
        true,
      );
    },
  );

  it.each(['idle', 'failed'] as const)(
    'is not refreshing once the Server sync is %s',
    (syncStatus) => {
      const catalog = { ...saved, syncStatus };
      expect(applyCatalogSync({ catalog, error: null }, idle).refreshing).toBe(
        false,
      );
    },
  );

  it('is refreshing while the refresh request is in flight', () => {
    const sync = { pending: true, error: null };
    expect(
      applyCatalogSync({ catalog: undefined, error: null }, sync).refreshing,
    ).toBe(true);
  });
});
