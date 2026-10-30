import type {
  CommandAction,
  PlanUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { workMocks, commandRow } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'keeps the active Plan outside the Feed for $agent',
  ({ rows, snapshot }) => {
    const source = commandRow(rows);

    const first: PlanUpdate = {
      id: 'first-plan',
      sessionId: source.sessionId,
      turnId: source.turnId,
      position: source.position,
      revision: source.revision,
      state: 'settled',
      sessionUpdate: 'plan_update',
      plan: {
        type: 'items',
        planId: 'checklist',
        entries: [
          { content: 'Read the spec', priority: 'high', status: 'pending' },
        ],
      },
    };

    const latest: PlanUpdate = {
      ...first,
      id: 'latest-plan',
      revision: first.revision + 1,
      plan: {
        type: 'items',
        planId: 'checklist',
        entries: [
          { content: 'Read the spec', priority: 'high', status: 'completed' },
        ],
      },
    };

    const written: PlanUpdate = {
      ...first,
      id: 'written-plan',
      revision: first.revision + 2,
      plan: {
        type: 'markdown',
        planId: 'written-plan',
        content: '# Written work',
      },
    };

    expect(toFeedView([first, source, latest, written], snapshot)).toEqual({
      items: [{ type: 'tool_call', row: source }],
      plan: written.plan,
    });
  },
);

describe.each(workMocks)('command actions for $agent', ({ rows, snapshot }) => {
  it.each<{
    name: string;
    actions: CommandAction[];
  }>([
    {
      name: 'read',
      actions: [{ type: 'read', command: 'opaque', path: 'a.ts' }],
    },
    {
      name: 'search',
      actions: [
        { type: 'search', command: 'opaque', query: 'needle', path: 'src' },
      ],
    },
    {
      name: 'list',
      actions: [{ type: 'list', command: 'opaque', path: 'src' }],
    },
    {
      name: 'multiple actions',
      actions: [
        { type: 'read', command: 'opaque', path: 'a.ts' },
        { type: 'search', command: 'opaque', query: 'needle' },
        { type: 'list', command: 'opaque', path: 'src' },
      ],
    },
  ])('explores with supplied $name metadata', ({ actions }) => {
    const row: ToolCallUpdate = {
      ...commandRow(rows),
      state: 'open',
      status: 'in_progress',
      _meta: { argo: { commandActions: actions } },
    };

    expect(toFeedView([row], snapshot).items).toEqual([
      {
        type: 'group',
        id: row.id,
        title: 'Exploring',
        state: 'open',
        live: { toolCall: row, awaitingApproval: false },
        items: [
          {
            type: 'exploration',
            id: row.id,
            state: 'open',
            toolCalls: [row],
          },
        ],
      },
    ]);
  });
});
