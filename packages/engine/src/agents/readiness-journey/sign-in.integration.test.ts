import type { AgentInfo } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  accountStatus,
  loginMethodId,
  loginOwner,
  loginScenario,
  loginStatusStep,
  signedOutStatus,
} from '#mocks/agent-login';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

it('an installed Agent that needs sign-in is Ready once its sign-in finishes, through its saved launch', async () => {
  const signedOut = { steps: [loginStatusStep(signedOutStatus)] };
  const scenario = loginScenario();
  const agent = createScriptedAgentProcess({
    ...scenario,
    responses: {
      ...scenario.responses,
      initialize: [
        signedOut,
        signedOut,
        { steps: [loginStatusStep(accountStatus)] },
      ],
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
  await expect
    .poll(() => listed(host))
    .toMatchObject({
      status: 'sign-in-needed',
      reason: 'The Agent requires sign-in.',
    });
  const started = await host.caller.agents.startLogin({
    agentId: host.agentId,
    ownerToken: loginOwner,
  });
  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('choose-method');
  await host.caller.agents.chooseLoginMethod({
    ...operation,
    methodId: loginMethodId,
  });
  await expect.poll(() => listed(host)).toMatchObject({ status: 'ready' });
  const [check, login, recheck] = agent.processes.map(({ launch }) => launch);
  expect(login).toEqual(check);
  expect(recheck).toEqual(check);
  expect(check?.version).toBe('1.2.3');
  expect(agent.processes.every(({ terminations }) => terminations === 1)).toBe(
    true,
  );
}, 20_000);
