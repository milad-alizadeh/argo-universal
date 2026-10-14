import { scenarios } from '@repo/mocks/agent/scenarios';
import type { NpmPackageMetadata } from '@repo/mocks/registry/catalog';
import { serveRegistry } from '@repo/mocks/registry/port';
import { expect, it } from 'vitest';
import {
  listedAgent,
  pathNpmCommand,
  pathNpmEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import type { FetchAgents } from '../index';

const npmEntry = pathNpmEntry();

const packageName = 'fixture-install';

const release = `${packageName}@1.2.3`;

const registry = { version: '1.0.0', agents: [npmEntry] };

type Host = Awaited<ReturnType<typeof startInstallEngine>>;

// The Registry fixture with this npm metadata for the entry's release, recording what npm is asked.
type AnsweringNpm = { asked: unknown[]; fetchAgents: FetchAgents };

const npmAnswering = (metadata?: NpmPackageMetadata): AnsweringNpm => {
  const asked: unknown[] = [];

  const fixture = serveRegistry(
    registry,
    metadata ? { [release]: metadata } : {},
  );

  return {
    asked,
    fetchAgents: async (signal, npmRelease) => {
      if (npmRelease) asked.push(npmRelease);

      return fixture(signal, npmRelease);
    },
  };
};

const startWith = (fetchAgents: FetchAgents): Promise<Host> =>
  startInstallEngine(npmEntry, undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
    fetchAgents,
  });

const syncAgain = async (host: Host): Promise<void> => {
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
};

// The catalog and the npm Agent's listing once the Resolver has looked again.
const afterSync = async (
  host: Host,
): Promise<{
  catalog: Awaited<ReturnType<Host['caller']['agents']['catalog']>>;
  listed: Awaited<ReturnType<typeof listedAgent>>;
}> => {
  const catalog = await host.caller.agents.catalog();
  await host.caller.agents.list({ refresh: true });

  return { catalog, listed: await listedAgent(host.caller, host.agentId) };
};

const withoutBin: NpmPackageMetadata = { name: packageName, version: '1.2.3' };

const metadata = (bin: NpmPackageMetadata['bin']): NpmPackageMetadata => ({
  ...withoutBin,
  bin,
});

it('catalog sync asks npm once per package release', async () => {
  await createMachinePath();
  const npm = npmAnswering(metadata({ [pathNpmCommand]: 'agent.mjs' }));
  const host = await startWith(npm.fetchAgents);
  await syncAgain(host);
  expect(npm.asked).toEqual([{ name: packageName, version: '1.2.3' }]);
}, 30_000);

it.each([
  { case: 'missing', answer: undefined },
  { case: 'without bin', answer: withoutBin },
  {
    case: 'ambiguous',
    answer: metadata({ [pathNpmCommand]: 'a.mjs', 'fixture-tool': 'b.mjs' }),
  },
])(
  'a catalog sync with $case npm metadata succeeds and leaves the npm Agent Not installed',
  async ({ answer }) => {
    const machine = await createMachinePath();

    for (const name of [pathNpmCommand, 'fixture-tool', packageName])
      await machine.place(name);

    const { catalog, listed } = await afterSync(
      await startWith(npmAnswering(answer).fetchAgents),
    );

    expect(catalog).toMatchObject({ status: 'fresh', error: null });
    expect(catalog.agents.map(({ entry }) => entry.id)).toEqual([npmEntry.id]);
    expect(listed).toBeUndefined();
  },
  30_000,
);

it.each([pathNpmCommand, 'fixture-alias'])(
  'an npm Agent whose bin names all point at one file is found by its alias %s on PATH',
  async (placed) => {
    const machine = await createMachinePath();
    const file = await machine.place(placed);
    const checks = createScriptedAgentProcess(scenarios.reply);

    const aliases = {
      [pathNpmCommand]: 'agent.mjs',
      'fixture-alias': 'agent.mjs',
    };

    const host = await startInstallEngine(npmEntry, undefined, {
      fixtureAgents: [],
      acp: checks,
      fetchAgents: npmAnswering(metadata(aliases)).fetchAgents,
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId))
      .toMatchObject({ status: 'ready', owner: 'unknown' });
    expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
      file,
    ]);
  },
  30_000,
);
