import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { PluginManifest, type PluginCapability } from '@repo/contracts/plugins';
import { onTestFinished } from 'vitest';

// Fixture Plugins sit in the first-party root, the only one whose Plugins load (ADR-0030).
export const shippedFolder = 'shipped';

type FixturePlugin = {
  id: string;
  fixture: string;
  dev?: boolean;
  main?: string;
  capabilities?: PluginCapability[];
};

export async function createRuntimePlugins(
  plugins: FixturePlugin[],
): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-runtime-'));

  onTestFinished(() => rm(home, { recursive: true, force: true }));

  for (const plugin of plugins) await writePlugin(home, plugin);

  return home;
}

async function writePlugin(home: string, plugin: FixturePlugin): Promise<void> {
  const folder = join(home, shippedFolder, plugin.id);
  const main = plugin.main ?? 'index.mjs';

  await mkdir(folder, { recursive: true });
  await writeManifest({
    folder,
    id: plugin.id,
    main,
    capabilities: plugin.capabilities,
  });
  await cp(
    new URL(
      `./plugin-runtime/${plugin.fixture}${extname(main)}`,
      import.meta.url,
    ),
    join(folder, main),
  );

  if (plugin.dev) await addDevSource(folder);
}

async function writeManifest({
  folder,
  id,
  main,
  capabilities,
}: {
  folder: string;
  id: string;
  main: string;
  capabilities?: PluginCapability[];
}): Promise<void> {
  const template = PluginManifest.parse(
    JSON.parse(
      await readFile(
        new URL('./plugins/user/hello/plugin.json', import.meta.url),
        'utf8',
      ),
    ),
  );

  await writeFile(
    join(folder, 'plugin.json'),
    JSON.stringify({ ...template, id, main, capabilities }),
  );
}

// A dev Plugin's entry imports a TypeScript source the Server bundles.
async function addDevSource(folder: string): Promise<void> {
  await cp(
    new URL('./plugin-runtime/check.ts', import.meta.url),
    join(folder, 'check.ts'),
  );
}
