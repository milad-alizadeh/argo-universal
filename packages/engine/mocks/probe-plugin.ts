import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { createRuntimePlugins } from './runtime-plugins';

export const outFile = 'out.json';

export async function scratch(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-plugin-argo-'));

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  return directory;
}

// A Plugin is a fixture whose source the test writes, so each scenario names the paths it touches.
export async function installed(
  source: string,
  options: { dev?: boolean } = {},
): Promise<{ home: string; entry: string }> {
  const home = await createRuntimePlugins([
    { id: 'probe', fixture: 'healthy', ...options },
  ]);

  const entry = join(home, 'plugins/probe/index.mjs');

  await writeFile(entry, source);

  return { home, entry };
}
