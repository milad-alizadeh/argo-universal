import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ACPAgent } from '@repo/contracts';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  installEntry,
  listedAgent,
  startInstallEngine,
} from '#mocks/installation';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Caller = Awaited<ReturnType<typeof startInstallEngine>>['caller'];

type ScriptedAgent = ReturnType<typeof createScriptedAgentProcess>;

type Outcome = 'success' | 'failure';

// What the Registry publishes and what the package manager then does: install it, or fail.
const publisher = async (): Promise<{
  scenarioPath: string;
  fetchAgents: () => Promise<string>;
  publish: (outcome: Outcome, version: string) => Promise<void>;
}> => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-held-check-'));
  const scenarioPath = join(directory, 'scenario.json');
  let entry: ACPAgent = installEntry('npx');

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  const publish = async (outcome: Outcome, version: string): Promise<void> => {
    entry = {
      ...entry,
      version,
      distribution: { npx: { package: `fixture-install@${version}` } },
    };
    await writeFile(
      scenarioPath,
      JSON.stringify({ outcome, released: true, version }),
    );
  };

  await publish('success', '1.2.3');

  return {
    scenarioPath,
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
    publish,
  };
};

const syncCatalog = async (caller: Caller): Promise<void> => {
  await caller.agents.syncCatalog();
  await expect
    .poll(async () => (await caller.agents.catalog()).syncStatus)
    .toBe('idle');
};

type HeldCheck = Awaited<ReturnType<typeof startInstallEngine>> & {
  agent: ScriptedAgent;
  publish: (outcome: Outcome, version: string) => Promise<void>;
};

// The check after install never gets an ACP initialize answer; later checks do. No program exits until the test lets it.
const installHeldCheck = async (): Promise<HeldCheck> => {
  const registry = await publisher();

  const agent = createScriptedAgentProcess({
    steps: [],
    autoExit: false,
    responses: { initialize: [{ waitFor: new Promise<void>(() => {}) }, {}] },
  });

  const ports = createInstallationPorts({
    scenarioPath: registry.scenarioPath,
  });

  const host = await startInstallEngine(installEntry('npx'), ports, {
    fixtureAgents: [],
    acp: agent,
    fetchAgents: registry.fetchAgents,
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect.poll(() => agent.processes.length).toBe(1);
  expect(await listedAgent(host.caller, host.agentId)).toMatchObject({
    status: 'checking',
  });

  const publish = async (outcome: Outcome, version: string): Promise<void> => {
    await registry.publish(outcome, version);
    await syncCatalog(host.caller);
  };

  return { ...host, agent, publish };
};

const stopped = (agent: ScriptedAgent, index: number): Promise<void> =>
  vi.waitFor(() => expect(agent.processes[index]?.terminations).toBe(1), {
    timeout: 10_000,
  });

// Lets a check's program exit once the Engine has stopped it.
const exitWhenStopped = async (
  agent: ScriptedAgent,
  index: number,
): Promise<void> => {
  await stopped(agent, index);
  agent.processes[index]?.exited.resolve();
};

it('removing an Agent while its readiness check runs waits for the stopped check to exit, then removes the Agent', async () => {
  const host = await installHeldCheck();
  let settled = false;

  const removal = host.caller.agents
    .remove({ agentId: host.agentId })
    .then(() => (settled = true));

  await stopped(host.agent, 0);
  await Promise.resolve();
  expect(settled).toBe(false);
  host.agent.processes[0]?.exited.resolve();
  await removal;
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({ installation: { status: 'not-installed' } });
}, 20_000);

it('updating an Agent while its readiness check runs waits for the stopped check to exit, then checks the new release', async () => {
  const host = await installHeldCheck();

  await host.publish('success', '2.0.0');
  await host.caller.agents.install({ agentId: host.agentId, version: '2.0.0' });
  await stopped(host.agent, 0);
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({
    installation: { version: '1.2.3' },
    operation: { status: 'installing' },
  });
  host.agent.processes[0]?.exited.resolve();
  await exitWhenStopped(host.agent, 1);
  await expect
    .poll(() => listedAgent(host.caller, host.agentId), { timeout: 10_000 })
    .toMatchObject({ version: '2.0.0', status: 'ready' });
}, 20_000);

it('a failed update runs the readiness check it stopped again', async () => {
  const host = await installHeldCheck();

  await host.publish('failure', '2.0.0');
  await host.caller.agents.install({ agentId: host.agentId, version: '2.0.0' });
  await exitWhenStopped(host.agent, 0);
  await exitWhenStopped(host.agent, 1);
  // The rerun check finds the kept copy Ready, and the catalog still offers 2.0.0.
  await expect
    .poll(() => listedAgent(host.caller, host.agentId), { timeout: 10_000 })
    .toMatchObject({ version: '1.2.3', status: 'update-available' });
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({
    installation: { version: '1.2.3' },
    operation: { status: 'failed' },
  });
}, 20_000);
