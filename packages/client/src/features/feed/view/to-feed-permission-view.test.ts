import type { ToolCallUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { workMocks, readRow } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'keeps the Permission request at its Tool call for $agent',
  ({ rows, snapshot }) => {
    const recorded = readRow(rows);
    const row: ToolCallUpdate = {
      ...recorded,
      status: 'pending',
      state: 'open',
    };
    const pending = {
      ...snapshot,
      pendingPermission: {
        requestId: 'request-1',
        toolCallId: row.toolCallId,
        title: 'Allow read?',
        options: permissionOptions,
      },
    };
    expect(toFeedView([row], pending).items).toEqual([
      {
        type: 'group',
        id: row.id,
        title: 'Awaiting approval',
        state: 'open',
        live: { toolCall: row, awaitingApproval: true },
        items: [{ type: 'tool_call', row, awaitingApproval: true }],
      },
    ]);
    const answered: ToolCallUpdate = {
      ...recorded,
      _meta: {
        argo: {
          ...recorded._meta?.argo,
          permissionOutcome: { outcome: 'selected', optionId: 'allow_once' },
        },
      },
    };
    expect(toFeedView([answered], snapshot).items).toEqual([
      { type: 'tool_call', row: answered },
    ]);
    expect(row.title).toBe(recorded.title);
  },
);
