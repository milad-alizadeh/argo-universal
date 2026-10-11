import { agentAdapters } from '@repo/agents';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it.each(agentAdapters.map(({ agent }) => agent))(
  'the public empty %s Session becomes readable without a Turn and awaits closure',
  async (agent) => {
    const host = await startAcpEngine({ steps: [] }, undefined, agent);
    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    const feed = (
      await host.caller.feed.subscribe({
        sessionId: created.sessionId,
        after: null,
      })
    )[Symbol.asyncIterator]();
    const first = await feed.next();
    expect(first.value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        agent,
        state: 'idle',
        activeTurnId: null,
        usage: null,
        pendingPermission: null,
        pendingElicitation: null,
        pendingPlanProposal: null,
        configOptions: [],
        changes: { files: 0, additions: 0, deletions: 0 },
        epoch: 0,
        maxRevision: 0,
      },
    });
    await feed.return?.();
    expect(host.agent.processes[0]?.terminations).toBe(0);
    expect(
      await host.caller.session.close({ sessionId: created.sessionId }),
    ).toEqual({});
    expect(host.agent.processes[0]?.terminations).toBe(1);
  },
);
