import type { AgentInfo } from '@repo/contracts';
import { type ScenarioName, scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { awaitSettledReadiness } from '#mocks/engine';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;

const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

type ScriptedAgent = ReturnType<typeof createScriptedAgentProcess>;

const startInstalled = async (
  scenario: ScenarioName | ScriptedAgent,
  checkTimeoutMs?: number,
): Promise<Host & { agent: ScriptedAgent }> => {
  const agent =
    typeof scenario === 'string'
      ? createScriptedAgentProcess(scenarios[scenario])
      : scenario;

  const host = await startInstallEngine(
    installEntry('npx'),
    installationPorts,
    {
      fixtureAgents: [],
      acp: { ...agent, checkTimeoutMs },
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
  'an installed Agent that answers $scenario is checked to $check.status with its reason, and a Recheck agrees',
  async ({ scenario, check }) => {
    const host = await startInstalled(scenario);
    await awaitSettledReadiness(host.caller);
    expect(await listed(host)).toMatchObject({ ...check, enabled: true });
    expect(await host.caller.agents.recheck({ agentId: host.agentId })).toEqual(
      check,
    );
    expect(await listed(host)).toMatchObject({ ...check, enabled: true });
    expect(
      host.agent.processes.map(({ terminations }) => terminations),
    ).toEqual(host.agent.processes.map(() => 1));
  },
  20_000,
);

const cantStart = 'cant-start';

it('an Agent that fails ACP initialize shows Can’t start with a reason that holds no credential', async () => {
  const host = await startInstalled(cantStart);
  await awaitSettledReadiness(host.caller);
  const check = await host.caller.agents.recheck({ agentId: host.agentId });
  expect(check.status).toBe(cantStart);
  expect(check.reason).toContain('Fixture ACP failed ACP initialize');
  expect(check.reason).not.toContain('sk-fixture-secret');
  expect(await listed(host)).toMatchObject(check);
}, 20_000);

it('an Agent that never answers ACP initialize shows Can’t start once its check times out, and is stopped', async () => {
  const silent = createScriptedAgentProcess({
    steps: [],
    // Installing answers once; every Readiness check after it waits forever.
    responses: {
      initialize: [{}, { waitFor: new Promise<void>(() => {}) }],
    },
  });

  const host = await startInstalled(silent, 200);
  const check = await host.caller.agents.recheck({ agentId: host.agentId });
  expect(check).toEqual({
    status: cantStart,
    reason: 'Fixture ACP did not answer ACP initialize within 0.2 seconds.',
  });
  expect(await listed(host)).toMatchObject(check);
  expect(silent.processes.at(-1)?.terminations).toBe(1);
}, 20_000);
