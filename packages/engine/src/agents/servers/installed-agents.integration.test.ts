import type { ACPAgent } from '@repo/contracts';
import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { installEntry } from '#mocks/installation';
import {
  installedAgentsOf,
  requireInstalled,
  startLaunchHost,
} from '#mocks/installed-agents';

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

// A binary entry whose distribution sets env.
const binaryEntry = (id: string): ACPAgent => {
  const entry = { ...installEntry('binary'), id };
  const target = Object.values(entry.distribution.binary ?? {})[0];

  if (!target) throw new Error('Fixture distribution is missing');
  target.env = { VALUE: 'distribution', DISTRIBUTION: 'kept' };

  return entry;
};

it('launches an Installed Agent from its Registry entry, with its row env last', async () => {
  const id = String(fixtureRegistryIds[0]);
  const { host, projectPath } = await startLaunchHost(binaryEntry(id));
  host.database.$client
    .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
    .run(JSON.stringify({ VALUE: 'saved', ANTHROPIC_API_KEY: 'saved' }), id);

  const deferred = await installedAgentsOf(host).launch(
    requireInstalled(host, id),
    'project-1',
    new AbortController().signal,
  );

  expect(deferred).toMatchObject({
    agentId: id,
    projectId: 'project-1',
    version: '1.2.3',
  });
  const launch = await deferred.resolve(new AbortController().signal);

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
