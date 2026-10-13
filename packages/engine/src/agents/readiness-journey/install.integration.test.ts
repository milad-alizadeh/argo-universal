import type { AgentInfo } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, onTestFinished } from 'vitest';
import {
  installationPorts,
  installEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

it('a newly installed Agent is listed Checking… until its readiness check answers Ready', async () => {
  const opened: unknown[] = [];
  const agent = createScriptedAgentProcess({
    ...scenarios.reply,
    responses: { 'session/new': [{ requests: opened }] },
  });
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const host = await startInstallEngine(
    installEntry('npx'),
    installationPorts,
    {
      automaticReadiness: true,
      fixtureAgents: [],
      acp: {
        launchProcess: async (launch) => {
          entered.resolve();
          await release.promise;
          return agent.launchProcess(launch);
        },
      },
    },
  );
  onTestFinished(() => release.resolve());
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await entered.promise;
  expect(await listed(host)).toMatchObject({
    status: 'checking',
    enabled: true,
    version: '1.2.3',
  });
  release.resolve();
  await expect.poll(() => listed(host)).toMatchObject({ status: 'ready' });
  expect(agent.processes).toHaveLength(1);
  expect(agent.processes[0]?.terminations).toBe(1);
  expect(opened).toEqual([]);
}, 20_000);
