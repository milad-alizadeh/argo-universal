import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { readAgentIdentity, sessionIdentityStep } from '#mocks/session-access';

// A live Feed row keeps the `_meta: undefined` its ACP mapping wrote for a block without metadata; JSON leaves it out.
it('answers a running Session its own live Feed when a content block has no metadata', async () => {
  const outputs: TerminalOutputResponse[] = [];
  const entered = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [
      sessionIdentityStep(outputs),
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Bare result' },
        },
      },
      { type: 'gate', waitFor: finish.promise, entered },
    ],
  });

  try {
    const { sessionId } = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Read my Feed' }],
    });

    await entered.promise;
    const { token } = readAgentIdentity(outputs);
    const caller = await operationCaller(host, token);

    expect(
      await runOperation(caller.operations, {
        id: 'session.feed',
        params: { sessionId, limit: 40 },
      }),
    ).toMatchObject({
      messages: [{ content: [{ type: 'text', text: 'Bare result' }] }],
    });
  } finally {
    finish.resolve();
  }
}, 30_000);
