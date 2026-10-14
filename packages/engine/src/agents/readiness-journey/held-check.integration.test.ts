import type { AgentInfo } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;

type ScriptedAgent = ReturnType<typeof createScriptedAgentProcess>;

const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

// The check after install never gets an ACP initialize answer; later checks do.
const installHeldCheck = async (): Promise<Host & { agent: ScriptedAgent }> => {
  const agent = createScriptedAgentProcess({
    steps: [],
    responses: {
      initialize: [{ waitFor: new Promise<void>(() => {}) }, {}],
    },
  });

  const host = await startInstallEngine(
    installEntry('npx'),
    installationPorts,
    {
      fixtureAgents: [],
      acp: agent,
    },
  );

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect.poll(() => agent.processes.length).toBe(1);

  expect(await listed(host)).toMatchObject({ status: 'checking' });

  return { ...host, agent };
};

it('removing an Agent while its readiness check runs stops the check and removes the Agent', async () => {
  const host = await installHeldCheck();
  await host.caller.agents.remove({ agentId: host.agentId });
  expect(host.agent.processes.map(({ terminations }) => terminations)).toEqual([
    1,
  ]);
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({ installation: { status: 'not-installed' } });
}, 20_000);

it('updating an Agent while its readiness check runs stops the check and checks the new release', async () => {
  const host = await installHeldCheck();
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect.poll(() => listed(host)).toMatchObject({ status: 'ready' });
  expect(host.agent.processes.map(({ terminations }) => terminations)).toEqual([
    1, 1,
  ]);
}, 20_000);
