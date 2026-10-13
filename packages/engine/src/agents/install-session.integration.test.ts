import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentsCatalogOutput, SessionNewOutput } from '@repo/contracts';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { expect, it, onTestFinished } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';

type InstalledSession = {
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  agent: AgentsCatalogOutput['agents'][number];
  created: SessionNewOutput;
};
async function openInstalledSession(): Promise<InstalledSession> {
  const project = await mkdtemp(join(tmpdir(), 'argo-installed-session-'));
  await initTestRepository(project);
  const storage = openTestDatabase({}, project);
  onTestFinished(async () => {
    storage.remove();
    await rm(project, { recursive: true, force: true });
  });
  const host = await startEngineTestHost({
    database: storage.database,
    installationPorts,
    fetchAgents: async () => ({
      version: '1.0.0',
      agents: [installEntry('npx')],
    }),
  });
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const agent = (await host.caller.agents.catalog()).agents[0];
  if (!agent) throw new Error('Catalog did not contain fixture');
  await host.caller.agents.install({ agentId: agent.id, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: agent.id }))
          .operation?.status,
    )
    .toBe('installed');
  const created = await host.caller.session.new({
    projectId: 'project-1',
    agent: agent.id,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [],
  });
  return { host, agent, created };
}

it('an installed Agent uses the common Session lifecycle', async () => {
  const { host, agent, created } = await openInstalledSession();
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Fix the build' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.close(created);
  expect(
    (
      await host.caller.session.list({
        projectId: 'project-1',
        archived: false,
      })
    ).sessions,
  ).toContainEqual(
    expect.objectContaining({ agent: agent.id, sessionId: created.sessionId }),
  );
});

it('an installed Agent cannot be replaced while its Session is open', async () => {
  const { host, agent } = await openInstalledSession();
  await expect(
    host.caller.agents.install({ agentId: agent.id, version: '1.2.3' }),
  ).resolves.toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('in use'),
  });
});
