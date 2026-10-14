import type { ACPAgent } from '@repo/contracts';
import { reportedAgentVersion } from '@repo/mocks/agent/readiness-scenarios';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { serveRegistry } from '@repo/mocks/registry/port';
import { expect, it } from 'vitest';
import {
  installEntry,
  listedAgent,
  pathBinaryEntry,
  pathEntrypoint,
  pathNpmCommand,
  pathNpmEntry,
  startInstallEngine,
} from '#mocks/installation';
import {
  createMachinePath,
  type MachinePath,
  type NpmPackage,
} from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

// Every fixture entry offers this release; the Agent reports `reportedAgentVersion` in ACP agentInfo.
const catalogVersion = '1.2.3';

const updateAvailable = 'update-available';

const npmPackage = (version: string): NpmPackage => ({
  name: 'fixture-install',
  version,
});

it.each([
  {
    copy: 'a binary on PATH, whose only version is its agentInfo',
    entry: pathBinaryEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.place(pathEntrypoint),
    listed: { version: reportedAgentVersion, status: updateAvailable },
  },
  {
    copy: 'an npm package on PATH at the catalog release',
    entry: pathNpmEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placePackage(pathNpmCommand, npmPackage(catalogVersion)),
    listed: {
      version: catalogVersion,
      agentVersion: reportedAgentVersion,
      status: 'ready',
    },
  },
  {
    copy: 'an npm package on PATH at an older release',
    entry: pathNpmEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placePackage(pathNpmCommand, npmPackage('1.2.0')),
    listed: {
      version: '1.2.0',
      agentVersion: reportedAgentVersion,
      status: updateAvailable,
    },
  },
  {
    copy: 'an older npm package on PATH that cannot start, which keeps its own status',
    entry: pathNpmEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placePackage(pathNpmCommand, npmPackage('1.2.0')),
    scenario: scenarios['cant-start'],
    listed: { version: '1.2.0', status: 'cant-start' },
  },
])(
  'the Adapter version of $copy comes from its package metadata or agentInfo, and Update available from the catalog only once Ready',
  async ({ entry, place, listed, scenario = scenarios['agent-info'] }) => {
    const machine = await createMachinePath();
    await place(machine);

    const host = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenario),
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId), { timeout: 10_000 })
      .toMatchObject({
        availableVersion: catalogVersion,
        ...listed,
      });
  },
  30_000,
);

it('an Agent that reports the Adapter version in agentInfo shows no separate Agent version', async () => {
  const machine = await createMachinePath();
  await machine.placePackage(pathNpmCommand, npmPackage(reportedAgentVersion));

  const host = await startInstallEngine(pathNpmEntry(), undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios['agent-info']),
  });

  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: updateAvailable });
  expect(await listedAgent(host.caller, host.agentId)).not.toHaveProperty(
    'agentVersion',
  );
}, 30_000);

it("Argo's own copy shows Update available once the catalog publishes another release", async () => {
  let entry: ACPAgent = installEntry('npx');

  const host = await startInstallEngine(entry, undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
    fetchAgents: (signal, release) =>
      serveRegistry({ version: '1.0.0', agents: [entry] })(signal, release),
  });

  await host.caller.agents.install({
    agentId: host.agentId,
    version: catalogVersion,
  });
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: 'ready', owner: 'argo', version: catalogVersion });

  entry = {
    ...entry,
    version: '2.0.0',
    distribution: { npx: { package: 'fixture-install@2.0.0' } },
  };
  await host.caller.agents.syncCatalog();
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({
      status: updateAvailable,
      version: catalogVersion,
      availableVersion: '2.0.0',
    });
}, 30_000);
