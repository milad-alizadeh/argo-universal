import { recordedFeedMocks } from '@repo/api/mocks';
import type {
  CommandAction,
  Notice,
  PlanUpdate,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { toFeedView } from './to-feed-view';

const workMocks = recordedFeedMocks.filter(
  (mock) => mock.recording === 'edit-and-command',
);

const recordedItemTypes: Record<string, string[]> = {
  'agent-1/edit-and-command': ['row', 'group', 'row'],
  'agent-2/edit-and-command': ['row', 'row', 'group', 'row'],
  'agent-1/interrupt': ['row', 'tool_call'],
  'agent-2/interrupt': ['row', 'row', 'tool_call'],
  'agent-1/compaction': ['row', 'row'],
  'agent-2/compaction': ['row', 'row', 'row'],
  'agent-1/image-prompt': ['row', 'thought', 'row'],
  'agent-2/image-prompt': ['row', 'row'],
  'agent-1/markdown-answer': ['row', 'thought', 'row'],
  'agent-2/markdown-answer': ['row', 'thought', 'row'],
};

function toolCalls(rows: SessionUpdate[]): ToolCallUpdate[] {
  return rows.filter((row) => row.sessionUpdate === 'tool_call_update');
}

function commandRow(rows: SessionUpdate[]): ToolCallUpdate {
  const row = toolCalls(rows).find(
    (row) =>
      row.kind === 'execute' &&
      !row._meta?.argo?.commandActions?.some(
        (action) => action.type === 'read',
      ),
  );
  if (!row) throw new Error('Recording needs a command');
  return row;
}

describe('toFeedView', () => {
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

  it.each(recordedFeedMocks)(
    'presents $agent/$recording without folding or changing rows',
    (mock) => {
      const original = structuredClone(mock);
      const view = toFeedView(mock.rows, mock.snapshot);
      expect(view.items.map((item) => item.type)).toEqual(
        recordedItemTypes[`${mock.agent}/${mock.recording}`],
      );
      const presentedRows = view.items
        .flatMap((item) => (item.type === 'group' ? item.items : [item]))
        .flatMap((item) =>
          item.type === 'exploration' ? item.toolCalls : [item.row],
        )
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

  it.each(workMocks)(
    'uses Thinking for a streaming thought after a Tool call for $agent',
    ({ rows, snapshot }) => {
      const source = recordedFeedMocks
        .flatMap((mock) => mock.rows)
        .find((row) => row.sessionUpdate === 'agent_thought');
      if (!source) throw new Error('Recording needs a thought');
      const thought = { ...source, state: 'open' as const };
      const row = commandRow(rows);
      expect(toFeedView([row, thought], snapshot).items).toEqual([
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
    },
  );

  describe.each(workMocks)(
    'Notice grouping for $agent',
    ({ rows, snapshot }) => {
      it.each(['info', 'warning', 'error'] as const)(
        'draws a %s Notice',
        (severity) => {
          const first = commandRow(rows);
          const last = { ...first, id: 'last-command' };
          const notice: Notice = {
            id: 'notice',
            sessionId: first.sessionId,
            turnId: first.turnId,
            position: first.position,
            revision: first.revision,
            state: 'settled',
            sessionUpdate: 'notice',
            severity,
            title: 'Session notice',
          };
          const view = toFeedView([first, notice, last], snapshot);
          if (severity === 'error') {
            expect(view.items).toEqual([
              { type: 'tool_call', row: first },
              { type: 'row', row: notice },
              { type: 'tool_call', row: last },
            ]);
          } else {
            expect(view.items).toEqual([
              {
                type: 'group',
                id: first.id,
                title: 'ran commands',
                state: 'settled',
                items: [
                  { type: 'tool_call', row: first },
                  { type: 'row', row: notice },
                  { type: 'tool_call', row: last },
                ],
              },
            ]);
          }
        },
      );
    },
  );

  it.each(workMocks)(
    'starts a new group for an Agent-started Turn for $agent',
    ({ rows, snapshot }) => {
      const first = commandRow(rows);
      const next = { ...first, id: 'next-turn', turnId: 'turn-2' };
      expect(toFeedView([first, next], snapshot).items).toEqual([
        { type: 'tool_call', row: first },
        { type: 'tool_call', row: next },
      ]);
    },
  );

  it.each(workMocks)(
    'keeps the Permission request at its Tool call for $agent',
    ({ rows, snapshot }) => {
      const recorded = toolCalls(rows).find(
        (row) =>
          row.kind === 'read' ||
          row._meta?.argo?.commandActions?.some(
            (action) => action.type === 'read',
          ),
      );
      if (!recorded) throw new Error('Recording needs a read');
      const row: ToolCallUpdate = {
        ...recorded,
        status: 'pending',
        state: 'open',
      };
      const pending = {
        ...snapshot,
        pendingPermission: {
          toolCallId: row.toolCallId,
          title: 'Allow read?',
          options: [],
        },
      };
      expect(toFeedView([row], pending).items).toEqual([
        {
          type: 'group',
          id: row.id,
          title: 'Awaiting approval',
          state: 'open',
          items: [
            { type: 'tool_call', row: { ...row, title: 'Awaiting approval' } },
          ],
        },
      ]);
      const answered: ToolCallUpdate = {
        ...recorded,
        _meta: {
          argo: {
            ...recorded._meta?.argo,
            permissionOutcome: { outcome: 'selected', optionId: 'allow' },
          },
        },
      };
      expect(toFeedView([answered], snapshot).items).toEqual([
        { type: 'tool_call', row: answered },
      ]);
      expect(row.title).toBe(recorded.title);
    },
  );

  it.each(workMocks)(
    'keeps the latest checklist outside the Feed for $agent',
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
        plan: {
          type: 'items',
          planId: 'checklist',
          entries: [
            { content: 'Read the spec', priority: 'high', status: 'completed' },
          ],
        },
      };
      const proposal: PlanUpdate = {
        ...first,
        id: 'proposal',
        plan: {
          type: 'markdown',
          planId: 'proposal',
          content: '# Proposed work',
        },
      };
      expect(toFeedView([first, source, latest, proposal], snapshot)).toEqual({
        items: [{ type: 'tool_call', row: source }],
        plan: latest.plan,
      });
    },
  );

  it.each(workMocks)(
    'groups recorded work for $agent',
    ({ rows, snapshot }) => {
      const view = toFeedView(rows, snapshot);
      expect(view.items.find((item) => item.type === 'group')).toMatchObject({
        title: 'Edited a file, Read files, ran commands',
        state: 'settled',
        items: expect.arrayContaining([
          expect.objectContaining({ type: 'exploration', title: 'Explored' }),
          expect.objectContaining({ type: 'tool_call' }),
        ]),
      });
      expect(view.plan).toBeNull();
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
          items: [{ type: 'tool_call', row }],
        },
      ]);
    },
  );

  it.each(workMocks)(
    'keeps failed exploration in its own row for $agent',
    ({ rows, snapshot }) => {
      const recorded = toolCalls(rows).find(
        (row) =>
          row.kind === 'read' ||
          row._meta?.argo?.commandActions?.some(
            (action) => action.type === 'read',
          ),
      );
      if (!recorded) throw new Error('Recording needs a read');
      const row: ToolCallUpdate = { ...recorded, status: 'failed' };
      expect(toFeedView([row], snapshot).items).toEqual([
        { type: 'tool_call', row },
      ]);
    },
  );

  it.each(workMocks)(
    'combines reads across thoughts for $agent',
    ({ rows, snapshot }) => {
      const source = commandRow(rows);
      const first: ToolCallUpdate = {
        ...source,
        id: 'first-read',
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
          id: 'first-read',
          title: 'Read files',
          state: 'settled',
          items: [
            {
              type: 'exploration',
              id: 'first-read',
              title: 'Explored',
              lines: ['Read a.ts, b.ts'],
              toolCalls: [first, second],
            },
            { type: 'thought', row: thought },
          ],
        },
      ]);
    },
  );

  describe.each(workMocks)(
    'command actions for $agent',
    ({ rows, snapshot }) => {
      it.each<{
        name: string;
        actions: CommandAction[];
        lines: string[];
      }>([
        {
          name: 'read',
          actions: [{ type: 'read', command: 'opaque', path: 'a.ts' }],
          lines: ['Read a.ts'],
        },
        {
          name: 'search',
          actions: [
            { type: 'search', command: 'opaque', query: 'needle', path: 'src' },
          ],
          lines: ['Searched for needle in src'],
        },
        {
          name: 'list',
          actions: [{ type: 'list', command: 'opaque', path: 'src' }],
          lines: ['Listed files in src'],
        },
        {
          name: 'multiple actions',
          actions: [
            { type: 'read', command: 'opaque', path: 'a.ts' },
            { type: 'search', command: 'opaque', query: 'needle' },
            { type: 'list', command: 'opaque', path: 'src' },
          ],
          lines: ['Read a.ts', 'Searched for needle', 'Listed files in src'],
        },
      ])('draws supplied $name metadata', ({ actions, lines }) => {
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
            items: [
              {
                type: 'exploration',
                id: row.id,
                title: 'Exploring',
                lines,
                toolCalls: [row],
              },
            ],
          },
        ]);
      });
    },
  );
});
