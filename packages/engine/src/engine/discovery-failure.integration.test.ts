import { listBranches } from '@repo/git';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { discoveryFailures } from '#mocks/discovery';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const destination = { projectId: 'project-1', agent: 'mock' };

it.each(discoveryFailures)(
  'a discovery $failure failure closes owned resources and leaves main Checkout and Session rows intact',
  async ({ scenario, expectedCloses, message }) => {
    const closes: { sessionId: string }[] = [];

    const host = await startAcpEngine({
      steps: [],
      responses: scenario(closes),
    });

    const project = (await host.caller.projects.list())[0];

    if (!project) throw new Error('Missing Project');
    await expect(
      host.caller.session.refreshDiscovery(destination),
    ).rejects.toThrow(message);
    expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(1);
    expect(closes).toEqual(expectedCloses);
    expect(await listBranches(project.path)).toMatchObject({
      currentBranch: 'main',
    });
    expect(
      (await host.caller.session.list({ archived: false })).sessions,
    ).toEqual([]);
  },
);

it('a cached result does not make a disabled Agent available for discovery', async () => {
  const host = await startAcpEngine({ steps: [] });
  await host.caller.session.refreshDiscovery(destination);
  await host.caller.agents.setEnabled({ agentId: 'mock', enabled: false });
  await expect(host.caller.session.discovery(destination)).rejects.toThrow(
    'Agent is unavailable',
  );
  await expect(
    host.caller.session.refreshDiscovery(destination),
  ).rejects.toThrow('Agent is unavailable');
  expect(host.agent.processes).toHaveLength(1);
});
