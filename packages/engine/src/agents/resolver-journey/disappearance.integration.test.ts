import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentInfo, SessionNewOutput } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { openTestDatabase } from '#mocks/database';
import {
  pathBinaryEntry,
  pathEntrypoint as entrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath, type MachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

type Started = {
  host: Host;
  machine: MachinePath;
  checks: ReturnType<typeof createScriptedAgentProcess>;
};
const startWithProject = async (): Promise<Started> => {
  const project = await mkdtemp(join(tmpdir(), 'argo-resolver-session-'));
  await initTestRepository(project);
  const storage = openTestDatabase({}, project);
  onTestFinished(async () => {
    storage.remove();
    await rm(project, { recursive: true, force: true });
  });
  const machine = await createMachinePath();
  await machine.place(entrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);
  const host = await startInstallEngine(pathBinaryEntry(), undefined, {
    database: storage.database,
    fixtureAgents: [],
    acp: checks,
  });
  await expect.poll(() => listed(host)).toMatchObject({ status: 'ready' });
  return { host, machine, checks };
};
const openSession = (host: Host): Promise<SessionNewOutput> =>
  host.caller.session.new({
    projectId: 'project-1',
    agent: host.agentId,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [],
  });

it('an Agent that left PATH keeps its row, Enabled and Sessions, and shows Not found with Repair', async () => {
  const { host, machine } = await startWithProject();
  const created = await openSession(host);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Fix the build' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.close(created);
  await machine.remove(entrypoint);
  await host.caller.agents.recheck({ agentId: host.agentId });
  expect(await listed(host)).toMatchObject({
    agent: host.agentId,
    enabled: true,
    status: 'not-found',
    reason:
      'Fixture ACP is no longer on this Mac. Repair installs it with Argo.',
  });
  expect(
    (
      await host.caller.session.list({
        projectId: 'project-1',
        archived: false,
      })
    ).sessions,
  ).toContainEqual(
    expect.objectContaining({
      agent: host.agentId,
      sessionId: created.sessionId,
    }),
  );
}, 30_000);

it('opening a Session looks for the Agent again instead of trusting the last look', async () => {
  const { host, machine, checks } = await startWithProject();
  await machine.remove(entrypoint);
  await expect(openSession(host)).rejects.toThrow(
    'Fixture ACP is no longer on this Mac',
  );
  const moved = await createMachinePath();
  const file = await moved.place(entrypoint);
  checks.processes.splice(0);
  await openSession(host);
  expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
    file,
  ]);
}, 30_000);

it('a disabled Agent found again stays disabled', async () => {
  const { host, machine } = await startWithProject();
  await host.caller.agents.setEnabled({
    agentId: host.agentId,
    enabled: false,
  });
  await machine.remove(entrypoint);
  await host.caller.agents.list({ refresh: true });
  expect((await listed(host))?.owner).toBeUndefined();
  await machine.place(entrypoint);
  await host.caller.agents.list({ refresh: true });
  expect(await listed(host)).toMatchObject({
    enabled: false,
    owner: 'unknown',
  });
}, 30_000);
