import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { PluginManifest } from '@repo/contracts/plugins';
import { onTestFinished } from 'vitest';

export const pluginId = 'harness-fixture';

export async function hookFixture(
  source: string,
  hooks: string[] = ['prompt.submit'],
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-hooks-kit-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('./plugin/', import.meta.url)), directory, {
    recursive: true,
  });

  await writeHookFixture(directory, source, hooks);

  return directory;
}

async function writeHookFixture(
  directory: string,
  source: string,
  hooks: string[],
): Promise<void> {
  const manifest = PluginManifest.parse(
    JSON.parse(await readFile(join(directory, 'plugin.json'), 'utf8')),
  );

  await writeFile(
    join(directory, 'plugin.json'),
    hookManifest(manifest, hooks),
  );
  await writeFile(join(directory, manifest.main), source);
}

function hookManifest(manifest: PluginManifest, hooks: string[]): string {
  const capabilities = hooks.includes('process.spawn')
    ? [{ kind: 'hook', event: 'process.spawn' }]
    : [];

  return JSON.stringify({
    ...manifest,
    capabilities,
    contributes: { ...manifest.contributes, hooks },
  });
}

export async function startHookTest(
  source: string,
  hooks?: string[],
): Promise<PluginTest> {
  const kit = await startPluginTest({
    directory: await hookFixture(source, hooks),
    pluginId,
    version: '0.0.0',
    clockStart: 0,
  });

  onTestFinished(() => kit.close());

  return kit;
}

export const promptEvent = {
  sessionId: 'test-session',
  projectId: 'test-project',
  prompt: [{ type: 'text', text: 'Hello' }],
};
