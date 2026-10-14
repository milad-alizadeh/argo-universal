import { realpath } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  listedAgent,
  pathAgents,
  pathBinaryEntry,
  pathEntrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const entrypoint = pathEntrypoint;

const binaryEntry = pathBinaryEntry();

it.each(pathAgents)(
  'a $kind Agent already on PATH is found by its name after the catalog sync, enabled and checked Ready, without a second install',
  async ({ entry, command, args }) => {
    const machine = await createMachinePath();
    const file = await machine.place(command);
    const checks = createScriptedAgentProcess(scenarios.reply);

    const host = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
      acp: checks,
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId))
      .toMatchObject({
        status: 'ready',
        enabled: true,
        label: 'Fixture ACP',
        owner: 'unknown',
      });
    expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
      file,
    ]);
    expect(checks.processes[0]?.launch.args).toEqual(args);
    expect(
      (await host.caller.agents.installStatus({ agentId: host.agentId }))
        .operation,
    ).toBeNull();
  },
  30_000,
);

it("Argo's own copy wins over the same Agent on PATH", async () => {
  const machine = await createMachinePath();
  await machine.place(entrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);

  const host = await startInstallEngine(binaryEntry, undefined, {
    fixtureAgents: [],
    acp: checks,
  });

  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: 'ready', owner: 'unknown' });
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: 'ready', owner: 'argo' });

  const launched = await realpath(
    checks.processes.at(-1)?.launch.executable ?? '',
  );

  const agentsFolder = await realpath(join(host.home, 'agents'));
  expect(relative(agentsFolder, launched)).not.toMatch(/^\.\./);
}, 30_000);

// After the first sync the Registry is unreachable, so no catalog commit triggers a look: only the stale look can find the Agent.
const startWithOneCatalogSync = async (
  now: () => number,
): Promise<{
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  agentId: string;
}> => {
  let fetched = false;

  const host = await startEngineTestHost({
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
    now,
    fetchAgents: async () => {
      if (fetched) throw new Error('The Registry is unreachable');
      fetched = true;

      return JSON.stringify({ version: '1.0.0', agents: [binaryEntry] });
    },
  });

  await syncCatalogAndSettle(host);

  const agentId = (await host.caller.agents.catalog()).agents.find(
    ({ entry }) => entry.id === binaryEntry.id,
  )?.id;

  if (!agentId) throw new Error('Catalog did not contain the PATH fixture');

  return { host, agentId };
};

const syncCatalogAndSettle = async (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): Promise<void> => {
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .not.toBe('syncing');
};

it('opening the Agents page finds an Agent installed since the last look only once that look is stale', async () => {
  let clock = Date.now();
  const machine = await createMachinePath();
  const { host, agentId } = await startWithOneCatalogSync(() => clock);
  await host.caller.agents.list({ refresh: true });
  await machine.place(entrypoint);
  clock += 9_000;
  await syncCatalogAndSettle(host);
  expect(await listedAgent(host.caller, agentId)).toBeUndefined();
  clock += 2_000;
  await host.caller.agents.syncCatalog();
  await expect
    .poll(() => listedAgent(host.caller, agentId))
    .toMatchObject({ status: 'ready', owner: 'unknown' });
}, 30_000);

it("removing Argo's copy finds the same Agent on PATH without a Recheck", async () => {
  const machine = await createMachinePath();

  const host = await startInstallEngine(binaryEntry, undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ status: 'ready', owner: 'argo' });
  await machine.place(entrypoint);
  await host.caller.agents.remove({ agentId: host.agentId });
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
    .toMatchObject({ owner: 'unknown' });
}, 30_000);
