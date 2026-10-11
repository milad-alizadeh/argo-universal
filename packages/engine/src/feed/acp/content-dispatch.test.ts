import type { SessionNotification } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';
import type { ContentAssemblyInput } from './assembly';
import { assembleContentChange } from './content-dispatch';

type Update = SessionNotification['update'];

const input = (update: Update): ContentAssemblyInput => ({
  update,
  acpSessionId: 'acp-1',
  turnId: 'turn-1',
  feed: { sessionId: 'session-1', maxRevision: 0, nextPosition: 0, rows: {} },
  streams: {},
  findWrittenRow: (): undefined => {},
  findRow: (): undefined => {},
});

const text = { type: 'text', text: 'Hello' } as const;
const entry = {
  content: 'Write the test',
  priority: 'high',
  status: 'pending',
} as const;

describe('an ACP update the Feed shows', (): void => {
  it.each([
    [
      'agent_message_chunk',
      { sessionUpdate: 'agent_message_chunk', content: text },
      { sessionUpdate: 'agent_message', state: 'open', content: [text] },
    ],
    [
      'agent_thought_chunk',
      { sessionUpdate: 'agent_thought_chunk', content: text },
      { sessionUpdate: 'agent_thought', state: 'open', content: [text] },
    ],
    [
      'tool_call',
      {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-1',
        title: 'Read file',
        kind: 'read',
        status: 'pending',
      },
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'pending',
        state: 'open',
      },
    ],
    [
      'tool_call_update',
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'completed',
      },
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'completed',
        state: 'settled',
      },
    ],
    [
      'plan',
      { sessionUpdate: 'plan', entries: [entry] },
      {
        sessionUpdate: 'plan_update',
        state: 'settled',
        plan: { type: 'items', entries: [entry] },
      },
    ],
    [
      'plan_update',
      {
        sessionUpdate: 'plan_update',
        plan: { type: 'items', planId: 'plan-1', entries: [entry] },
      },
      { sessionUpdate: 'plan_update', plan: { planId: 'plan-1' } },
    ],
    [
      'notice',
      { sessionUpdate: 'notice', severity: 'warning', title: 'Rate limited' },
      {
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'warning',
      },
    ],
    [
      'compaction_update',
      {
        sessionUpdate: 'compaction_update',
        compactionId: 'compaction-1',
        status: 'in_progress',
      },
      {
        sessionUpdate: 'compaction_update',
        status: 'in_progress',
        state: 'open',
      },
    ],
  ] satisfies [string, Update, object][])(
    'maps %s to its Feed row',
    (_, update, row): void => {
      const result = assembleContentChange(input(update));
      expect(result).toMatchObject({ change: { type: 'upsert', update: row } });
    },
  );
});

describe('an ACP update the Feed does not show', (): void => {
  it.each([
    { sessionUpdate: 'user_message_chunk', content: text },
    { sessionUpdate: 'available_commands_update', availableCommands: [] },
    { sessionUpdate: 'current_mode_update', currentModeId: 'plan' },
    { sessionUpdate: 'config_option_update', configOptions: [] },
    { sessionUpdate: 'session_info_update', title: 'Renamed' },
    { sessionUpdate: 'usage_update', used: 1, size: 2 },
    { sessionUpdate: 'subagent_update', sessionId: 'child-1' },
    { sessionUpdate: 'session_message', messageId: 'message-1' },
    {
      sessionUpdate: 'session_message_chunk',
      messageId: 'message-1',
      content: text,
    },
  ] satisfies Update[])(
    'leaves $sessionUpdate to its own owner',
    (update): void => {
      expect(assembleContentChange(input(update))).toBeUndefined();
    },
  );
});

describe('an ACP update that names content the Feed does not hold', (): void => {
  it.each([
    ['plan_removed', { sessionUpdate: 'plan_removed', planId: 'missing-plan' }],
    [
      'compaction_summary_chunk',
      {
        sessionUpdate: 'compaction_summary_chunk',
        compactionId: 'missing-compaction',
        content: text,
      },
    ],
  ] satisfies [string, Update][])('rejects %s', (_, update): void => {
    expect(assembleContentChange(input(update))).toEqual({
      rejection: expect.any(String),
    });
  });
});
