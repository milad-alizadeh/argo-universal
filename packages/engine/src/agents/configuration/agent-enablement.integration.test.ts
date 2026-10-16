import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { startCustomAgentEngine } from '#mocks/custom-agent';

const admissionRefusal = 'cannot accept sessions.create';

const [registryAgent] = fixtureAgents;

if (!registryAgent)
  throw new Error('The cutover test needs a registry identity');

it('an unsaved Registry identity admits no new Session', async () => {
  const host = await startCustomAgentEngine();
  expect(
    host.openSessions.getSnapshot().can({
      type: 'sessions.create',
      sessionId: 'uninstalled-session',
      turnId: 'uninstalled-turn',
      projectId: 'project-1',
      projectPath: '/project',
      agent: registryAgent.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).toBe(false);
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: registryAgent.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow(admissionRefusal);
});
