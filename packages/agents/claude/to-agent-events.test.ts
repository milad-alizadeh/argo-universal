import { SessionUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { FeedChange, FeedUpdate } from '../src/agent-events';
import type { VendorMessage, SDKResultMessage } from './messages';
import { compaction } from './mocks/sdk-compaction';
import { interrupted } from './mocks/sdk-interrupt';
import { assistant, user } from './mocks/sdk-messages';
import { completed } from './mocks/sdk-result';
import { edits } from './mocks/sdk-tools';
import {
  initialMappingState,
  type MappingState,
  toAgentEvents,
} from './to-agent-events';

const vendorSessionId = '6d8abfff-ea69-4c66-b642-d445f9060d16';
const agentTurnEndedEvent = 'agent.turnEnded';
// SDK-owned messages exercise mapping without narrowing their provider shapes.
function mapAll(
  messages: VendorMessage[],
  start = initialMappingState(),
): { events: import('../src').AgentEvent[]; mappingState: MappingState } {
  let mappingState: MappingState = start;
  const events = messages.flatMap((message): import('../src').AgentEvent[] => {
    const result = toAgentEvents(message, mappingState);
    mappingState = result.mappingState;
    return result.events;
  });
  return { events, mappingState };
}

const feedChanges = (
  events: ReturnType<typeof mapAll>['events'],
): FeedChange[] =>
  events.flatMap((event): FeedChange[] =>
    event.type === 'agent.feed' ? [event.change] : [],
  );

it('reconciles the recorded compacting status and boundary into one Compaction row', (): void => {
  const changes = feedChanges(mapAll(compaction).events);
  const compactions = changes.flatMap(
    (change): Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>[] =>
      change.type === 'upsert' &&
      change.update.sessionUpdate === 'compaction_update'
        ? [change.update]
        : [],
  );
  expect(compactions).toEqual([
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'open',
      status: 'in_progress',
    },
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'settled',
      status: 'completed',
    },
  ]);
});

it('keeps the Agent’s Bash description and timestamps without inventing command actions', (): void => {
  const rows = foldRows(feedChanges(mapAll(edits).events));
  const command = rows.find(
    (row): boolean =>
      row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
  );
  expect(command).toMatchObject({
    title: 'Show hello.txt and short git status',
    _meta: { argo: { startedAt: 1791165776295, endedAt: 1791165776582 } },
  });
  if (command?.sessionUpdate !== 'tool_call_update')
    throw new Error('Missing recorded command');
  expect(command._meta?.argo).not.toHaveProperty('commandActions');
});

it('uses the transport receipt time when an interrupted Tool call has no final result', (): void => {
  const messages = interrupted
    .filter(
      (message): message is Exclude<VendorMessage, { type: 'user' }> =>
        message.type !== 'user',
    )
    .map(
      (
        message,
      ):
        | Exclude<VendorMessage, { type: 'user' | 'result' }>
        | (Extract<VendorMessage, { type: 'result' }> & {
            receivedAt: number;
          }) =>
        message.type === 'result'
          ? { ...message, receivedAt: 1791165784000 }
          : message,
    );
  const rows = foldRows(feedChanges(mapAll(messages).events));
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sessionUpdate: 'tool_call_update',
        status: 'cancelled',
        _meta: { argo: expect.objectContaining({ endedAt: 1791165784000 }) },
      }),
    ]),
  );
});

// Applies Feed changes the way the Feed actor does, to see the rows they leave.
function foldRows(changes: FeedChange[]): FeedUpdate[] {
  const rows = new Map<string, FeedUpdate>();
  for (const change of changes) {
    if (change.type === 'upsert') {
      rows.set(change.update.id, change.update);
      continue;
    }
    const row = rows.get(change.id);
    if (!row) throw new Error(`No row ${change.id}`);
    if (change.type === 'patch') {
      rows.set(change.id, parseFeedUpdate({ ...row, ...change.set }));
      continue;
    }
    const copy: unknown = structuredClone(row);
    const keys = change.field.split('.');
    const last = keys.pop();
    if (!last) throw new Error('Empty append path');
    const target = keys.reduce<unknown>(
      (value, key): unknown => pathValue(value, key),
      copy,
    );
    if (!isRecord(target)) throw new Error('Invalid append target');
    target[last] = `${target[last]}${change.text}`;
    rows.set(change.id, parseFeedUpdate(copy));
  }
  return [...rows.values()];
}

describe('toAgentEvents on a Turn with edits and commands', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  it('settles a thought, four Tool calls and the answer, in order', (): void => {
    expect(
      rows.map(
        (
          row,
        ): (
          | 'agent_message'
          | 'agent_thought'
          | 'compaction_update'
          | 'notice'
          | 'open'
          | 'plan_update'
          | 'settled'
          | 'subagent_update'
          | 'task_update'
          | 'tool_call_update'
          | 'user_message'
        )[] => [row.sessionUpdate, row.state],
      ),
    ).toEqual([
      ['agent_thought', 'settled'],
      ['tool_call_update', 'settled'],
      ['tool_call_update', 'settled'],
      ['tool_call_update', 'settled'],
      ['tool_call_update', 'settled'],
      ['agent_message', 'settled'],
    ]);
    expect(rows[0]).toMatchObject({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('read hello.txt before editing'),
        },
      ],
    });
    expect(rows.at(-1)).toMatchObject({
      content: [{ type: 'text', text: expect.stringContaining('hello Argo') }],
    });
  });

  it('maps the edits and the command onto Tool call rows', (): void => {
    const tools = rows.filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    );
    expect(tools).toEqual([
      expect.objectContaining({
        name: 'Write',
        kind: 'edit',
        status: 'completed',
        locations: [{ path: '/project/notes.md' }],
        content: [
          {
            type: 'diff',
            changes: [
              {
                operation: 'add',
                path: '/project/notes.md',
                newText: expect.stringContaining('# Todo'),
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        name: 'Read',
        kind: 'read',
        status: 'completed',
        locations: [{ path: '/project/hello.txt' }],
        content: [
          { type: 'content', content: { type: 'text', text: 'hello world\n' } },
        ],
      }),
      expect.objectContaining({
        name: 'Edit',
        kind: 'edit',
        status: 'completed',
        content: [
          {
            type: 'diff',
            changes: [
              {
                operation: 'modify',
                path: '/project/hello.txt',
                oldText: 'hello world',
                newText: 'hello Argo',
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        name: 'Bash',
        kind: 'execute',
        status: 'completed',
        title: 'Show hello.txt and short git status',
        content: [
          {
            type: 'terminal',
            command: 'cat hello.txt && git status --short',
            output: 'hello Argo\n M hello.txt\n?? notes.md',
          },
        ],
      }),
    ]);
  });

  it('gives text rows message.id#blockIndex, the same with or without streaming', (): void => {
    const firstMessage = messages.find(
      (message): message is Extract<VendorMessage, { type: 'assistant' }> =>
        message.type === 'assistant',
    );
    expect(rows[0]?.id).toBe(`${firstMessage?.message.id}#0`);

    const recordsOnly = mapAll(
      messages.filter(
        (
          message,
        ): message is Exclude<VendorMessage, { type: 'stream_event' }> =>
          message.type !== 'stream_event',
      ),
    );
    expect(foldRows(feedChanges(recordsOnly.events))).toEqual(rows);
  });

  it('streams text before its record settles it', (): void => {
    const changes = feedChanges(events);
    const answerId = rows.at(-1)?.id;
    const first = changes.findIndex(
      (change): boolean =>
        change.type === 'upsert' && change.update.id === answerId,
    );
    expect(changes[first]).toMatchObject({ update: { state: 'open' } });
    expect(
      changes.some(
        (change): boolean => change.type === 'append' && change.id === answerId,
      ),
    ).toBe(true);
  });

  it('ends the Turn with its stop reason and usage', (): void => {
    expect(events.at(-1)).toEqual({
      type: agentTurnEndedEvent,
      stopReason: 'end_turn',
      usage: {
        totalTokens: expect.any(Number),
        inputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
        thoughtTokens: expect.any(Number),
        cachedReadTokens: expect.any(Number),
        cachedWriteTokens: expect.any(Number),
      },
    });
  });
});

describe('toAgentEvents on an interrupted Turn', (): void => {
  const { events } = mapAll(interrupted);
  const rows = foldRows(feedChanges(events));

  it('cancels the running command and ends the Turn as cancelled', (): void => {
    expect(rows).toEqual([
      expect.objectContaining({
        name: 'Bash',
        kind: 'execute',
        status: 'cancelled',
        state: 'settled',
      }),
    ]);
    expect(events.at(-1)).toMatchObject({
      type: agentTurnEndedEvent,
      stopReason: 'cancelled',
    });
  });
});

const result = (
  fields: Partial<Extract<SDKResultMessage, { subtype: 'success' }>>,
): SDKResultMessage => ({ ...completed, ...fields });
const failedResult = (
  fields: Partial<Exclude<SDKResultMessage, { subtype: 'success' }>>,
): SDKResultMessage => {
  const { result: _result, ...base } = completed;
  return { ...base, subtype: 'error_during_execution', errors: [], ...fields };
};

describe('toAgentEvents on single messages', (): void => {
  it.each([
    ['max_tokens', result({ stop_reason: 'max_tokens' }), 'max_tokens'],
    ['refusal', result({ stop_reason: 'refusal' }), 'refusal'],
    [
      'error_max_turns',
      failedResult({ subtype: 'error_max_turns', is_error: true, errors: [] }),
      'max_turn_requests',
    ],
    [
      'aborted_streaming',
      failedResult({
        subtype: 'error_during_execution',
        is_error: true,
        terminal_reason: 'aborted_streaming',
        errors: [],
      }),
      'cancelled',
    ],
  ])('maps a %s result to its stop reason', (_, message, stopReason): void => {
    const { events } = mapAll([message]);
    expect(events).toEqual([
      expect.objectContaining({ type: agentTurnEndedEvent, stopReason }),
    ]);
  });

  it('ends a failed Turn with the error', (): void => {
    const { events } = mapAll([
      result({
        subtype: 'success',
        is_error: true,
        terminal_reason: 'api_error',
        result: 'Failed to authenticate',
      }),
      failedResult({
        subtype: 'error_during_execution',
        is_error: true,
        errors: ['The tool runner crashed.'],
      }),
    ]);
    expect(events).toEqual([
      expect.objectContaining({
        stopReason: 'error',
        error: { code: -32603, message: 'Failed to authenticate' },
      }),
      expect.objectContaining({
        stopReason: 'error',
        error: { code: -32603, message: 'The tool runner crashed.' },
      }),
    ]);
  });

  it('shows a retry as a Notice with its attempt', (): void => {
    const { events } = mapAll([
      {
        type: 'system',
        subtype: 'api_retry',
        attempt: 2,
        max_retries: 5,
        retry_delay_ms: 1000,
        error_status: 529,
        error: 'server_error',
        uuid: '00000000-0000-0000-0000-000000000001',
        session_id: 'vendor-1',
      },
    ]);
    expect(feedChanges(events)).toEqual([
      {
        type: 'upsert',
        update: {
          id: '00000000-0000-0000-0000-000000000001',
          sessionUpdate: 'notice',
          state: 'settled',
          severity: 'warning',
          title: 'Retrying (2 of 5)',
          _meta: {
            argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } },
          },
        },
      },
    ]);
  });

  it('shows local command output as a Notice', (): void => {
    const { events } = mapAll([
      {
        type: 'system',
        subtype: 'local_command_output',
        content: 'Compacted.',
        uuid: '00000000-0000-0000-0000-000000000002',
        session_id: 'vendor-1',
      },
    ]);
    expect(feedChanges(events)).toEqual([
      {
        type: 'upsert',
        update: {
          id: '00000000-0000-0000-0000-000000000002',
          sessionUpdate: 'notice',
          state: 'settled',
          severity: 'info',
          title: 'Compacted.',
        },
      },
    ]);
  });

  it.each([
    [
      'the interrupt marker',
      user([{ type: 'text', text: '[Request interrupted by user]' }]),
    ],
    [
      'a synthetic user message',
      {
        ...user('Injected context.'),
        isSynthetic: true,
      },
    ],
    [
      "a Subagent's message",
      {
        ...assistant('sub-1', [{ type: 'text', text: 'Hi', citations: [] }]),
        parent_tool_use_id: 'toolu_task',
        uuid: '00000000-0000-0000-0000-000000000003',
        session_id: 'vendor-1',
      },
    ],
  ] satisfies [string, VendorMessage][])('drops %s', (_, message): void => {
    expect(mapAll([message])).toEqual({
      events: [],
      mappingState: initialMappingState(),
    });
  });
});

function pathValue(value: unknown, key: string): unknown {
  if (Array.isArray(value)) return value[Number(key)];
  if (isRecord(value)) return value[key];
  throw new Error('Invalid append path');
}
function parseFeedUpdate(value: unknown): FeedUpdate {
  if (!isRecord(value)) throw new Error('Invalid Feed row');
  const {
    sessionId: _sessionId,
    turnId: _turnId,
    position: _position,
    revision: _revision,
    ...update
  } = SessionUpdate.parse({
    ...value,
    sessionId: 'session-1',
    turnId: null,
    position: 0,
    revision: 0,
  });
  return update;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
