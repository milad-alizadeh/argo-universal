import { expect, it } from 'vitest';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it.each([
  ['inherited constructor', { type: 'constructor' }],
  ['inherited stringifier', { type: 'toString' }],
  ['prototype discriminator', { type: '__proto__' }],
  ['unknown message', { type: 'future_message' }],
  [
    'array stream discriminator',
    {
      type: 'stream_event',
      event: {
        type: 'content_block_start',
        index: 0,
        content_block: { type: ['tool_use'] },
      },
    },
  ],
  ['missing CLI extension envelope', { type: 'command_lifecycle' }],
  [
    'invalid CLI extension UUID',
    {
      type: 'system',
      subtype: 'post_turn_summary',
      uuid: 'bad',
      session_id: 'session',
    },
  ],
  [
    'unknown CLI system extension',
    {
      type: 'system',
      subtype: 'future_summary',
      uuid: '0c727db1-a8bd-42ae-8a88-977412e3904b',
      session_id: 'session',
    },
  ],
  [
    'non-text message',
    {
      type: 'assistant',
      message: { id: 'message', content: [{ type: 'text', text: 42 }] },
    },
  ],
  [
    'missing delta',
    {
      type: 'stream_event',
      event: { type: 'content_block_delta', index: 0, delta: null },
    },
  ],
  [
    'non-numeric usage',
    {
      type: 'result',
      subtype: 'success',
      result: 'Done',
      usage: { input_tokens: 'bad', output_tokens: 1 },
    },
  ],
  [
    'missing question',
    {
      type: 'control_request',
      request_id: 'request',
      request: {
        subtype: 'can_use_tool',
        tool_name: 'AskUserQuestion',
        tool_use_id: 'tool',
        input: { questions: null },
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

it.each(['constructor', 'toString', '__proto__'])(
  'maps the custom tool %s without inherited built-in shaping',
  (name): void => {
    const result = toAgentEvents(
      {
        type: 'assistant',
        message: {
          id: 'message',
          content: [{ type: 'tool_use', id: 'tool', name, input: {} }],
        },
      },
      initialMappingState(),
    );
    expect(result.events).toMatchObject([
      {
        type: 'agent.feed',
        change: {
          type: 'upsert',
          update: { title: name, kind: 'other', name },
        },
      },
    ]);
  },
);
