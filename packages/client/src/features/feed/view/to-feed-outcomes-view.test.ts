import type { ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  workMocks,
  toolCalls,
  commandRow,
  readRow,
} from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'keeps a failed multi-file edit plain for $agent',
  ({ rows, snapshot }) => {
    const source = toolCalls(rows).find((row) => row.kind === 'edit');

    if (!source) throw new Error('Recording needs an edit');

    const row: ToolCallUpdate = {
      ...source,
      status: 'failed',
      locations: [{ path: 'a.ts' }, { path: 'b.ts' }],
    };

    expect(toFeedView([row], snapshot).items).toEqual([
      { type: 'tool_call', row },
    ]);
  },
);

it.each(workMocks)(
  'keeps one finished command plain for $agent',
  ({ rows, snapshot }) => {
    const row = commandRow(rows);
    expect(toFeedView([row], snapshot).items).toEqual([
      { type: 'tool_call', row },
    ]);
  },
);

it.each(workMocks)(
  'keeps one running command grouped for $agent',
  ({ rows, snapshot }) => {
    const row: ToolCallUpdate = {
      ...commandRow(rows),
      state: 'open',
      status: 'in_progress',
    };

    expect(toFeedView([row], snapshot).items).toEqual([
      {
        type: 'group',
        id: row.id,
        title: row.title,
        state: 'open',
        live: { toolCall: row, awaitingApproval: false },
        items: [{ type: 'tool_call', row }],
      },
    ]);
  },
);

it.each(workMocks)(
  'keeps failed exploration in its own row for $agent',
  ({ rows, snapshot }) => {
    const recorded = readRow(rows);
    const row: ToolCallUpdate = { ...recorded, status: 'failed' };
    expect(toFeedView([row], snapshot).items).toEqual([
      { type: 'tool_call', row },
    ]);
  },
);
