import type {
  PromptRequest,
  CancelNotification,
} from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it.each(['prompt', 'close'] as const)(
  'cancels background prediction on session.%s',
  async (action) => {
    const predicted = Promise.withResolvers<PromptRequest>();
    const cancelled = Promise.withResolvers<CancelNotification>();
    const late = Promise.withResolvers<void>();
    const closed: { sessionId: string }[] = [];
    onTestFinished(() => late.resolve());

    const host = await startAcpEngine({
      steps: [],
      initialize: {
        protocolVersion: 1,
        agentCapabilities: { sessionCapabilities: { close: {} } },
      },
      responses: {
        'session/prompt': [
          { steps: [] },
          {
            prompt: 'Return JSON only:',
            received: predicted,
            steps: [
              { type: 'gate', waitFor: late.promise },
              {
                type: 'update',
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: {
                    type: 'text',
                    text: '{"suggestion":"An obsolete prompt"}',
                  },
                },
              },
            ],
          },
        ],
        'session/close': [{ requests: closed }],
      },
      notifications: { 'session/cancel': { received: cancelled } },
    });

    const { sessionId } = await host.caller.session.new(emptySessionInput);
    await host.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Fix the failing test' }],
      followUpSuggestions: true,
    });
    const background = await predicted.promise;
    await waitForAcpSessionIdle(host, sessionId);
    expect(
      (await host.caller.session.get({ sessionId })).followUpSuggestion?.text,
    ).toBeNull();
    await replaceOrClose(host, sessionId, action);
    expect(await cancelled.promise).toEqual({
      sessionId: background.sessionId,
    });
    late.resolve();
    await expect
      .poll(() =>
        closed.some((request) => request.sessionId === background.sessionId),
      )
      .toBe(true);

    if (action === 'close') return;

    await waitForAcpSessionIdle(host, sessionId);
    expect(
      (await host.caller.session.get({ sessionId })).followUpSuggestion,
    ).toBeNull();
  },
);

async function replaceOrClose(
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
  action: 'prompt' | 'close',
): Promise<void> {
  await (action === 'close'
    ? host.caller.session.close({ sessionId })
    : host.caller.session.prompt({
        sessionId,
        prompt: [{ type: 'text', text: 'Do something else' }],
        followUpSuggestions: false,
      }));
}
