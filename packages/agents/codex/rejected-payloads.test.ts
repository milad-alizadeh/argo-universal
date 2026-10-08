import { expect, it } from 'vitest';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it.each([
  [
    'invalid receipt time',
    { method: 'warning', params: {}, receivedAt: 'bad' },
  ],
  ['inherited constructor', { method: 'constructor' }],
  ['inherited stringifier', { method: 'toString' }],
  ['prototype discriminator', { method: '__proto__' }],
  [
    'invalid turn error details',
    {
      method: 'turn/completed',
      params: {
        threadId: 'thread',
        turn: {
          id: 'turn',
          status: 'failed',
          error: {
            message: 'Failed',
            codexErrorInfo: 42,
            additionalDetails: null,
          },
        },
      },
    },
  ],
  ['unknown message', { method: 'future/notification' }],
  [
    'array user input discriminator',
    {
      method: 'item/started',
      params: {
        threadId: 'thread',
        turnId: 'turn',
        item: {
          type: 'userMessage',
          id: 'item',
          content: [{ type: ['text'], text: 'malformed' }],
        },
      },
    },
  ],
  [
    'missing item content',
    {
      method: 'item/started',
      params: {
        threadId: 'thread',
        turnId: 'turn',
        item: { type: 'reasoning', id: 'item', summary: [], content: null },
      },
    },
  ],
  [
    'missing question',
    {
      method: 'item/tool/requestUserInput',
      id: 'request',
      params: {
        threadId: 'thread',
        turnId: 'turn',
        itemId: 'tool',
        questions: null,
        isBlocking: true,
      },
    },
  ],
])(
  'rejects %s through the Session report and count event',
  (_name, payload): void => {
    const mappingState = initialMappingState();
    const result = toAgentEvents(payload, mappingState);
    expect(result.events).toEqual([
      { type: 'agent.messageRejected', reason: 'Unrecognised vendor payload' },
    ]);
    expect(result.mappingState).toBe(mappingState);
  },
);

it.each(['warning', 'hook/started', 'item/plan/delta'])(
  'keeps the recognised unused SDK notification %s out of the Feed',
  (method): void => {
    const mappingState = initialMappingState();
    expect(toAgentEvents({ method, params: {} }, mappingState)).toEqual({
      events: [],
      mappingState,
    });
  },
);
