import { rm } from 'node:fs/promises';
import type { AgentInfo } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { customAgentDefinition } from '#mocks/custom-agent';
import { startEngineTestHost } from '#mocks/engine';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { agentInstallDirectory } from '../install/selection/selection';

type Caller = Awaited<ReturnType<typeof startInstallEngine>>['caller'];
const listed = async (
  caller: Caller,
  agentId: string,
): Promise<AgentInfo | undefined> =>
  (await caller.agents.list()).find(({ agent }) => agent === agentId);

const installReady = async (): Promise<
  Awaited<ReturnType<typeof startInstallEngine>>
> => {
  const host = await startInstallEngine(
    installEntry('npx'),
    installationPorts,
    {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenarios.reply),
    },
  );
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(async () => (await listed(host.caller, host.agentId))?.version)
    .toBe('1.2.3');
  expect(await host.caller.agents.recheck({ agentId: host.agentId })).toEqual({
    status: 'ready',
  });
  return host;
};

it('Server start checks every installed, enabled Agent again and never launches a disabled one', async () => {
  const host = await installReady();
  const custom = await host.caller.agents.registerCustom(customAgentDefinition);
  if (custom.status !== 'ready') throw new Error(custom.failure);
  await host.caller.agents.setEnabled({
    agentId: custom.agentId,
    enabled: false,
  });
  await host.stop();
  const restarted = createScriptedAgentProcess(scenarios['signed-out']);
  const second = await startEngineTestHost({
    home: host.home,
    fixtureAgents: [],
    automaticReadiness: true,
    acp: restarted,
    installationPorts,
    fetchAgents: async () => ({ version: '1.0.0', agents: [] }),
  });
  await expect
    .poll(() => listed(second.caller, host.agentId))
    .toMatchObject({ status: 'sign-in-needed', enabled: true });
  expect(await listed(second.caller, custom.agentId)).toMatchObject({
    enabled: false,
  });
  expect(restarted.processes.map(({ launch }) => launch.agentId)).toEqual([
    host.agentId,
  ]);
  await second.stop();
}, 30_000);

it('missing launch files show Not found, and Repair installs the same release and checks it again', async () => {
  const host = await installReady();
  await rm(agentInstallDirectory(host.home, host.agentId), {
    recursive: true,
    force: true,
  });
  expect(await listed(host.caller, host.agentId)).toMatchObject({
    status: 'not-found',
    enabled: true,
    version: '1.2.3',
    reason:
      'The installed files of Fixture ACP are missing. Repair installs them again.',
  });
  expect(await host.caller.agents.recheck({ agentId: host.agentId })).toEqual({
    status: 'not-found',
    reason:
      'The installed files of Fixture ACP are missing. Repair installs them again.',
  });
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(async () => (await listed(host.caller, host.agentId))?.status)
    .toBe('checking');
  expect(await host.caller.agents.recheck({ agentId: host.agentId })).toEqual({
    status: 'ready',
  });
}, 30_000);

it('a Recheck never launches a disabled Agent', async () => {
  const host = await installReady();
  await host.caller.agents.setEnabled({
    agentId: host.agentId,
    enabled: false,
  });
  await expect(
    host.caller.agents.recheck({ agentId: host.agentId }),
  ).rejects.toThrow('Agent is disabled');
  expect(await listed(host.caller, host.agentId)).toMatchObject({
    enabled: false,
  });
}, 30_000);
