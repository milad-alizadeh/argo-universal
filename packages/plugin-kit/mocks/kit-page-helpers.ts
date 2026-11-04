import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginTest } from '@argo/plugin-kit/testing';
import type { Contributions } from '@repo/engine/mocks/data-fixture';
import { dataFixture } from './data-fixture';

async function writeAssets(directory: string, files: string[]): Promise<void> {
  if (files.length === 0) return;

  await mkdir(join(directory, 'assets'));

  for (const file of files)
    await writeFile(join(directory, 'assets', file), file);
}

// A fixture Plugin on disk; `assets` names files to write under `assets/`. The Server takes a file's format from its extension, so placeholder bytes are enough.
export async function startKit(
  source: string,
  assets: string[] = [],
  contributes: Contributions = {},
): Promise<PluginTest> {
  const fixture = await dataFixture(source, contributes);
  await writeAssets(fixture.directory, assets);

  return fixture.start({ clockStart: 0 });
}
