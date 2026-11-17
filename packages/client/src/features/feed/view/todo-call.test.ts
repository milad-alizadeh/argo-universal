import type { ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

const mock = workMocks.at(0);

if (!mock) throw new Error('The recordings hold no work mock');

const snapshot = mock.snapshot;

const call = (
  name: string,
  rawInput: ToolCallUpdate['rawInput'],
): ToolCallUpdate => ({
  ...commandRow(mock.rows),
  id: name,
  toolCallId: name,
  kind: 'other',
  name,
  rawInput,
  content: [],
  _meta: undefined,
});

const step = { step: 1, status: 'completed' };

it.each([
  {
    caller: 'the Engine',
    row: call('session.setTodos', { todos: [{ content: 'Read' }] }),
  },
  {
    caller: 'Claude Code',
    row: call('operation_run', { id: 'session.setTodoStep', params: step }),
  },
  {
    caller: 'Codex',
    row: call('operation_run', {
      server: 'argo',
      tool: 'operation_run',
      arguments: { id: 'session.setTodoStep', params: step },
    }),
  },
])('draws no Tool call for the Todo list call of $caller', ({ row }) => {
  expect(toFeedView([row], snapshot).items).toEqual([]);
});

it('still draws the Tool call of any other Operation', () => {
  const row = call('operation_run', {
    id: 'session.declareSubagentRole',
    params: { role: 'review' },
  });

  expect(toFeedView([row], snapshot).items).not.toEqual([]);
});
