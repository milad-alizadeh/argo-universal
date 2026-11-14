import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { sessionSources } from '#mocks/session-sources';
import { Sessions } from '../sessions';

const spawn = {
  type: 'update' as const,
  update: {
    sessionUpdate: 'subagent_update' as const,
    sessionId: 'vendor-reviewer',
    title: 'Follow up spec review',
    state: { state: 'running' as const },
    description: 'general-purpose',
  },
};

it('draws the role a Session declared through its Operation on the Agent it spawns next', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ steps: [spawn] }] },
  });

  const sessions = new Sessions(sessionSources(host.openSessions));
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  await sessions.implementations['session.declareSubagentRole']({
    sessionId,
    role: 'review',
  });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Review it' }],
  });

  await vi.waitFor(async () => {
    const agents = await sessions.implementations['session.listAgents']({
      sessionId,
    });

    expect(agents.map(({ role }) => role)).toEqual(['review']);
  });
});
