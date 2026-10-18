import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import { appending, probe, runWithHooks, spawnHook } from '#mocks/spawn-hooks';

// Each journey starts the calling Plugin and every Plugin that hooks its command.
const journeyMs = 20_000;

it.each([
  {
    name: 'without its Capability',
    plugin: { ...spawnHook('ungranted', appending('x')), capabilities: [] },
    reason: 'hooking process.spawn needs its Capability',
  },
  {
    name: 'undeclared in the manifest',
    plugin: { ...spawnHook('undeclared', appending('x')), hooks: [] },
    reason: 'process.spawn is not a Hook the manifest declares',
  },
  {
    name: 'as a guard of an event with no refusal',
    plugin: {
      ...spawnHook('observer', appending('x')),
      source: `export async function register(argo) {
        await argo.on('turn.complete', (ctx, e, next) => next(e), { guard: true });
      }`,
      hooks: ['turn.complete' as const],
    },
    reason: 'turn.complete has no refusal to guard with',
  },
])(
  'refuses a Hook registered $name, and the Plugin fails to load',
  async ({ plugin, reason }) => {
    const home = await createRuntimePlugins([]);

    await writeHookPlugins(home, [plugin]);
    const { caller } = await startEngineTestHost({ home });

    await expect(
      caller.plugins.activate({ pluginId: plugin.id }),
    ).resolves.toMatchObject({
      state: 'crashed',
      error: expect.stringContaining(reason),
    });
  },
  journeyMs,
);

it(
  'leaves a refused Hook out of the chain, so the command runs as asked',
  async () => {
    const { results } = await runWithHooks([
      { ...spawnHook('ungranted', appending('x')), capabilities: [] },
    ]);

    expect(results).toEqual({ echo: { value: 'hi' } });
  },
  journeyMs,
);

it(
  'starts a hooking Plugin only when its event first fires',
  async () => {
    const home = await createRuntimePlugins([]);

    await writeHookPlugins(home, [probe, spawnHook('lazy', appending('l'))]);
    const { caller } = await startEngineTestHost({ home });

    const status = async (): Promise<string | undefined> =>
      (await caller.plugins.list()).plugins.find(
        (plugin) => plugin.manifest.id === 'lazy',
      )?.state;

    expect(await status()).toBe('not-started');
    await caller.plugins.activate({ pluginId: 'probe' });
    expect(await status()).toBe('running');
  },
  journeyMs,
);
