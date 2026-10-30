import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginTest, PluginTestView } from '@argo/plugin-kit/testing';
import { dataFixture } from './data-fixture';

export const webSurface = { platform: 'web' as const };

export function keyOf(page: PluginTestView, label: string): string {
  const entry = page.findText(label);

  if (!entry) throw new Error(`Plugin node not found: ${label}`);

  return entry.key;
}

async function writeAssets(directory: string, files: string[]): Promise<void> {
  await mkdir(join(directory, 'assets'));

  for (const file of files)
    await writeFile(join(directory, 'assets', file), file);
}

// A fixture Plugin on disk; `assets` names files to write under `assets/`. The Server takes a file's format from its extension, so placeholder bytes are enough.
export async function startKit(
  source: string,
  assets: string[] = [],
): Promise<PluginTest> {
  const fixture = await dataFixture(source);

  if (assets.length > 0) await writeAssets(fixture.directory, assets);

  return fixture.start({ clockStart: 0 });
}
