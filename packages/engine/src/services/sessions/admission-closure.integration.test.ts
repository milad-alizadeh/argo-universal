import type {
  CloseSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';

it.each(agentAdapters.map(({ agent }) => agent))(
  'rejects a %s prompt while Agent closure remains pending',
  async (agent) => {
    const stopped = Promise.withResolvers<void>();
    onTestFinished(() => stopped.resolve());
    const began = Promise.withResolvers<CloseSessionRequest>();
    const requests: PromptRequest[] = [];
    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: [
          { id: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
        ],
        responses: {
          'session/close': [{ received: began, waitFor: stopped.promise }],
          'session/prompt': [{ requests }],
        },
      },
      undefined,
      agent,
    );
    host.database.update(session).set({ agent }).run();
    await host.caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'fast',
      type: 'boolean',
      value: false,
    });
    const closure = host.caller.session.close({ sessionId: 'session-1' });
    await began.promise;
    await expect(
      host.caller.session.prompt({
        sessionId: 'session-1',
        prompt: [{ type: 'text', text: 'Continue' }],
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('cannot accept'),
    });
    expect(requests).toEqual([]);
    stopped.resolve();
    await closure;
  },
);
