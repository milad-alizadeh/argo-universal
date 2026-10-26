import type { AnyMessage, SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import {
  standardSubagentUpdates,
  type DraftSubagentUpdate,
} from './draft-subagent-updates';

const update = (
  value: SessionNotification['update'] | DraftSubagentUpdate,
): AnyMessage => ({
  jsonrpc: '2.0',
  method: 'session/update',
  params: { sessionId: 'parent', update: value },
});

it('rewrites a spawn into a running subagent_update and the task into the parent message to the child', () => {
  expect(
    standardSubagentUpdates(
      update({
        sessionUpdate: 'subagent_spawned',
        subagentSessionId: 'child',
        name: 'naming_audit',
        task: 'Audit the names',
      }),
    ),
  ).toEqual([
    update({
      sessionUpdate: 'subagent_update',
      sessionId: 'child',
      title: 'naming_audit',
      capabilities: {},
      state: { state: 'running' },
    }),
    update({
      sessionUpdate: 'session_message',
      messageId: 'child:task',
      senderSessionId: 'parent',
      recipientSessionId: 'child',
      content: [{ type: 'text', text: 'Audit the names' }],
    }),
  ]);
});

it('sends no prompt for the task codex-acp invents when the spawn gave none', () => {
  expect(
    standardSubagentUpdates(
      update({
        sessionUpdate: 'subagent_spawned',
        subagentSessionId: 'child',
        name: 'naming_audit',
        task: 'Delegated task for naming_audit',
      }),
    ),
  ).toHaveLength(1);
});

it.each([
  { state: 'completed', idle: { state: 'idle', stopReason: 'end_turn' } },
  { state: 'cancelled', idle: { state: 'idle', stopReason: 'cancelled' } },
  { state: 'failed', idle: { state: 'idle' } },
])(
  'rewrites a $state outcome into an idle subagent_update',
  ({ state, idle }) => {
    expect(
      standardSubagentUpdates(
        update({
          sessionUpdate: 'subagent_state_update',
          subagentSessionId: 'child',
          state,
        }),
      ),
    ).toEqual([
      update({
        sessionUpdate: 'subagent_update',
        sessionId: 'child',
        state: idle,
      }),
    ]);
  },
);

it('passes every other message through untouched', () => {
  const message = update({
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Hello' },
  });

  expect(standardSubagentUpdates(message)).toEqual([message]);
});
