import type { ACPAgent } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { createNpmPackageFetcher } from '@repo/mocks/registry/port';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  installEntry,
  listedAgent,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

// The Registry fixture's npm metadata names this command for fixture-install@1.2.3.
const command = 'fixture-acp';
const packageName = 'fixture-install';
const npmEntry: ACPAgent = {
  ...installEntry('npx'),
  distribution: {
    npx: { package: `${packageName}@1.2.3`, args: ['--acp'] },
  },
};

type Release = { name: string; version: string };
// npm's registry, counting what Argo asks it.
const countedNpm = (
  packages?: Record<string, unknown>,
): {
  releases: Release[];
  fetchNpmPackage: ReturnType<typeof createNpmPackageFetcher>;
} => {
  const releases: Release[] = [];
  const fixture = createNpmPackageFetcher(packages);
  return {
    releases,
    fetchNpmPackage: (release, signal) => {
      releases.push(release);
      return fixture(release, signal);
    },
  };
};

const syncCatalogAndSettle = async (
  host: Awaited<ReturnType<typeof startInstallEngine>>,
): Promise<void> => {
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
};

it('an npm Agent already on PATH is found by its command name, checked Ready and launched with the Registry args, reading npm once', async () => {
  const machine = await createMachinePath();
  const file = await machine.place(command);
  const npm = countedNpm();
  const checks = createScriptedAgentProcess(scenarios.reply);
  const host = await startInstallEngine(npmEntry, undefined, {
    fixtureAgents: [],
    acp: checks,
    fetchNpmPackage: npm.fetchNpmPackage,
  });
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: 'ready', enabled: true, owner: 'unknown' });
  expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
    file,
  ]);
  expect(checks.processes[0]?.launch.args).toEqual(['--acp']);
  expect(
    (await host.caller.agents.installStatus({ agentId: host.agentId }))
      .operation,
  ).toBeNull();
  await syncCatalogAndSettle(host);
  expect(npm.releases).toEqual([{ name: packageName, version: '1.2.3' }]);
}, 30_000);

it.each([
  { metadata: 'missing', packages: {} },
  {
    metadata: 'ambiguous',
    packages: {
      [`${packageName}@1.2.3`]: {
        name: packageName,
        version: '1.2.3',
        bin: { 'fixture-acp': 'a.mjs', 'fixture-tool': 'b.mjs' },
      },
    },
  },
])(
  'a catalog sync with $metadata npm metadata succeeds and leaves the npm Agent Not installed',
  async ({ packages }) => {
    const machine = await createMachinePath();
    await machine.place(command);
    await machine.place('fixture-tool');
    await machine.place(packageName);
    const host = await startInstallEngine(npmEntry, undefined, {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenarios.reply),
      fetchNpmPackage: countedNpm(packages).fetchNpmPackage,
    });
    const catalog = await host.caller.agents.catalog();
    expect(catalog).toMatchObject({ status: 'fresh', error: null });
    expect(catalog.agents.map(({ entry }) => entry.id)).toEqual([npmEntry.id]);
    await host.caller.agents.list({ refresh: true });
    expect(await listedAgent(host.caller, host.agentId)).toBeUndefined();
  },
  30_000,
);

// Several bin names for one file are aliases of one command, as Kilo's `kilo` and `kilocode`.
const aliasedPackages = {
  [`${packageName}@1.2.3`]: {
    name: packageName,
    version: '1.2.3',
    bin: { 'fixture-acp': 'bin/agent.mjs', 'fixture-alias': 'bin/agent.mjs' },
  },
};
it.each([command, 'fixture-alias'])(
  'an npm Agent whose bin names are aliases of one file is found by %s on PATH',
  async (placed) => {
    const machine = await createMachinePath();
    const file = await machine.place(placed);
    const checks = createScriptedAgentProcess(scenarios.reply);
    const host = await startInstallEngine(npmEntry, undefined, {
      fixtureAgents: [],
      acp: checks,
      fetchNpmPackage: countedNpm(aliasedPackages).fetchNpmPackage,
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

it('Server start finds an npm Agent by its saved command name without asking npm', async () => {
  const machine = await createMachinePath();
  const first = await startInstallEngine(npmEntry, undefined, {
    fixtureAgents: [],
  });
  expect(await listedAgent(first.caller, first.agentId)).toBeUndefined();
  await first.stop();
  const file = await machine.place(command);
  const npm = countedNpm();
  const checks = createScriptedAgentProcess(scenarios.reply);
  const second = await startEngineTestHost({
    home: first.home,
    fixtureAgents: [],
    acp: checks,
    keepStartupLaunches: true,
    fetchNpmPackage: npm.fetchNpmPackage,
  });
  await expect
    .poll(() => checks.processes.map(({ launch }) => launch.executable))
    .toEqual([file]);
  expect(await listedAgent(second.caller, first.agentId)).toMatchObject({
    status: 'ready',
    owner: 'unknown',
  });
  expect(npm.releases).toEqual([]);
  await second.stop();
}, 30_000);
