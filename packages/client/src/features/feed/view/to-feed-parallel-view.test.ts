import type { ToolCallUpdate } from '@repo/contracts';
import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { workMocks, commandRow } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'keeps approval on the earlier parallel Tool call for $agent',
  ({ rows, snapshot }) => {
    const first: ToolCallUpdate = {
      ...commandRow(rows),
      position: 1,
      state: 'open',
      status: 'pending',
    };
    const later: ToolCallUpdate = {
      ...first,
      id: 'later-running',
      toolCallId: 'later-running',
      position: 2,
      status: 'in_progress',
    };
    const pending = {
      ...snapshot,
      pendingPermission: {
        requestId: 'request-1',
        toolCallId: first.toolCallId,
        title: 'Allow command?',
        options: permissionOptions,
      },
    };
    expect(toFeedView([first, later], pending).items).toEqual([
      {
        type: 'group',
        id: first.id,
        title: 'Awaiting approval',
        state: 'open',
        live: { toolCall: first, awaitingApproval: true },
        items: [
          { type: 'tool_call', row: first, awaitingApproval: true },
          { type: 'tool_call', row: later },
        ],
      },
    ]);
  },
);

it.each(workMocks)(
  'names the earlier running parallel Tool call after the later call completes for $agent',
  ({ rows, snapshot }) => {
    const first: ToolCallUpdate = {
      ...commandRow(rows),
      position: 1,
      state: 'open',
      status: 'in_progress',
    };
    const later: ToolCallUpdate = {
      ...first,
      id: 'later-completed',
      toolCallId: 'later-completed',
      position: 2,
      state: 'settled',
      status: 'completed',
    };
    expect(toFeedView([first, later], snapshot).items).toEqual([
      {
        type: 'group',
        id: first.id,
        title: first.title,
        state: 'open',
        live: { toolCall: first, awaitingApproval: false },
        items: [
          { type: 'tool_call', row: first },
          { type: 'tool_call', row: later },
        ],
      },
    ]);
  },
);
