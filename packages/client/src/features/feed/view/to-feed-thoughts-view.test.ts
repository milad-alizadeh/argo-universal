import type { ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { expect, it } from 'vitest';
import {
  firstReadId,
  workMocks,
  commandRow,
} from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

it.each(workMocks)(
  'uses Thinking for a streaming thought after a Tool call for $agent',
  ({ rows, snapshot }) => {
    const source = recordedFeedMocks
      .flatMap((mock) => mock.rows)
      .find((row) => row.sessionUpdate === 'agent_thought');
    if (!source) throw new Error('Recording needs a thought');
    const thought = { ...source, state: 'open' as const };
    const row = commandRow(rows);
    const view = toFeedView([row, thought], snapshot);
    expect(view.items).toEqual([
      {
        type: 'group',
        id: row.id,
        title: 'Thinking',
        state: 'open',
        items: [
          { type: 'tool_call', row },
          { type: 'thought', row: thought },
        ],
      },
    ]);
    expect(view.items[0]).not.toHaveProperty('live');
  },
);

it.each(workMocks)(
  'combines reads across thoughts for $agent',
  ({ rows, snapshot }) => {
    const source = commandRow(rows);
    const first: ToolCallUpdate = {
      ...source,
      id: firstReadId,
      _meta: {
        argo: {
          commandActions: [{ type: 'read', command: 'read', path: 'a.ts' }],
        },
      },
    };
    const second: ToolCallUpdate = {
      ...first,
      id: 'second-read',
      _meta: {
        argo: {
          commandActions: [{ type: 'read', command: 'read', path: 'b.ts' }],
        },
      },
    };
    const thought = recordedFeedMocks
      .flatMap((mock) => mock.rows)
      .find((row) => row.sessionUpdate === 'agent_thought');
    if (!thought) throw new Error('Recording needs a thought');
    const view = toFeedView([first, thought, second], snapshot);
    expect(view.items).toEqual([
      {
        type: 'group',
        id: firstReadId,
        title: 'Read files',
        state: 'settled',
        items: [
          {
            type: 'exploration',
            id: firstReadId,
            title: 'Explored',
            toolCalls: [first, second],
          },
          { type: 'thought', row: thought },
        ],
      },
    ]);
  },
);
