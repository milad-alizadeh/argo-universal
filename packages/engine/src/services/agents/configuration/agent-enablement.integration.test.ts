import { agentAdapters } from '@repo/agents';
import { expect, it } from 'vitest';
import { startCustomAgentEngine } from '#mocks/custom-agent';

const [nativeAdapter] = agentAdapters;
if (!nativeAdapter) throw new Error('Engine needs a native Agent adapter');

it('a disabled native Agent admits no new Session', async () => {
  const host = await startCustomAgentEngine();
  const agentId = nativeAdapter.agent;
  await host.caller.agents.setEnabled({ agentId, enabled: false });
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: agentId,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow('cannot accept sessions.create');
});
