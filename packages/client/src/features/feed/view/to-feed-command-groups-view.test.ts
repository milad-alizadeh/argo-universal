import type { ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'summarizes failed commands and preserves retries for $agent',
  ({ rows, snapshot }) => {
    const source = commandRow(rows);

    const first: ToolCallUpdate = {
      ...source,
      status: 'completed',
      state: 'settled',
      _meta: undefined,
      content: [
        {
          type: 'terminal',
          command: 'pnpm test',
          output: '',
          exitStatus: { exitCode: 1 },
        },
      ],
    };

    const retry: ToolCallUpdate = {
      ...first,
      id: 'retry',
      toolCallId: 'retry',
      position: first.position + 1,
      content: [
        {
          type: 'terminal',
          command: 'pnpm test',
          output: '',
          exitStatus: { exitCode: 0 },
        },
      ],
    };

    expect(toFeedView([first, retry], snapshot).items).toEqual([
      {
        type: 'group',
        id: first.id,
        title: 'Ran 2 commands · 1 failed',
        state: 'settled',
        items: [
          { type: 'tool_call', row: first },
          { type: 'tool_call', row: retry },
        ],
      },
    ]);
  },
);

it.each(workMocks)(
  'shows a single command without a group for $agent',
  ({ rows, snapshot }) => {
    const row = commandRow(rows);

    expect(toFeedView([row], snapshot).items).toEqual([
      { type: 'tool_call', row },
    ]);
  },
);

it.each(workMocks)(
  'counts status-only failures for $agent',
  ({ rows, snapshot }) => {
    const row: ToolCallUpdate = {
      ...commandRow(rows),
      status: 'failed',
      content: [],
      _meta: undefined,
    };

    const retry = {
      ...row,
      id: 'retry',
      toolCallId: 'retry',
      position: row.position + 1,
    };

    expect(toFeedView([row, retry], snapshot).items[0]).toMatchObject({
      title: 'Ran 2 commands · 2 failed',
    });
  },
);
