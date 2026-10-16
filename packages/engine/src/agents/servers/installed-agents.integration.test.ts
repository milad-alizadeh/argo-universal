import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry } from '#mocks/installation';
import type { InstalledAgents } from './installed-agents';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

// The Engine's own Installed Agents module.
const installedAgentsOf = (host: EngineHost): InstalledAgents =>
  host.openSessions.getSnapshot().context.installedAgents;

it('answers with the Installed Agent row', async () => {
  const host = await startAcpEngine();

  expect(installedAgentsOf(host).installedAgent('mock')).toEqual({
    installed: true,
    agent: { id: 'mock', env: {} },
  });
});

it('answers that an Agent missing from agent_servers is not installed', async () => {
  const host = await startAcpEngine();

  expect(installedAgentsOf(host).installedAgent('missing')).toEqual({
    installed: false,
    message: 'Agent "missing" is not installed.',
  });
});

// A Registry entry whose distribution sets env, served at the Registry port, in a Project with a real folder.
const startLaunchHost = async (
  id: string,
): Promise<{ host: EngineHost; projectPath: string }> => {
  const projectPath = mkdtempSync(join(tmpdir(), 'argo-installed-agent-'));
  const storage = openTestDatabase({}, projectPath);
  const entry = { ...installEntry('binary'), id };
  const target = Object.values(entry.distribution.binary ?? {})[0];

  if (!target) throw new Error('Fixture distribution is missing');
  target.env = { VALUE: 'distribution', DISTRIBUTION: 'kept' };

  const host = await startEngineTestHost({
    database: storage.database,
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  onTestFinished(() => {
    storage.remove();
    rmSync(projectPath, { recursive: true, force: true });
  });
  await host.caller.agents.refreshRegistry();
  await host.caller.agents.addRegistry({ id });

  return { host, projectPath };
};

it('launches an Installed Agent from its Registry entry, with its row env last', async () => {
  const id = String(fixtureRegistryIds[0]);
  const { host, projectPath } = await startLaunchHost(id);
  host.database.$client
    .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
    .run(JSON.stringify({ VALUE: 'saved', ANTHROPIC_API_KEY: 'saved' }), id);
  const answer = installedAgentsOf(host).installedAgent(id);

  if (!answer.installed) throw new Error('The fixture Agent is not installed');

  const launch = await installedAgentsOf(host).launch(
    answer.agent,
    'project-1',
    new AbortController().signal,
  );

  launch.release?.();

  expect(launch).toMatchObject({
    agentId: id,
    registryId: id,
    projectId: 'project-1',
    cwd: projectPath,
    version: '1.2.3',
    authContext: 'local',
    executable: expect.stringContaining(`/registry/${id}/v_1.2.3_`),
    env: { VALUE: 'saved', ANTHROPIC_API_KEY: 'saved', DISTRIBUTION: 'kept' },
  });
});
