import { describe, expect, it } from 'vitest';
import {
  installedAgents,
  loadedAgents,
  registryLoad,
} from './installed-agents';
import {
  amp,
  loaded,
  registryOf,
  zed,
  zedEntry,
} from './installed-agents.mocks.ts';

describe('installedAgents', () => {
  it.each([
    {
      case: 'is loading before the Server answers',
      query: { data: undefined, isError: false },
      expected: { status: 'loading' },
    },
    {
      case: 'is loaded and empty when the Server has no Installed Agents',
      query: { data: [], isError: false },
      expected: { status: 'loaded', agents: [] },
    },
    {
      case: 'fails when the Server never answered',
      query: { data: undefined, isError: true },
      expected: { status: 'failed' },
    },
    {
      case: "keeps the Server's last answer when a later load fails",
      query: { data: [zed], isError: true },
      expected: { status: 'loaded', agents: [zed] },
    },
    {
      case: 'lists Installed Agents by name',
      query: { data: [zed, amp], isError: false },
      expected: { status: 'loaded', agents: [amp, zed] },
    },
  ])('$case', ({ query, expected }) => {
    expect(installedAgents(query)).toEqual(expected);
  });
});

describe('loadedAgents', () => {
  it.each([
    { case: 'lists none while they load', agents: { status: 'loading' } },
    { case: 'lists none when they fail', agents: { status: 'failed' } },
  ] as const)('$case', ({ agents }) => {
    expect(loadedAgents(agents)).toEqual([]);
  });

  it('lists the loaded Installed Agents', () => {
    expect(loadedAgents(loaded(zed, amp))).toEqual([amp, zed]);
  });
});

const stored = registryOf({ entry: zedEntry, support: 'npx' });

describe('registryLoad', () => {
  it.each([
    {
      case: 'shows the stored Registry while it refreshes',
      load: { data: stored, refreshing: true, failed: false },
      expected: { status: 'loaded', registry: stored },
    },
    {
      case: 'shows the stored Registry when a refresh fails',
      load: { data: stored, refreshing: false, failed: true },
      expected: { status: 'loaded', registry: stored },
    },
    {
      case: 'is loading while an empty Registry refreshes',
      load: { data: registryOf(), refreshing: true, failed: false },
      expected: { status: 'loading' },
    },
    {
      case: 'is loading before the stored Registry is read',
      load: { data: undefined, refreshing: false, failed: false },
      expected: { status: 'loading' },
    },
    {
      case: 'fails when an empty Registry could not refresh',
      load: { data: registryOf(), refreshing: false, failed: true },
      expected: { status: 'failed' },
    },
    {
      case: 'fails when the Server reports a Registry error',
      load: {
        data: { agents: [], error: 'offline' },
        refreshing: false,
        failed: false,
      },
      expected: { status: 'failed' },
    },
    {
      case: 'is loaded and empty when the Registry lists no Agents',
      load: { data: registryOf(), refreshing: false, failed: false },
      expected: { status: 'loaded', registry: registryOf() },
    },
  ])('$case', ({ load, expected }) => {
    expect(registryLoad(load)).toEqual(expected);
  });
});
