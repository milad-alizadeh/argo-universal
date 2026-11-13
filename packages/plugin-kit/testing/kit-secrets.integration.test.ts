import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  startPluginTest,
  type PluginTest,
  type PluginTestOptions,
} from '@argo/plugin-kit/testing';
import type { PluginManifest } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { redactedSecret } from '@repo/contracts/plugins/plugin-operations';
import {
  absentSecretStore,
  MemorySecretStore,
} from '@repo/engine/mocks/secret-store';
import { expect, it, onTestFinished } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

type DeclaredOperation = NonNullable<
  PluginManifest['contributes']['operations']
>[number];

const operation = (name: string): DeclaredOperation => ({
  name,
  label: name,
  description: `Runs ${name}.`,
  tier: 'act' as const,
  params: {},
});

// Each Plugin keeps, reads and drops its `token` through `argo.secrets`, and reads its `api-key` secret Setting.
const source = (id: string): string => `export function register(argo) {
  argo.operations.register('keep', () => argo.secrets.set('token', 'kept by ${id}'));
  argo.operations.register('read', () => argo.secrets.get('token'));
  argo.operations.register('drop', () => argo.secrets.delete('token'));
  argo.operations.register('readSetting', () => argo.settings.get('api-key'));
  argo.operations.register('readApiKeySecret', () => argo.secrets.get('api-key'));
}`;

const manifest = (id: string): PluginManifest => ({
  id,
  name: id,
  version: '1.0.0',
  engines: { argo: '>=0.0.0 <2' },
  main: 'index.js',
  icon: { material: 'key' },
  contributes: {
    nav: [],
    operations: ['keep', 'read', 'drop', 'readSetting', 'readApiKeySecret'].map(
      operation,
    ),
    settings: [
      {
        key: 'api-key',
        type: 'secret',
        label: 'API key',
        description: 'Kept in the OS secret store.',
      },
    ],
  },
  capabilities: [],
});

// Two Plugins in one folder, so one's Secrets can be looked for from the other.
async function twoPlugins(): Promise<string> {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'argo-kit-secrets-')),
  );

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  for (const id of ['one', 'two']) {
    await mkdir(join(directory, id));
    await writeFile(
      join(directory, id, 'plugin.json'),
      JSON.stringify(manifest(id)),
    );
    await writeFile(join(directory, id, 'index.js'), source(id));
  }

  return directory;
}

async function start(
  options: Partial<PluginTestOptions> = {},
): Promise<PluginTest> {
  const kit = await startPluginTest({
    directory: await twoPlugins(),
    pluginId: 'one',
    version: '0.0.0',
    ...options,
  });

  onTestFinished(() => kit.close());

  return kit;
}

const run = (kit: PluginTest, name: string, pluginId = 'one'): Promise<Json> =>
  kit.operations.run({ name, pluginId });

// A run answers no Secret's value, only that one is there (ADR-0051).
it("keeps each Plugin's Secrets apart from every other Plugin's, and answers none of them", async () => {
  const secretStore = new MemorySecretStore();
  const kit = await start({ secretStore });

  await run(kit, 'keep', 'one');

  expect(await run(kit, 'read', 'one')).toBe(redactedSecret);
  expect(await run(kit, 'read', 'two')).toBeNull();

  await run(kit, 'keep', 'two');
  await run(kit, 'drop', 'one');

  expect(await run(kit, 'read', 'one')).toBeNull();
  expect(await run(kit, 'read', 'two')).toBe(redactedSecret);
  expect([...secretStore.entries.values()]).toEqual(['kept by two']);
  expect(await kit.log()).not.toContain('kept by');
}, 30_000);

const apiKey = 'key-for-one';

it("reads a secret Setting from the secret store, apart from the Plugin's own Secrets", async () => {
  const secretStore = new MemorySecretStore();

  const kit = await start({
    secretStore,
    settings: new Map([['api-key', apiKey]]),
  });

  expect(await run(kit, 'readSetting', 'one')).toBe(redactedSecret);
  expect(await run(kit, 'readSetting', 'two')).toBeNull();
  expect(await run(kit, 'readApiKeySecret', 'one')).toBeNull();
  expect([...secretStore.entries.values()]).toEqual([apiKey]);
}, 30_000);

it('refuses to keep a Secret when no OS secret store answers, naming what to install', async () => {
  const kit = await start({ secretStore: absentSecretStore('linux') });

  await expect(run(kit, 'keep')).rejects.toThrow(
    'Refused: no OS secret store answered, so Argo keeps no Secrets on this machine. Install and start a Secret Service',
  );
  expect(await run(kit, 'read')).toBeNull();
  expect(await run(kit, 'readSetting')).toBeNull();
}, 30_000);

const storeTools = [
  { command: 'security', args: ['find-generic-password', '**'] },
  { command: '/usr/bin/security', args: ['**'] },
  { command: 'secret-tool', args: ['lookup', '**'] },
  { command: 'cmdkey.exe', args: ['/list'] },
  { command: 'pwsh', args: ['-Command', 'Get-StoredCredential', '**'] },
  { command: 'powershell', args: ['-c', 'Get-Secret', '*'] },
  { command: 'pwsh.exe', args: ['-Command', 'Get-Secret -Name github'] },
];

it.each(storeTools)(
  'refuses a manifest declaring $command $args as a process command, naming the rule',
  async ({ command, args }) => {
    const fixture = await dataFixture('export function register() {}', {}, [
      { kind: 'process:exec', command, args },
    ]);

    await expect(fixture.start()).rejects.toThrow(
      'No Plugin may run an OS secret-store tool (ADR-0051)',
    );
  },
  30_000,
);
