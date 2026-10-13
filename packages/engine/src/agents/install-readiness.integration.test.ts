import type { ACPAgent } from '@repo/contracts';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry } from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

it('an accepted update keeps its release while readiness delays materialization', async () => {
  let entry: ACPAgent = installEntry('npx');
  let ports = createInstallationPorts();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());
  let holding = false,
    target = '';
  const agent = createScriptedAgentProcess();
  const host = await startEngineTestHost({
    fetchAgents: async () => ({ version: '1.0.0', agents: [entry] }),
    installationPorts: {
      download: (url, signal) => ports.download(url, signal),
      runTool: (input) => ports.runTool(input),
    },
    acp: {
      launchProcess: async (launch) => {
        if (holding && launch.agentId === target) {
          entered.resolve();
          await release.promise;
        }
        return agent.launchProcess(launch);
      },
    },
  });
  const sync = async (): Promise<void> => {
    await host.caller.agents.syncCatalog();
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe('idle');
  };
  await sync();
  const catalogAgent = (await host.caller.agents.catalog()).agents[0];
  if (!catalogAgent) throw new Error('Missing installation fixture');
  target = catalogAgent.id;
  await host.caller.agents.install({ agentId: target, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: target })).operation
          ?.status,
    )
    .toBe('installed');
  entry = {
    ...entry,
    version: '2.0.0',
    distribution: { npx: { package: 'fixture-install@2.0.0' } },
  };
  ports = createInstallationPorts({ version: '2.0.0' });
  await sync();
  holding = true;
  const checking = host.caller.agents.list();
  await entered.promise;
  const accepted = await host.caller.agents.install({
    agentId: target,
    version: '2.0.0',
  });
  expect(accepted.status).toBe('installing');
  entry = {
    ...entry,
    version: '3.0.0',
    distribution: { npx: { package: 'fixture-install@3.0.0' } },
  };
  await sync();
  release.resolve();
  await checking;
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: target })).operation
          ?.status,
    )
    .toBe('installed');
  const result = await host.caller.agents.installStatus({ agentId: target });
  expect(result).toMatchObject({
    installation: { status: 'installed', version: '2.0.0' },
    operation: { status: 'installed', version: '2.0.0' },
  });
}, 20_000);
