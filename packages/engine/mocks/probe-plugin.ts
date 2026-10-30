import { lookup } from 'node:dns';
import { readFile, realpath, rm, writeFile } from 'node:fs/promises';
import type { RequestListener } from 'node:http';
import { createServer } from 'node:https';
import type { LookupFunction } from 'node:net';
import { join } from 'node:path';
import type {
  PluginCapability,
  PluginSettingField,
  PluginManifest,
} from '@repo/contracts/plugins';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import type { PluginNetwork } from '../src/plugins';
import { fixtureTls } from './fixture-tls';
import { createRuntimePlugins } from './runtime-plugins';

const outFile = 'out.json';

export async function scratch(): Promise<string> {
  const directory = await makeResolvedTempFolder('argo-plugin-argo-');

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  return directory;
}

type Probe = { home: string; entry: string; code: string; data: string };

// A Plugin is a fixture whose source the test writes, so each scenario names the paths it touches.
type ProbeOptions = {
  dev?: boolean;
  capabilities?: PluginCapability[];
  settings?: PluginSettingField[];
  accounts?: PluginManifest['contributes']['accounts'];
};

export async function installed(
  source: string,
  options: ProbeOptions = {},
): Promise<Probe> {
  const home = await createRuntimePlugins([
    { id: 'probe', fixture: 'healthy', ...options },
  ]);

  const { code, entry, data } = await probePaths(home);

  await writeFile(
    entry,
    source.replaceAll('$DATA', data).replaceAll('$CODE', code),
  );

  return { home, entry, code, data };
}

const probePaths = async (home: string): Promise<Omit<Probe, 'home'>> => {
  const code = join(home, 'shipped/probe');

  return {
    code,
    entry: join(code, 'index.mjs'),
    data: join(await realpath(home), 'plugin-data/probe'),
  };
};

/*
 * A probe that makes each named call, then writes every value or error to its data folder.
 * `$DATA` and `$CODE` in a call stand for the probe's data and code folders.
 */
export const probeSource = (calls: Record<string, string>): string => `
  export async function register(argo) {
    const results = {};
    const calls = { ${Object.entries(calls)
      .map(([name, call]) => `${JSON.stringify(name)}: () => ${call}`)
      .join(',\n')} };
    for (const [name, call] of Object.entries(calls))
      results[name] = await call().then((value) => ({ value: value ?? null }), (error) => ({ error: error.message }));
    await argo.fs.write('$DATA/${outFile}', JSON.stringify(results));
  }`;

// The Engine registers the Project at ARGO_PROJECT_PATH when it starts.
export async function registeredProject(): Promise<string> {
  const project = await scratch();
  await initTestRepository(project);
  vi.stubEnv('ARGO_PROJECT_PATH', project);
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });

  return project;
}

// Each call's value or error, as the probe recorded it.
const ProbeResult = z.record(
  z.string(),
  z.union([z.object({ value: z.json() }), z.object({ error: z.string() })]),
);

type ProbeResult = z.infer<typeof ProbeResult>;

// What the probe wrote to its data folder, the one place it may write.
export const probeResult = async (data: string): Promise<ProbeResult> =>
  ProbeResult.parse(JSON.parse(await readFile(join(data, outFile), 'utf8')));

// A self-signed certificate for localhost, 127.0.0.1 and api.fixture.test, trusted only by tests.
export async function fixtureNetwork(): Promise<PluginNetwork> {
  return { ca: (await fixtureTls()).cert, lookup: fixtureLookup };
}

// Names, not declared as loopback, that resolve to loopback: what DNS rebinding does.
const rebinding = new Set(['api.fixture.test', 'rebind.fixture.test']);

const fixtureLookup: LookupFunction = (hostname, options, callback) =>
  rebinding.has(hostname)
    ? lookup('127.0.0.1', options, callback)
    : lookup(hostname, options, callback);

export async function httpsServer(listener: RequestListener): Promise<number> {
  const server = createServer(await fixtureTls(), listener);

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  onTestFinished(() => void server.close());

  const address = server.address();

  if (address === null || typeof address === 'string')
    throw new Error('Server is not listening on a port');

  return address.port;
}
