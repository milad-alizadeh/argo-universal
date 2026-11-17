import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';
import { discoverPlugins } from './discovery/loader';
import { LocatedCache } from './located-cache';
import { PluginService } from './service';

async function serviceOf(
  plugins: Parameters<typeof createRuntimePlugins>[0],
): Promise<{
  service: PluginService;
  discoveries: () => number;
  activated: string[];
  cache: LocatedCache;
}> {
  const home = await createRuntimePlugins(plugins);
  let runs = 0;
  const activated: string[] = [];
  const settings = new Map<string, boolean>();

  const cache = new LocatedCache((deps, locations) => {
    runs += 1;

    return discoverPlugins(deps, locations);
  });

  const pluginRuntime = {
    activate: (location: { entry: { pluginId: string } }) => {
      activated.push(location.entry.pluginId);

      return Promise.resolve({ state: 'running' });
    },
    hooks: {
      exempt: () => new Set<string>(),
      run: () => Promise.resolve({ decision: 'ask' }),
    },
    items: { refresh: { restarted: vi.fn() } },
    status: () => ({ state: 'running' }),
    error: () => null,
    refreshProjects: () => Promise.resolve(),
    deactivate: vi.fn(),
  };

  const service = new PluginService({
    home,
    version: '1.2.3',
    firstPartyPluginsDirectory: join(home, shippedFolder),
    located: cache,
    pluginRuntime,
    pluginAccounts: { list: () => [], grants: () => [], removePlugin: vi.fn() },
    pluginSettings: {
      enabled: (id: string) => settings.get(id) ?? true,
      setEnabled: (id: string, enabled: boolean) => {
        settings.set(id, enabled);

        return Promise.resolve();
      },
      values: () => Promise.resolve({ values: {}, secretsSet: [] }),
      change: () => Promise.resolve(),
    },
  } as never);

  return { service, discoveries: () => runs, activated, cache };
}

const fixtures = [
  { id: 'one', fixture: 'healthy' },
  { id: 'two', fixture: 'healthy', hooks: ['prompt.submit' as const] },
  { id: 'three', fixture: 'healthy' },
];

it('runs discovery once for ten draws of a running Plugin', async () => {
  const { service, discoveries } = await serviceOf(fixtures);

  for (let draw = 0; draw < 10; draw += 1) await service.activate('one');

  expect(discoveries()).toBe(1);
});

it('answers a tool.check nobody hooks without discovery or starting a Plugin', async () => {
  const { service, discoveries, activated } = await serviceOf(fixtures);
  await service.activate('one');
  activated.length = 0;
  const before = discoveries();

  await service.runHooks('tool.check', { tool: 'x' });

  expect(discoveries()).toBe(before);
  expect(activated).toEqual([]);
});

it('stops launching a Plugin turned off, and launches it again turned on, without a restart', async () => {
  const { service } = await serviceOf(fixtures);
  await service.activate('one');
  await service.setEnabled('one', false);

  await expect(service.activate('one')).rejects.toThrow('turned off');

  await service.setEnabled('one', true);

  await expect(service.activate('one')).resolves.toMatchObject({
    state: 'running',
  });
});

it('discovers again once a dev build clears the cache', async () => {
  const { service, cache, discoveries } = await serviceOf(fixtures);
  await service.activate('one');
  cache.clear();
  await service.activate('one');

  expect(discoveries()).toBe(2);
});

it('discovers again for a Plugin the cache has not seen', async () => {
  const { service, discoveries } = await serviceOf(fixtures);
  await service.activate('one');

  await expect(service.activate('late')).rejects.toThrow('Unknown Plugin');
  expect(discoveries()).toBe(2);
});
