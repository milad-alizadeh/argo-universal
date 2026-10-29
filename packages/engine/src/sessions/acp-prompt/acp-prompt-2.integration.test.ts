import type { PromptRequest } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('local acknowledgement follows durable Session, Turn and prompt before the Agent finishes', async () => {
    const completion = Promise.withResolvers<void>();
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/prompt': [{ received, waitFor: completion.promise }],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const acknowledged = await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Save this prompt' }],
    });

    const observed = {
      request: await received.promise,
      durable: [
        host.database.$client
          .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
          .get(created.sessionId),
        host.database.$client
          .prepare('SELECT status FROM turn WHERE session_id = ?')
          .get(created.sessionId),
        host.database.$client
          .prepare('SELECT session_update FROM feed_row WHERE session_id = ?')
          .get(created.sessionId),
      ],
    };

    completion.resolve();
    expect(acknowledged.messageId).toMatch(/:user$/);
    expect(observed).toEqual({
      request: {
        sessionId: 'owned-1',
        prompt: [{ type: 'text', text: 'Save this prompt' }],
      },
      durable: [
        { vendor_session_id: 'owned-1' },
        { status: 'running' },
        { session_update: 'user_message' },
      ],
    });
  });
});
