import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import {
  PluginManifest,
  type HookEventName,
  type PluginCapability,
  type PluginSettingField,
} from '@repo/contracts/plugins';
import type {
  AddOnlySlotId,
  ReplaceableSlotId,
} from '@repo/contracts/plugins/wire';
import { onTestFinished } from 'vitest';

// Fixture Plugins sit in the first-party root, the only one whose Plugins load (ADR-0030).
export const shippedFolder = 'shipped';

type FixturePlugin = {
  id: string;
  fixture: string;
  dev?: boolean;
  main?: string;
  capabilities?: PluginCapability[];
  settings?: PluginSettingField[];
  hooks?: HookEventName[];
  // The add-only Slots the manifest declares.
  slots?: AddOnlySlotId[];
  // The Replaceable Slots its `ui.render` Hook draws.
  renders?: ReplaceableSlotId[];
  accounts?: PluginManifest['contributes']['accounts'];
  order?: number;
  // What the manifest adds to declared Slots, such as Session header actions.
  declared?: PluginManifest['contributes']['declared'];
};

export async function createRuntimePlugins(
  plugins: FixturePlugin[],
): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-runtime-'));

  onTestFinished(() => rm(home, { recursive: true, force: true }));

  for (const plugin of plugins) await writePlugin(home, plugin);

  return home;
}

export async function writePlugin(
  home: string,
  plugin: FixturePlugin,
): Promise<void> {
  const folder = join(home, shippedFolder, plugin.id);
  const main = plugin.main ?? 'index.mjs';

  await mkdir(folder, { recursive: true });
  await writeManifest({ ...plugin, folder, main });
  await copyPluginFixture(plugin.fixture, folder, main);

  if (plugin.dev) await addDevSource(folder);
}

const copyPluginFixture = async (
  fixture: string,
  folder: string,
  main: string,
): Promise<void> => {
  await cp(
    new URL(`./plugin-runtime/${fixture}${extname(main)}`, import.meta.url),
    join(folder, main),
  );
};

type ManifestInput = FixturePlugin & { folder: string; main: string };

async function writeManifest(plugin: ManifestInput): Promise<void> {
  const template = PluginManifest.parse(
    JSON.parse(
      await readFile(
        new URL('./plugins/user/hello/plugin.json', import.meta.url),
        'utf8',
      ),
    ),
  );

  await writeFile(
    join(plugin.folder, 'plugin.json'),
    JSON.stringify(pluginManifest(template, plugin)),
  );
}

const pluginManifest = (
  template: PluginManifest,
  plugin: ManifestInput,
): PluginManifest => ({
  ...template,
  id: plugin.id,
  main: plugin.main,
  capabilities: plugin.capabilities,
  contributes: pluginContributions(template, plugin),
});

const pluginContributions = (
  template: PluginManifest,
  plugin: ManifestInput,
): PluginManifest['contributes'] => ({
  ...template.contributes,
  hooks: plugin.hooks,
  slots: plugin.slots,
  renders: plugin.renders,
  settings: plugin.settings,
  accounts: plugin.accounts,
  order: plugin.order,
  declared: plugin.declared,
});

// A dev Plugin's entry imports a TypeScript source the Server bundles.
async function addDevSource(folder: string): Promise<void> {
  await cp(
    new URL('./plugin-runtime/check.ts', import.meta.url),
    join(folder, 'check.ts'),
  );
}
