import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';
import { discoverPlugins } from './discovery/loader';
import { LocatedCache } from './located-cache';
import type { ServiceSettings } from './located-plugins';
import { createPluginRuntime } from './runtime/create-runtime';
import type { PluginRuntime } from './runtime/plugin-runtime';
import { PluginService } from './service';

// The real runtime, with only what counts launches replaced; no worker ever starts.
function fakeRuntime(home: string, activated: string[]): PluginRuntime {
  const runtime = createPluginRuntime(home, {
    projects: async () => [],
    projectIds: async () => [],
    projectInfo: async () => [],
  });

  vi.spyOn(runtime, 'activate').mockImplementation(async (location) => {
    activated.push(location.entry.pluginId);

    return { state: 'running', hanging: false, error: null };
  });
  vi.spyOn(runtime, 'refreshProjects').mockResolvedValue();

  return runtime;
}

function settingsOf(settings: Map<string, boolean>): ServiceSettings {
  return {
    enabled: (id) => settings.get(id) ?? true,
    setEnabled: async (id, enabled): Promise<void> => {
      settings.set(id, enabled);
    },
    values: async (): ReturnType<ServiceSettings['values']> => ({
      values: {},
      secretsSet: [],
    }),
    change: async (): Promise<void> => {},
  };
}

// These tests never draw a Draft, so no Session is drawing one.
const noDrafts: ConstructorParameters<typeof PluginService>[1] = {
  sessionOf: () => null,
  choice: () => null,
  drawnBy: () => Promise.resolve(),
  choose: () => Promise.resolve(),
};

async function serviceOf(
  plugins: Parameters<typeof createRuntimePlugins>[0],
  dev?: true,
): Promise<{
  service: PluginService;
  discoveries: () => number;
  activated: string[];
  cache: LocatedCache;
}> {
  const home = await createRuntimePlugins(plugins);
  let runs = 0;
  const activated: string[] = [];

  const cache = new LocatedCache((deps, locations) => {
    runs += 1;

    return discoverPlugins(deps, locations);
  });

  const pluginRuntime = fakeRuntime(home, activated);

  const service = new PluginService(
    {
      home,
      version: '1.2.3',
      firstPartyPluginsDirectory: join(home, shippedFolder),
      located: cache,
      pluginRuntime,
      pluginAccounts: {
        list: (): never[] => [],
        grants: (): never[] => [],
        removePlugin: vi.fn<() => Promise<void>>(),
      },
      pluginSettings: settingsOf(new Map()),
      ...(dev && { dev }),
    },
    noDrafts,
  );

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

it('lists every Plugin as dev while the Server watches Plugins', async () => {
  const { service } = await serviceOf(fixtures, true);
  const { plugins } = await service.list();

  expect(plugins.map(({ dev }) => dev)).toEqual([true, true, true]);
});

it('lists no Plugin as dev on a Server that does not watch Plugins', async () => {
  const { service } = await serviceOf(fixtures);
  const { plugins } = await service.list();

  expect(plugins.some((plugin) => 'dev' in plugin)).toBe(false);
});
