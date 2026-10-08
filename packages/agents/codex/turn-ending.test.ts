import { expect, it } from 'vitest';
import { agentTurnEndedEvent, mapResponses } from './mocks/mapping';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it.each(['failed', 'interrupted'] as const)(
  'keeps the vendor error and stop reason of a %s Turn',
  (status): void => {
    const started = toAgentEvents(
      {
        method: 'turn/started',
        params: {
          threadId: 'thread',
          turn: {
            id: 'failed-turn',
            status: 'inProgress',
            error: null,
            items: [],
            itemsView: 'full',
            startedAt: null,
            completedAt: null,
            durationMs: null,
          },
        },
      },
      initialMappingState(),
    );
    const ended = toAgentEvents(
      {
        method: 'turn/completed',
        params: {
          threadId: 'thread',
          turn: {
            id: 'failed-turn',
            items: [],
            itemsView: 'full',
            startedAt: null,
            completedAt: null,
            durationMs: null,
            status,
            error: {
              message: 'The command failed',
              codexErrorInfo: 'other',
              additionalDetails: 'Exit 1',
              misalignment: null,
            },
          },
        },
      },
      started.mappingState,
    );
    expect(ended.events).toEqual([
      {
        type: agentTurnEndedEvent,
        stopReason: status === 'failed' ? 'error' : 'cancelled',
        error: {
          code: -32603,
          message: 'The command failed',
          data: { info: 'other', details: 'Exit 1' },
        },
      },
    ]);
  },
);

it('attributes only the resumed Turn’s recorded usage when no previous baseline is loaded', (): void => {
  const ended = mapResponses('interrupt').at(-1);
  expect(ended).toMatchObject({
    type: agentTurnEndedEvent,
    usage: {
      totalTokens: 19905,
      inputTokens: 19848,
      outputTokens: 57,
      cachedReadTokens: 16896,
    },
  });
});

it('retains usage received while idle as the next Turn’s baseline', (): void => {
  const breakdown = {
    totalTokens: 100,
    inputTokens: 80,
    outputTokens: 20,
    reasoningOutputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
  };
  const idle = toAgentEvents(
    {
      method: 'thread/tokenUsage/updated',
      params: {
        threadId: 'session',
        turnId: 'previous',
        tokenUsage: {
          total: breakdown,
          last: breakdown,
          modelContextWindow: 1000,
        },
      },
    },
    initialMappingState(),
  );
  expect(idle.mappingState.totalUsage).toEqual(breakdown);
});
