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

const echo: PluginCapability = {
  kind: 'process:exec',
  command: 'echo',
  args: ['**'],
};

const hookSpawn: PluginCapability = { kind: 'hook', event: 'process.spawn' };

// The Plugin whose `argo.process` call the Hooks see: it runs `echo hi` once it loads.
export const probe: HookPlugin = {
  id: 'probe',
  source: probeSource({
    echo: `argo.process.run(['echo', 'hi']).then((r) => r.stdout.trim())`,
  }),
  capabilities: [echo],
};

// A Plugin that hooks `process.spawn` with this hook, registered when it loads.
export const spawnHook = (
  id: string,
  hook: string,
  options = '{}',
): HookPlugin => ({
  id,
  source: `export async function register(argo) {
    await argo.on('process.spawn', 'echo', ${hook}, ${options});
  }`,
  hooks: ['process.spawn'],
  capabilities: [hookSpawn],
});

export const appending = (marker: string): string =>
  `(ctx, e, next) => next({ ...e, argv: [...e.argv, '${marker}'] })`;

export async function runWithHooks(plugins: HookPlugin[]): Promise<HookRun> {
  const home = await createRuntimePlugins([]);

  await writeHookPlugins(home, [probe, ...plugins]);
  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  return {
    results: await probeResult(
      join(await realpath(home), 'plugin-data', probe.id),
    ),
    log: await pluginLog(home),
  };
}
