import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginCapability } from '@repo/contracts/plugins';
import { startEngineTestHost } from './engine';
import { writeHookPlugins, type HookPlugin } from './hook-plugins';
import { probeResult, probeSource } from './probe-plugin';
import { pluginLog } from './probe-run';
import { createRuntimePlugins } from './runtime-plugins';

type HookRun = {
  results: Awaited<ReturnType<typeof probeResult>>;
  log: string;
};

export const echo: PluginCapability = {
  kind: 'process:exec',
  command: 'echo',
  args: ['**'],
};

const hookSpawn: PluginCapability = { kind: 'hook', event: 'process.spawn' };

const echoed = (text: string): string =>
  `argo.process.run(['echo', '${text}']).then((r) => r.stdout.trim())`;

// The Plugin whose `argo.process` calls the Hooks see: once it loads, it runs `echo hi`, then any later echoes named.
const probeEchoing = (...later: string[]): HookPlugin => ({
  id: 'probe',
  source: probeSource({
    echo: echoed('hi'),
    ...Object.fromEntries(later.map((text) => [text, echoed(text)])),
  }),
  capabilities: [echo],
});

export const probe = probeEchoing();

// A Plugin that hooks `process.spawn` with this hook, registered when it loads.
export const spawnHook = (id: string, hook: string): HookPlugin => ({
  id,
  source: `export async function register(argo) {
    await argo.on('process.spawn', 'echo', ${hook});
  }`,
  hooks: ['process.spawn'],
  capabilities: [hookSpawn],
});

export const appending = (marker: string): string =>
  `(ctx, e, next) => next({ ...e, argv: [...e.argv, '${marker}'] })`;

export async function runWithHooks(
  plugins: HookPlugin[],
  calling = probe,
): Promise<HookRun> {
  const home = await createRuntimePlugins([]);

  await writeHookPlugins(home, [calling, ...plugins]);
  const { caller } = await startEngineTestHost({ home });

  await caller.plugin.activate({ pluginId: 'probe' });

  return {
    results: await probeResult(
      join(await realpath(home), 'plugin-data', probe.id),
    ),
    log: await pluginLog(home),
  };
}
