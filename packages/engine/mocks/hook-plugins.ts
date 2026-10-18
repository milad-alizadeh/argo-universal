import { readFile, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HookEventName, PluginCapability } from '@repo/contracts/plugins';
import { z } from 'zod';
import { shippedFolder, writePlugin } from './runtime-plugins';

export type HookPlugin = {
  id: string;
  // The entry's source; `$DATA` stands for the Plugin's data folder.
  source: string;
  hooks?: HookEventName[];
  capabilities?: PluginCapability[];
};

const recordFile = 'records.json';

// Writes first-party Plugins whose entry the test gives into an Engine home's shipped folder.
export async function writeHookPlugins(
  home: string,
  plugins: readonly HookPlugin[],
): Promise<void> {
  for (const plugin of plugins) await writeHookPlugin(home, plugin);
}

async function writeHookPlugin(
  home: string,
  { source, ...plugin }: HookPlugin,
): Promise<void> {
  await writePlugin(home, { ...plugin, fixture: 'healthy' });

  await writeFile(
    join(home, shippedFolder, plugin.id, 'index.mjs'),
    source.replaceAll('$DATA', await dataFolder(home, plugin.id)),
  );
}

const dataFolder = async (home: string, pluginId: string): Promise<string> =>
  join(await realpath(home), 'plugin-data', pluginId);

/*
 * A Plugin source that records each Hook's event in its data folder, then runs `hooks`:
 * a body that may call `on(name, hook)`, which hooks the event and records it first.
 */
export const recordingSource = (hooks: string): string => `
  const records = [];
  let writing = Promise.resolve();
  export async function register(argo) {
    const record = (ctx, e) => {
      records.push({ name: ctx.name, event: e });
      writing = writing.then(() => argo.fs.write('$DATA/${recordFile}', JSON.stringify(records)));
      return writing;
    };
    const on = (name, matcher, hook) => typeof matcher === 'function'
      ? on(name, undefined, matcher)
      : argo.on(name, matcher, async (ctx, e, next) => { await record(ctx, e); return hook(ctx, e, next); });
    ${hooks}
  }`;

const HookRecord = z.object({ name: z.string(), event: z.json() });

// Every Hook event a recording Plugin saw, in order.
export async function hookRecords(
  home: string,
  pluginId: string,
): Promise<z.infer<typeof HookRecord>[]> {
  const file = join(await dataFolder(home, pluginId), recordFile);
  const text = await readFile(file, 'utf8').catch(() => '[]');

  return z.array(HookRecord).parse(JSON.parse(text));
}
