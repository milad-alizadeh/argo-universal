import type { DiffChange, ToolCallUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { toolCalls, workMocks } from '../../../../mocks/feed-view.mocks';
import { permissionDetails } from './permission-details';

const permission = {
  request: {
    requestId: 'request-1',
    toolCallId: 'call-1',
    title: 'Edit files',
    options: permissionOptions,
  },
  onAnswer: () => {},
  state: { kind: 'open' },
} as const;

it.each(workMocks)('names the files an edit changes for $agent', ({ rows }) => {
  const edit = toolCalls(rows).find((row) =>
    row.content.some((block) => block.type === 'diff'),
  );

  if (!edit) throw new Error('Recording needs an edit');

  const paths = edit.content.flatMap((block) =>
    block.type === 'diff' ? block.changes.map((change) => change.path) : [],
  );

  const { input } = permissionDetails(permission, {
    ...edit,
    rawInput: undefined,
  } satisfies ToolCallUpdate);

  expect(paths.length).toBeGreaterThan(0);

  for (const path of paths) expect(input).toContain(path);
});

const recordedCall = (): ToolCallUpdate => {
  const [recorded] = toolCalls(workMocks.flatMap(({ rows }) => rows));

  if (!recorded) throw new Error('Recording needs a Tool call');

  return recorded;
};

const editOf = (changes: DiffChange[]): ToolCallUpdate => ({
  ...recordedCall(),
  rawInput: { ignored: true },
  content: [{ type: 'diff', changes, _meta: {} }],
});

it('names every file a diff changes ahead of the raw input, and a move by both paths', () => {
  const { input } = permissionDetails(
    permission,
    editOf([
      { operation: 'add', path: 'a.txt' },
      { operation: 'move', path: 'c.txt', oldPath: 'b.txt' },
    ]),
  );

  expect(input).toBe('add a.txt\nb.txt -> c.txt');
});
