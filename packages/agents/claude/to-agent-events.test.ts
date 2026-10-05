import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import type { FeedChange, FeedUpdate } from '../src/agent-events';
import {
  initialMappingState,
  type MappingState,
  toAgentEvents,
} from './to-agent-events';

const RECORDINGS = path.join(
  import.meta.dirname,
  '../../../mocks/cli/claude/recordings',
);

// The stdout frames of a recording, without the control frames that the SDK consumes itself.
function recordedMessages(name: string): SDKMessage[] {
  const [version] = readdirSync(RECORDINGS);
  const recording: { payload: { output: { type: string }[] } } = JSON.parse(
    readFileSync(path.join(RECORDINGS, `${version}`, `${name}.json`), 'utf8'),
  );
  return recording.payload.output.filter(
    (frame) => !frame.type.startsWith('control_'),
  ) as SDKMessage[];
}

// Fixtures carry only the fields the mapping reads.
function mapAll(messages: object[], start = initialMappingState()) {
  let mappingState: MappingState = start;
  const events = messages.flatMap((message) => {
    const result = toAgentEvents(message as SDKMessage, mappingState);
    mappingState = result.mappingState;
    return result.events;
  });
  return { events, mappingState };
}

const feedChanges = (events: ReturnType<typeof mapAll>['events']) =>
  events.flatMap((event) =>
    event.type === 'agent.feed' ? [event.change] : [],
  );

// Applies Feed changes the way the Feed actor does, to see the rows they leave.
function foldRows(changes: FeedChange[]) {
  const rows = new Map<string, FeedUpdate>();
  for (const change of changes) {
    if (change.type === 'upsert') {
      rows.set(change.update.id, change.update);
      continue;
    }
    const row = rows.get(change.id);
    if (!row) throw new Error(`No row ${change.id}`);
    if (change.type === 'patch') {
      rows.set(change.id, { ...row, ...change.set } as FeedUpdate);
      continue;
    }
    const copy = structuredClone(row) as Record<string, unknown>;
    const keys = change.field.split('.');
    const last = keys.pop() as string;
    const target = keys.reduce<Record<string, unknown>>(
      (value, key) => value[key] as Record<string, unknown>,
      copy,
    );
    target[last] = `${target[last]}${change.text}`;
    rows.set(change.id, copy as FeedUpdate);
  }
  return [...rows.values()];
}

describe('toAgentEvents on a Turn with edits and commands', () => {
  const messages = recordedMessages('edit-and-command');
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  it('settles a thought, four Tool calls and the answer, in order', () => {
    expect(rows.map((row) => [row.sessionUpdate, row.state])).toEqual([
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

  it('maps the edits and the command onto Tool call rows', () => {
    const tools = rows.filter(
      (row) => row.sessionUpdate === 'tool_call_update',
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

  it('gives text rows message.id#blockIndex, the same with or without streaming', () => {
    const firstMessage = messages.find(
      (message) => message.type === 'assistant',
    );
    expect(rows[0]?.id).toBe(`${firstMessage?.message.id}#0`);

    const recordsOnly = mapAll(
      messages.filter((message) => message.type !== 'stream_event'),
    );
    expect(foldRows(feedChanges(recordsOnly.events))).toEqual(rows);
  });

  it('streams text before its record settles it', () => {
    const changes = feedChanges(events);
    const answerId = rows.at(-1)?.id;
    const first = changes.findIndex(
      (change) => change.type === 'upsert' && change.update.id === answerId,
    );
    expect(changes[first]).toMatchObject({ update: { state: 'open' } });
    expect(
      changes.some(
        (change) => change.type === 'append' && change.id === answerId,
      ),
    ).toBe(true);
  });

  it('ends the Turn with its stop reason and usage', () => {
    expect(events.at(-1)).toEqual({
      type: 'agent.turnEnded',
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

describe('toAgentEvents on an interrupted Turn', () => {
  const { events } = mapAll(recordedMessages('interrupt'));
  const rows = foldRows(feedChanges(events));

  it('cancels the running command and ends the Turn as cancelled', () => {
    expect(rows).toEqual([
      expect.objectContaining({
        name: 'Bash',
        kind: 'execute',
        status: 'cancelled',
        state: 'settled',
      }),
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'agent.turnEnded',
      stopReason: 'cancelled',
    });
  });
});

const result = (fields: Record<string, unknown>) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 1,
    output_tokens: 2,
    cache_read_input_tokens: 3,
    cache_creation_input_tokens: 4,
  },
  uuid: 'result-1',
  session_id: 'vendor-1',
  ...fields,
});

describe('toAgentEvents on single messages', () => {
  it.each([
    ['max_tokens', result({ stop_reason: 'max_tokens' }), 'max_tokens'],
    ['refusal', result({ stop_reason: 'refusal' }), 'refusal'],
    [
      'error_max_turns',
      result({ subtype: 'error_max_turns', is_error: true, errors: [] }),
      'max_turn_requests',
    ],
    [
      'aborted_streaming',
      result({
        subtype: 'error_during_execution',
        is_error: true,
        terminal_reason: 'aborted_streaming',
        errors: [],
      }),
      'cancelled',
    ],
  ])('maps a %s result to its stop reason', (_, message, stopReason) => {
    const { events } = mapAll([message]);
    expect(events).toEqual([
      expect.objectContaining({ type: 'agent.turnEnded', stopReason }),
    ]);
  });

  it('ends a failed Turn with the error', () => {
    const { events } = mapAll([
      result({
        subtype: 'success',
        is_error: true,
        terminal_reason: 'api_error',
        result: 'Failed to authenticate',
      }),
      result({
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

  it('shows a retry as a Notice with its attempt', () => {
    const { events } = mapAll([
      {
        type: 'system',
        subtype: 'api_retry',
        attempt: 2,
        max_retries: 5,
        retry_delay_ms: 1000,
        error_status: 529,
        error: 'server_error',
        uuid: 'retry-1',
        session_id: 'vendor-1',
      },
    ]);
    expect(feedChanges(events)).toEqual([
      {
        type: 'upsert',
        update: {
          id: 'retry-1',
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

  it('shows local command output as a Notice', () => {
    const { events } = mapAll([
      {
        type: 'system',
        subtype: 'local_command_output',
        content: 'Compacted.',
        uuid: 'local-1',
        session_id: 'vendor-1',
      },
    ]);
    expect(feedChanges(events)).toEqual([
      {
        type: 'upsert',
        update: {
          id: 'local-1',
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
      {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: '[Request interrupted by user]' }],
        },
        parent_tool_use_id: null,
      },
    ],
    [
      'a synthetic user message',
      {
        type: 'user',
        message: { role: 'user', content: 'Injected context.' },
        parent_tool_use_id: null,
        isSynthetic: true,
      },
    ],
    [
      "a Subagent's message",
      {
        type: 'assistant',
        message: { id: 'sub-1', content: [{ type: 'text', text: 'Hi' }] },
        parent_tool_use_id: 'toolu_task',
        uuid: 'sub-uuid',
        session_id: 'vendor-1',
      },
    ],
    [
      'a known message Argo does not show',
      { type: 'rate_limit_event', uuid: 'rate-1', session_id: 'vendor-1' },
    ],
    [
      'a system message Argo does not show',
      { type: 'system', subtype: 'task_progress', uuid: 'task-1' },
    ],
  ])('drops %s', (_, message) => {
    expect(mapAll([message])).toEqual({
      events: [],
      mappingState: initialMappingState(),
    });
  });
});
