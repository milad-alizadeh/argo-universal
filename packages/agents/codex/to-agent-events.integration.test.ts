import { readFileSync } from 'node:fs';
import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { AgentEvent, FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import type {
  ItemCompletedNotification,
  ItemStartedNotification,
  CommandAction as SuppliedCommandAction,
} from './protocol.gen';
import { initialMappingState, toAgentEvents } from './to-agent-events';

const recording = (
  name: string,
): (VendorMessage & { receivedAt: number | undefined })[] =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../mocks/cli/codex/recordings/0.157.0/${name}.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  ).payload.messages.map(
    (
      message: VendorMessage & { emittedAtMs?: number },
    ): VendorMessage & { receivedAt: number | undefined } => ({
      ...message,
      receivedAt: message.emittedAtMs,
    }),
  );
const mapMessages = (messages: VendorMessage[]): AgentEvent[] => {
  let state = initialMappingState();
  const events: AgentEvent[] = [];
  for (const message of messages) {
    const mapped = toAgentEvents(message, state);
    state = mapped.mappingState;
    events.push(...mapped.events);
  }
  return events;
};
const mapRecording = (name: string): AgentEvent[] =>
  mapMessages(recording(name));
const replaceCommandActions = <
  Notification extends ItemStartedNotification | ItemCompletedNotification,
>(
  notification: Notification,
  commandActions: SuppliedCommandAction[],
): Notification => ({
  ...notification,
  item: { ...notification.item, commandActions },
});
const withCommandActions = (
  commandActions: SuppliedCommandAction[],
): VendorMessage[] =>
  recording('edit-and-command').map((message: VendorMessage): VendorMessage => {
    if (
      message.method === 'item/started' &&
      message.params.item.type === 'commandExecution'
    )
      return {
        ...message,
        params: replaceCommandActions(message.params, commandActions),
      };
    if (
      message.method === 'item/completed' &&
      message.params.item.type === 'commandExecution'
    )
      return {
        ...message,
        params: replaceCommandActions(message.params, commandActions),
      };
    return message;
  });
const settledRows = (events: AgentEvent[]): FeedUpdate[] =>
  events.flatMap((event): FeedUpdate[] =>
    event.type === 'agent.feed' &&
    event.change.type === 'upsert' &&
    event.change.update.state === 'settled'
      ? [event.change.update]
      : [],
  );

it('reconciles the recorded Compaction start and completion into one row', (): void => {
  const events = mapRecording('compaction');
  const rows = events.flatMap(
    (event): Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>[] =>
      event.type === 'agent.feed' &&
      event.change.type === 'upsert' &&
      event.change.update.sessionUpdate === 'compaction_update'
        ? [event.change.update]
        : [],
  );
  expect(rows).toEqual([
    {
      id: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      compactionId: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      sessionUpdate: 'compaction_update',
      state: 'open',
      status: 'in_progress',
    },
    {
      id: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      compactionId: '01a10f63-35db-7062-a47d-ebd815c1bea2',
      sessionUpdate: 'compaction_update',
      state: 'settled',
      status: 'completed',
    },
  ]);
});

it('exposes only the command actions the Agent supplied, including unknown actions', (): void => {
  const tools = settledRows(mapRecording('edit-and-command'))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(tools).toEqual([
    expect.objectContaining({
      _meta: {
        argo: expect.objectContaining({
          commandActions: [
            { type: 'read', command: 'cat app.txt', path: '/repo/app.txt' },
          ],
        }),
      },
    }),
    expect.objectContaining({
      _meta: {
        argo: expect.objectContaining({
          commandActions: [
            { type: 'unknown', command: 'cat app.txt notes.md' },
          ],
        }),
      },
    }),
  ]);
});

it('keeps the recorded Tool call start and end times', (): void => {
  const tools = settledRows(mapRecording('edit-and-command'))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(
    tools.map(
      (row): NonNullable<ToolCallUpdate['_meta']>['argo'] => row._meta?.argo,
    ),
  ).toEqual([
    expect.objectContaining({
      startedAt: 1791172062416,
      endedAt: 1791172062416,
    }),
    expect.objectContaining({
      startedAt: 1791172072705,
      endedAt: 1791172072705,
    }),
  ]);
});

it('omits command actions when the Agent supplies none, even for a read-shaped command', (): void => {
  const messages = withCommandActions([]);
  const tools = settledRows(mapMessages(messages))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(tools).toHaveLength(2);
  for (const tool of tools)
    expect(tool._meta?.argo).not.toHaveProperty('commandActions');
});

it.each([
  {
    supplied: { type: 'listFiles', command: 'ls', path: '/repo' },
    expected: { type: 'list', command: 'ls', path: '/repo' },
  },
  {
    supplied: {
      type: 'search',
      command: 'rg alpha',
      query: 'alpha',
      path: null,
    },
    expected: { type: 'search', command: 'rg alpha', query: 'alpha' },
  },
  {
    supplied: { type: 'listFiles', command: 'ls', path: null },
    expected: { type: 'list', command: 'ls' },
  },
] satisfies { supplied: SuppliedCommandAction; expected: CommandAction }[])(
  'maps supplied $supplied.type metadata without inventing a missing path',
  ({ supplied, expected }): void => {
    const messages = withCommandActions([supplied]);
    const tools = settledRows(mapMessages(messages))
      .filter(
        (
          row,
        ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
          row.sessionUpdate === 'tool_call_update',
      )
      .filter((row): boolean => row.kind === 'execute');
    expect(
      tools.map(
        (tool): CommandAction[] | undefined => tool._meta?.argo?.commandActions,
      ),
    ).toEqual([[expected], [expected]]);
  },
);

describe('recorded Turns', (): void => {
  it.each(['reply', 'file-change'])(
    'maps %s with one start, one end and no vendor user messages',
    (name): void => {
      const events = mapRecording(name);
      expect(
        events.filter(
          (
            event,
          ): event is Extract<AgentEvent, { type: 'agent.turnStarted' }> =>
            event.type === 'agent.turnStarted',
        ),
      ).toEqual([{ type: 'agent.turnStarted' }]);
      expect(
        events.filter(
          (event): event is Extract<AgentEvent, { type: 'agent.turnEnded' }> =>
            event.type === 'agent.turnEnded',
        ),
      ).toEqual([{ type: 'agent.turnEnded', stopReason: 'end_turn' }]);
      expect(
        settledRows(events).some(
          (
            row,
          ): row is Extract<FeedUpdate, { sessionUpdate: 'user_message' }> =>
            row.sessionUpdate === 'user_message',
        ),
      ).toBe(false);
      expect(
        settledRows(events)
          .filter(
            (
              row,
            ): row is Extract<FeedUpdate, { sessionUpdate: 'agent_message' }> =>
              row.sessionUpdate === 'agent_message',
          )
          .map((row): typeof row.content => row.content),
      ).toEqual([[{ type: 'text', text: name === 'reply' ? 'OK' : 'done' }]]);
    },
  );
});

it('preserves every recorded file change and patch in one Tool call', (): void => {
  const rows = settledRows(mapRecording('file-change'));
  expect(
    rows.filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    ),
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

it('maps recorded command output, exit status and usage without repeating the final text', (): void => {
  const events = mapRecording('edit-and-command');
  const tools = settledRows(events).filter(
    (row): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
      row.sessionUpdate === 'tool_call_update',
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

it('ends the recorded interrupted Turn and settles its unfinished command', (): void => {
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
          set: expect.objectContaining({
            state: 'settled',
            status: 'cancelled',
          }),
        }),
      }),
    ]),
  );
});

it('retains the recorded cancellation time when the Tool call never sends a final item', (): void => {
  const events = mapRecording('interrupt');
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'agent.feed',
        change: expect.objectContaining({
          type: 'patch',
          set: expect.objectContaining({
            _meta: {
              argo: {
                startedAt: 1791172079446,
                endedAt: 1791172079454,
                commandActions: [{ type: 'unknown', command: 'sleep 30' }],
              },
            },
          }),
        }),
      }),
    ]),
  );
});

it('reconciles a thought summary with its final record and drops raw thought text once a summary streams', (): void => {
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
  const events = mapMessages(messages as VendorMessage[]);
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
      (event): boolean =>
        event.type === 'agent.feed' && event.change.type === 'append',
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
  (status): void => {
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

it('drops an unmapped notification without inspecting its payload', (): void => {
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

it('attributes only the resumed Turn’s recorded usage when no previous baseline is loaded', (): void => {
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
