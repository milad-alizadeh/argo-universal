import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import {
  accountStatus,
  loginOwner,
  loginScenario,
  loginStatusStep,
} from '#mocks/agent-login';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { waitForInstalledSelection } from '#mocks/installation-storage';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

it('installed login and Session share the selected launch and setup admission', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-installed-login-'));
  await initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  onTestFinished(async () => {
    storage.remove();
    await rm(directory, { recursive: true, force: true });
  });

  const agent = createScriptedAgentProcess({
    ...loginScenario(),
    responses: { initialize: [{ steps: [loginStatusStep(accountStatus)] }] },
  });

  const host = await startEngineTestHost({
    database: storage.database,
    acp: agent,
    installationPorts,
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [installEntry('npx')] }),
  });

  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const selected = (await host.caller.agents.catalog()).agents[0];

  if (!selected) throw new Error('Catalog did not contain fixture');
  const agentId = selected.id;
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await waitForInstalledSelection({ ...host, agentId });

  const started = await host.caller.agents.startLogin({
    agentId,
    ownerToken: loginOwner,
  });

  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };

  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('choose-method');
  const loginLaunch = agent.processes[0]?.launch;
  expect(loginLaunch?.args[0]).toContain(host.home);
  expect(loginLaunch?.version).toBe('1.2.3');
  await expect(
    host.caller.agents.install({ agentId, version: '1.2.3' }),
  ).resolves.toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('in use'),
  });
  await host.caller.agents.cancelLogin(operation);
  await expect
    .poll(async () => (await host.caller.agents.login(operation)).status)
    .toBe('cancelled');

  const created = await host.caller.session.new({
    projectId: 'project-1',
    agent: agentId,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [],
  });

  const sessionLaunch = agent.processes[1]?.launch;
  expect(sessionLaunch).toMatchObject({
    executable: loginLaunch?.executable,
    args: loginLaunch?.args,
    version: loginLaunch?.version,
    env: loginLaunch?.env,
    authContext: loginLaunch?.authContext,
  });
  await host.caller.session.close(created);
});
