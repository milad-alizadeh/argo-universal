import { realpath } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import {
  listedAgent,
  pathBinaryEntry,
  pathEntrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const entrypoint = pathEntrypoint;
const binaryEntry = pathBinaryEntry();

it('an Agent already on PATH is found after the catalog sync, enabled and checked Ready, without a second install', async () => {
  const machine = await createMachinePath();
  const file = await machine.place(entrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);
  const host = await startInstallEngine(binaryEntry, undefined, {
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
  expect(checks.processes[0]?.launch.args).toEqual(['acp']);
  expect(
    (await host.caller.agents.installStatus({ agentId: host.agentId }))
      .operation,
  ).toBeNull();
}, 30_000);

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

it('opening the Agents page after the last look went stale finds an Agent installed since', async () => {
  let clock = Date.now();
  const machine = await createMachinePath();
  const host = await startInstallEngine(binaryEntry, undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
    now: () => clock,
  });
  await machine.place(entrypoint);
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  expect(await listedAgent(host.caller, host.agentId)).toBeUndefined();
  clock += 11_000;
  await host.caller.agents.syncCatalog();
  await expect
    .poll(() => listedAgent(host.caller, host.agentId))
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
