import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AgentEvent, FeedUpdate } from '../src/agent-events';
import { initialMappingState, toAgentEvents } from './to-agent-events';

const recording = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../mocks/cli/codex/recordings/0.157.0/${name}.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  ).payload.messages;
const mapRecording = (name: string) => {
  let state = initialMappingState();
  const events: AgentEvent[] = [];
  for (const message of recording(name)) {
    const mapped = toAgentEvents(message, state);
    state = mapped.mappingState;
    events.push(...mapped.events);
  }
  return events;
};
const settledRows = (events: AgentEvent[]): FeedUpdate[] =>
  events.flatMap((event) =>
    event.type === 'agent.feed' &&
    event.change.type === 'upsert' &&
    event.change.update.state === 'settled'
      ? [event.change.update]
      : [],
  );

describe('recorded Turns', () => {
  it.each(['reply', 'file-change'])(
    'maps %s with one start, one end and no vendor user messages',
    (name) => {
      const events = mapRecording(name);
      expect(
        events.filter((event) => event.type === 'agent.turnStarted'),
      ).toEqual([{ type: 'agent.turnStarted' }]);
      expect(
        events.filter((event) => event.type === 'agent.turnEnded'),
      ).toEqual([{ type: 'agent.turnEnded', stopReason: 'end_turn' }]);
      expect(
        settledRows(events).some((row) => row.sessionUpdate === 'user_message'),
      ).toBe(false);
      expect(
        settledRows(events)
          .filter((row) => row.sessionUpdate === 'agent_message')
          .map((row) => row.content),
      ).toEqual([[{ type: 'text', text: name === 'reply' ? 'OK' : 'done' }]]);
    },
  );
});

it('preserves every recorded file change and patch in one Tool call', () => {
  const rows = settledRows(mapRecording('file-change'));
  expect(
    rows.filter((row) => row.sessionUpdate === 'tool_call_update'),
  ).toEqual([
    expect.objectContaining({
      kind: 'edit',
      status: 'completed',
      locations: [{ path: '/repo/app.txt' }, { path: '/repo/notes.md' }],
      content: [
        {
          type: 'diff',
          changes: [
            { operation: 'modify', path: '/repo/app.txt' },
            { operation: 'add', path: '/repo/notes.md', newText: 'hello\n' },
          ],
          patch: {
            format: 'git_patch',
            text: expect.stringContaining('-beta\n+gamma\n'),
          },
        },
      ],
    }),
  ]);
});

it('maps recorded command output, exit status and usage without repeating the final text', () => {
  const events = mapRecording('edit-and-command');
  const tools = settledRows(events).filter(
    (row) => row.sessionUpdate === 'tool_call_update',
  );
  expect(tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'execute',
        status: 'completed',
        content: [
          expect.objectContaining({
            type: 'terminal',
            command: expect.stringContaining('cat app.txt notes.md'),
            output: 'alpha\ngamma\nhello\n',
            exitStatus: { exitCode: 0 },
          }),
        ],
      }),
    ]),
  );
  expect(events).toEqual(
    expect.arrayContaining([
      { type: 'agent.usage', usage: { used: 17120, size: 258400 } },
    ]),
  );
  expect(settledRows(events).at(-1)).toMatchObject({
    sessionUpdate: 'agent_message',
    content: [{ type: 'text', text: 'done' }],
  });
});

it('ends the recorded interrupted Turn and settles its unfinished command', () => {
  const events = mapRecording('interrupt');
  expect(events.at(-1)).toMatchObject({
    type: 'agent.turnEnded',
    stopReason: 'cancelled',
  });
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'agent.feed',
        change: expect.objectContaining({
          type: 'patch',
          set: { state: 'settled', status: 'cancelled' },
        }),
      }),
    ]),
  );
});

it('reconciles a thought summary with its final record and drops raw thought text once a summary streams', () => {
  let mappingState = initialMappingState();
  const messages = [
    { method: 'turn/started', params: { turn: { id: 'thought-turn' } } },
    {
      method: 'item/started',
      params: {
        turnId: 'thought-turn',
        item: { type: 'reasoning', id: 'thought', summary: [], content: [] },
      },
    },
    {
      method: 'item/reasoning/summaryTextDelta',
      params: {
        turnId: 'thought-turn',
        itemId: 'thought',
        summaryIndex: 0,
        delta: 'Check the files.',
      },
    },
    {
      method: 'item/reasoning/textDelta',
      params: {
        turnId: 'thought-turn',
        itemId: 'thought',
        contentIndex: 0,
        delta: 'Raw reasoning',
      },
    },
    {
      method: 'item/completed',
      params: {
        turnId: 'thought-turn',
        item: {
          type: 'reasoning',
          id: 'thought',
          summary: ['Check the files.'],
          content: ['Raw reasoning'],
        },
      },
    },
  ];
  const events = messages.flatMap((message) => {
    const mapped = toAgentEvents(
      message as Parameters<typeof toAgentEvents>[0],
      mappingState,
    );
    mappingState = mapped.mappingState;
    return mapped.events;
  });
  expect(settledRows(events)).toEqual([
    {
      id: 'thought',
      messageId: 'thought',
      sessionUpdate: 'agent_thought',
      state: 'settled',
      content: [{ type: 'text', text: 'Check the files.' }],
    },
  ]);
  expect(
    events.filter(
      (event) => event.type === 'agent.feed' && event.change.type === 'append',
    ),
  ).toEqual([
    {
      type: 'agent.feed',
      change: {
        type: 'append',
        id: 'thought',
        field: 'content.0.text',
        text: 'Check the files.',
      },
    },
  ]);
});

it.each(['failed', 'interrupted'])(
  'keeps the vendor error and stop reason of a %s Turn',
  (status) => {
    const started = toAgentEvents(
      {
        method: 'turn/started',
        params: { turn: { id: 'failed-turn' } },
      } as Parameters<typeof toAgentEvents>[0],
      initialMappingState(),
    );
    const ended = toAgentEvents(
      {
        method: 'turn/completed',
        params: {
          turn: {
            id: 'failed-turn',
            status,
            error: {
              message: 'The command failed',
              codexErrorInfo: 'other',
              additionalDetails: 'Exit 1',
            },
          },
        },
      } as Parameters<typeof toAgentEvents>[0],
      started.mappingState,
    );
    expect(ended.events).toEqual([
      {
        type: 'agent.turnEnded',
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

it('drops an unmapped notification without inspecting its payload', () => {
  const mappingState = initialMappingState();
  expect(
    toAgentEvents(
      { method: 'future/notification' } as unknown as Parameters<
        typeof toAgentEvents
      >[0],
      mappingState,
    ),
  ).toEqual({ events: [], mappingState });
});

it('attributes only the resumed Turn’s recorded usage when no previous baseline is loaded', () => {
  const ended = mapRecording('interrupt').at(-1);
  expect(ended).toMatchObject({
    type: 'agent.turnEnded',
    usage: {
      totalTokens: 19905,
      inputTokens: 19848,
      outputTokens: 57,
      cachedReadTokens: 16896,
    },
  });
});

it('retains usage received while idle as the next Turn’s baseline', () => {
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
