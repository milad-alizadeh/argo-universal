import type { ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { expect, it } from 'vitest';
import {
  workMocks,
  recordedItemTypes,
  toolCalls,
  commandRow,
} from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(recordedFeedMocks)(
  'presents $agent/$recording without folding or changing rows',
  (mock) => {
    const original = structuredClone(mock);
    const view = toFeedView(mock.rows, mock.snapshot);
    expect(view.items.map((item) => item.type)).toEqual(
      recordedItemTypes.get(`${mock.agent}/${mock.recording}`),
    );

    const presentedRows = view.items
      .flatMap((item) => (item.type === 'group' ? item.items : [item]))
      .flatMap((item) => {
        if (item.type === 'exploration') return item.toolCalls;

        return item.type === 'subagent' ? [] : [item.row];
      })
      .sort((first, second) => first.position - second.position);

    expect(presentedRows).toEqual(mock.rows);
    expect(mock).toEqual(original);
  },
);

it.each(workMocks)(
  'keeps unclassified shell text as a command for $agent',
  ({ rows, snapshot }) => {
    const source = commandRow(rows);

    for (const commandActions of [
      undefined,
      [],
      [
        { type: 'read' as const, command: 'cat a.ts', path: 'a.ts' },
        { type: 'unknown' as const, command: 'build' },
      ],
    ]) {
      const row: ToolCallUpdate = {
        ...source,
        title: 'Read a.ts and list src',
        content: [
          { type: 'terminal', command: 'cat a.ts && ls src', output: '' },
        ],
        _meta: { argo: { commandActions } },
      };

      expect(toFeedView([row], snapshot).items).toEqual([
        { type: 'tool_call', row },
      ]);
    }
  },
);

it.each(workMocks)('groups recorded work for $agent', ({ rows, snapshot }) => {
  const view = toFeedView(rows, snapshot);
  expect(view.items.find((item) => item.type === 'group')).toMatchObject({
    title: 'Ran 1 command, Read 1 file, Edited 2 files',
    state: 'settled',
    items: expect.arrayContaining([
      expect.objectContaining({ type: 'exploration', state: 'settled' }),
      expect.objectContaining({ type: 'tool_call' }),
    ]),
  });
  expect(view.plan).toBeNull();
});

it.each(workMocks)(
  'summarizes commands and affected files by category for $agent',
  ({ rows, snapshot }) => {
    const calls = toolCalls(rows);
    const command = commandRow(rows);

    const secondCommand: ToolCallUpdate = {
      ...command,
      id: 'second-command',
      toolCallId: 'second-command',
      position: Math.max(...calls.map((row) => row.position)) + 1,
    };

    const view = toFeedView([...calls, secondCommand], snapshot);
    expect(view.items.find((item) => item.type === 'group')).toMatchObject({
      title: 'Ran 2 commands, Read 1 file, Edited 2 files',
      state: 'settled',
    });
  },
);
