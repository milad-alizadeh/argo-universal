import type { AgentInfo } from '@repo/contracts';
import { type ScenarioName, scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

const startInstalled = async (
  scenario: ScenarioName,
): Promise<Host & { agent: ReturnType<typeof createScriptedAgentProcess> }> => {
  const agent = createScriptedAgentProcess(scenarios[scenario]);
  const host = await startInstallEngine(
    installEntry('npx'),
    installationPorts,
    {
      fixtureAgents: [],
      acp: agent,
    },
  );
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .installation.status,
    )
    .toBe('installed');
  return { ...host, agent };
};

it.each([
  {
    scenario: 'signed-out',
    check: { status: 'sign-in-needed', reason: 'The Agent requires sign-in.' },
  },
  {
    scenario: 'account-not-supported',
    check: {
      status: 'account-not-supported',
      reason: 'The Agent did not report a compatible subscription account.',
    },
  },
  {
    scenario: 'not-compatible',
    check: {
      status: 'not-compatible',
      reason:
        'Fixture ACP does not support the ACP session/close capability Argo needs.',
    },
  },
] as const)(
  'a Recheck of an installed Agent that answers $scenario saves $check.status with its reason',
  async ({ scenario, check }) => {
    const host = await startInstalled(scenario);
    expect(await host.caller.agents.recheck({ agentId: host.agentId })).toEqual(
      check,
    );
    expect(await listed(host)).toMatchObject({ ...check, enabled: true });
    expect(host.agent.processes).toHaveLength(1);
    expect(host.agent.processes[0]?.terminations).toBe(1);
  },
  20_000,
);

it('an Agent that fails ACP initialize shows Can’t start with a reason that holds no credential', async () => {
  const host = await startInstalled('cant-start');
  const check = await host.caller.agents.recheck({ agentId: host.agentId });
  expect(check.status).toBe('cant-start');
  expect(check.reason).toContain('Fixture ACP failed ACP initialize');
  expect(check.reason).not.toContain('sk-fixture-secret');
  expect(await listed(host)).toMatchObject(check);
}, 20_000);
