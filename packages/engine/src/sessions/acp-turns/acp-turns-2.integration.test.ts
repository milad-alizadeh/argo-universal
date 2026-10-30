import type { PromptRequest } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('closing a running Turn retains its association until final accepted text is published', async () => {
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        steps: [{ type: 'hold' }],
        responses: {
          'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
          'session/close': [
            {
              steps: [
                {
                  type: 'update',
                  update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'Final accepted text' },
                  },
                },
              ],
              result: {},
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Start' }],
    });
    await received.promise;
    await host.caller.session.close(created);
    const page = await host.caller.feed.page({ ...created, direction: 'tail' });
    expect(page.rows).toMatchObject([
      { sessionUpdate: 'user_message', turnId: expect.any(String) },
      {
        sessionUpdate: 'agent_message',
        state: 'settled',
        turnId: expect.any(String),
        content: [{ text: 'Final accepted text' }],
      },
      {
        sessionUpdate: 'notice',
        turnId: expect.any(String),
        _meta: { argo: { turnEnd: { stopReason: 'cancelled' } } },
      },
    ]);
    expect(page.rows[1]?.turnId).toBe(page.rows[0]?.turnId);
    expect(
      host.database.$client
        .prepare('SELECT status, stop_reason FROM turn')
        .get(),
    ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
  });

  it('failed close releases at once and publishes text accepted before the error', async () => {
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        autoExit: false,
        steps: [{ type: 'hold' }],
        responses: {
          'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
          'session/close': [
            {
              steps: [
                {
                  type: 'update',
                  update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: {
                      type: 'text',
                      text: 'Accepted before failed close',
                    },
                  },
                },
              ],
              error: 'Close refused',
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Start' }],
    });
    await received.promise;
    await expect(host.caller.session.close(created)).resolves.toEqual({});
    const process = host.agent.processes[0];

    if (!process) throw new Error('Owned lifetime is missing');
    expect(process.terminations).toBe(1);
    const page = await host.caller.feed.page({ ...created, direction: 'tail' });
    expect(page.rows[1]).toMatchObject({
      state: 'settled',
      content: [{ text: 'Accepted before failed close' }],
      turnId: page.rows[0]?.turnId,
    });
    expect(
      host.database.$client
        .prepare('SELECT status, stop_reason FROM turn')
        .get(),
    ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
  });
});
