import { expect, it } from 'vitest';
import {
  ending,
  notification,
  spawn,
  standard,
  translate,
} from './draft-subagent-fixtures';

it('turns a spawn into a running child update and the task into the parent message to the child', () => {
  expect(translate(notification(spawn)).messages).toEqual([
    standard({
      sessionUpdate: 'subagent_update',
      sessionId: 'child',
      title: 'naming_audit',
      capabilities: {},
      state: { state: 'running' },
    }),
    standard({
      sessionUpdate: 'session_message',
      messageId: 'child:task',
      senderSessionId: 'parent',
      recipientSessionId: 'child',
      content: [{ type: 'text', text: 'Audit the names' }],
    }),
  ]);
});

it('does not invent capabilities the spawn did not send', () => {
  expect(
    translate(notification({ ...spawn, capabilities: undefined })).messages[0],
  ).toEqual(
    standard({
      sessionUpdate: 'subagent_update',
      sessionId: 'child',
      title: 'naming_audit',
      state: { state: 'running' },
    }),
  );
});

it('sends the full prompt, not the description beside it, as the task', () => {
  const { messages } = translate(
    notification({
      ...spawn,
      task: 'Naming audit',
      prompt: 'Audit every name',
    }),
  );

  expect(messages[1]).toEqual(
    standard({
      sessionUpdate: 'session_message',
      messageId: 'child:task',
      senderSessionId: 'parent',
      recipientSessionId: 'child',
      content: [{ type: 'text', text: 'Audit every name' }],
    }),
  );
});

it.each(['Delegated task', 'Delegated task for naming_audit', '  '])(
  'sends no task message for the placeholder %j',
  (task) => {
    expect(translate(notification({ ...spawn, task })).messages).toHaveLength(
      1,
    );
  },
);

it.each([
  { state: 'completed', stopReason: 'end_turn' },
  { state: 'cancelled', stopReason: 'cancelled' },
  { state: 'failed', stopReason: 'error' },
])(
  'ends a $state child as idle with the $stopReason stop reason',
  ({ state, stopReason }) => {
    expect(translate(ending(state)).messages).toEqual([
      standard({
        sessionUpdate: 'subagent_update',
        sessionId: 'child',
        state: { state: 'idle', stopReason },
      }),
    ]);
  },
);

it('reports a disconnected child as unknown instead of idle', () => {
  expect(translate(ending('disconnected')).messages).toEqual([
    standard({
      sessionUpdate: 'subagent_update',
      sessionId: 'child',
      state: { state: 'unknown' },
    }),
  ]);
});
