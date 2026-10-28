import { existsSync } from 'node:fs';
import type {
  NewSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { withoutSessionAccess } from '#mocks/session-access';

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  const prompt = [{ type: 'text' as const, text: 'Start' }];

  it('without Agent access, a close timeout releases the Session, keeps its Checkout, and lets its sibling and next Send use the connection', async () => {
    const openings: NewSessionRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        sessionAccess: withoutSessionAccess,
        closeTimeoutMs: 50,
        responses: {
          'session/new': [{ requests: openings }],
          'session/close': [
            { sessionId: 'owned-1', steps: [{ type: 'hold' }] },
            { sessionId: 'owned-2', result: {} },
          ],
        },
      },
      undefined,
      agentId,
    );

    const closed = await host.caller.session.new({
      ...sessionInput,
      checkout: { type: 'worktree', baseBranch: 'main' },
    });

    const sibling = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({ ...closed, prompt });
    await waitForAcpSessionIdle(host, closed.sessionId);
    await expect(host.caller.session.close(closed)).resolves.toEqual({});
    expect(existsSync(openings[0]?.cwd ?? '')).toBe(true);
    await host.caller.session.prompt({ ...sibling, prompt });
    await waitForAcpSessionIdle(host, sibling.sessionId);
    await host.caller.session.prompt({ ...closed, prompt });
    await waitForAcpSessionIdle(host, closed.sessionId);
    expect(host.agent.processes).toHaveLength(1);
    expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
  });

  it('Engine shutdown during a running Turn terminates its ACP process once and waits for its observed exit', async () => {
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        autoExit: false,
        steps: [{ type: 'hold' }],
        responses: {
          'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
        },
      },
      undefined,
      agentId,
    );

    const { sessionId } = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({ sessionId, prompt });
    await received.promise;
    const process = requireScriptedProcessAt(host.agent.processes);
    let stopped = false;

    const stopping = host.stop().then(() => {
      stopped = true;
    });

    await expect.poll(() => process.terminations).toBe(1);
    const beforeExit = { stopped };
    process.exited.resolve();
    await stopping;
    expect({ beforeExit, terminations: process.terminations }).toEqual({
      beforeExit: { stopped: false },
      terminations: 1,
    });
  });
});
