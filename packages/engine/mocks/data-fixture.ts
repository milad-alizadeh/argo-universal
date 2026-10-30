import { chmod, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginManifest, PluginCapability } from '@repo/contracts/plugins';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { onTestFinished } from 'vitest';

export type Contributions = Partial<PluginManifest['contributes']>;

const fixtureIdentity = {
  id: 'data-fixture',
  name: 'Data fixture',
  version: '1.0.0',
  engines: { argo: '>=0.0.0 <2' },
  main: 'index.tsx',
  icon: { material: 'extension' },
} as const;

export const dataPluginId = 'data-fixture';

export type DataFixture = {
  directory: string;
  requests: () => Promise<string[]>;
};

// A Plugin directory on disk: the Engine loads it like any other, and `@argo/plugin-kit` adds the test host.
export async function dataFixture(
  source: string,
  contributes: Contributions = {},
  capabilities: PluginCapability[] = [],
): Promise<DataFixture> {
  const directory = await fixtureDirectory();
  const recorded = join(directory, 'requests.jsonl');
  await writeFixture(directory, {
    recorded,
    source,
    declared: manifest(contributes, capabilities),
  });

  return fixtureAt(directory, recorded);
}

async function fixtureDirectory(): Promise<string> {
  const directory = await makeResolvedTempFolder('argo-data-kit-');

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  return directory;
}

function fixtureAt(directory: string, recorded: string): DataFixture {
  return {
    directory,
    requests: async () =>
      (await readFile(recorded, 'utf8')).trim().split('\n').filter(Boolean),
  };
}

async function writeFixture(
  directory: string,
  {
    recorded,
    source,
    declared,
  }: { recorded: string; source: string; declared: PluginManifest },
): Promise<void> {
  await writeExecutable(directory, recorded);
  await writeFile(join(directory, 'plugin.json'), JSON.stringify(declared));
  await writeFile(join(directory, 'index.tsx'), source);
}

async function writeExecutable(
  directory: string,
  recorded: string,
): Promise<void> {
  await writeFile(recorded, '');
  const executable = join(directory, 'query-fixture');
  await writeFile(executable, executableSource(recorded));
  await chmod(executable, 0o755);
}

function executableSource(recorded: string): string {
  return `#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
const recorded = ${JSON.stringify(recorded)};
appendFileSync(recorded, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');
process.stdout.write(String(readFileSync(recorded, 'utf8').trim().split('\\n').length));
`;
}

function manifest(
  contributes: Contributions,
  capabilities: PluginCapability[],
): PluginManifest {
  return {
    ...fixtureIdentity,
    contributes: contributions(contributes),
    capabilities: [
      { kind: 'process:exec', command: 'query-fixture', args: ['**'] },
      ...capabilities,
    ],
  };
}

function contributions(
  contributes: Contributions,
): PluginManifest['contributes'] {
  return { nav: [], slots: ['argo/project/details/v1'], ...contributes };
}

// Booting a worker, bundling its page and running a real process outlast the one second `poll` waits by default.
export const processWait = { timeout: 5000 };

export const processQuery =
  "{ api: 'process', action: 'run', argv: ['query-fixture'] }";

export function dataPage(query = processQuery, options = ''): string {
  return `import { Text, Button, Stack, useData } from '@argo/plugin-kit';
export function register(argo) {
  function Data() {
    const { data, error, stale, refresh } = useData(${queryArguments(query, options)});
    return <Stack direction="column"><Text>{data ? data.stdout : error ? 'error:' + error : 'empty'}</Text><Text>{stale ? 'stale' : 'settled'}</Text><Button label="Refresh" onPress={refresh} /></Stack>;
  }
  argo.slots.register('argo/project/details/v1', Data);
  argo.pages.register('/', Data);
}`;
}

export const processPage = dataPage();

function queryArguments(query: string, options: string): string {
  return options ? query + ', ' + options : query;
}
