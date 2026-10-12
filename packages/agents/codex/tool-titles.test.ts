import { describe, expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import { readCommand, combinedCommand } from './mocks/commands';
import { mapMessages } from './mocks/mapping';
import { itemCompleted, itemStarted, turnStarted } from './mocks/responses';
import type { ThreadItem } from './protocol.gen';

const context = { threadId: 'thread', turnId: 'turn' };
type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

const toolRows = (item: ThreadItem, completed: boolean): ToolRow[] =>
  mapMessages([
    turnStarted({
      threadId: context.threadId,
      turn: {
        id: context.turnId,
        items: [],
        itemsView: 'notLoaded',
        status: 'inProgress',
        error: null,
        startedAt: 0,
        completedAt: null,
        durationMs: null,
      },
    }),
    completed
      ? itemCompleted({ ...context, item, completedAtMs: 2 }, 2)
      : itemStarted({ ...context, item, startedAtMs: 1 }, 1),
  ]).flatMap((event): ToolRow[] =>
    event.type === 'agent.feed' &&
    event.change.type === 'upsert' &&
    event.change.update.sessionUpdate === 'tool_call_update'
      ? [event.change.update]
      : [],
  );

const webSearch = (
  action: Extract<ThreadItem, { type: 'webSearch' }>['action'],
): ThreadItem => ({
  type: 'webSearch',
  id: 'search-1',
  query: 'argo feed',
  action,
  results: null,
});

describe('Codex web search', (): void => {
  it.each([
    {
      action: { type: 'search', query: 'expo router', queries: null },
      title: 'Search the web for expo router',
      webAction: { type: 'search', query: 'expo router' },
    },
    {
      action: { type: 'openPage', url: 'https://docs.expo.dev' },
      title: 'Fetch https://docs.expo.dev',
      webAction: { type: 'fetch', url: 'https://docs.expo.dev' },
    },
    {
      action: {
        type: 'findInPage',
        url: 'https://docs.expo.dev',
        pattern: 'Stack',
      },
      title: 'Find Stack in https://docs.expo.dev',
      webAction: { type: 'fetch', url: 'https://docs.expo.dev' },
    },
    {
      action: { type: 'other' },
      title: 'Search the web for argo feed',
      webAction: { type: 'search', query: 'argo feed' },
    },
    {
      action: null,
      title: 'Search the web for argo feed',
      webAction: { type: 'search', query: 'argo feed' },
    },
  ] as const)(
    'names a $action.type action from what Codex supplied',
    ({ action, title, webAction }): void => {
      expect(toolRows(webSearch(action), true)).toEqual([
        expect.objectContaining({
          kind: 'fetch',
          title,
          status: 'completed',
          _meta: { argo: expect.objectContaining({ webAction }) },
        }),
      ]);
    },
  );

  it('runs until Codex completes the search', (): void => {
    expect(toolRows(webSearch(null), false)).toEqual([
      expect.objectContaining({ state: 'open', status: 'in_progress' }),
    ]);
  });
});

describe('Codex MCP Tool call', (): void => {
  const mcpCall = (
    status: 'inProgress' | 'completed' | 'failed',
  ): ThreadItem => ({
    type: 'mcpToolCall',
    id: 'mcp-1',
    server: 'github',
    tool: 'list_issues',
    status,
    arguments: { repo: 'argo' },
    appContext: null,
    mcpAppUi: null,
    pluginId: null,
    readOnlyHint: null,
    result: null,
    error: null,
    durationMs: null,
  });

  it.each([
    ['inProgress', 'in_progress'],
    ['completed', 'completed'],
    ['failed', 'failed'],
  ] as const)(
    'maps %s to %s and names the server and tool',
    (status, expected): void => {
      expect(toolRows(mcpCall(status), status !== 'inProgress')).toEqual([
        expect.objectContaining({
          kind: 'other',
          title: 'github: list_issues',
          name: 'list_issues',
          rawInput: { repo: 'argo' },
          status: expected,
        }),
      ]);
    },
  );
});

describe('Codex command title', (): void => {
  it('shows the command its one action names, without the shell wrapper', (): void => {
    expect(toolRows(combinedCommand, false)).toEqual([
      expect.objectContaining({
        title: 'cat app.txt notes.md',
        content: [
          expect.objectContaining({
            type: 'terminal',
            command: 'cat app.txt notes.md',
          }),
        ],
        rawInput: expect.objectContaining({
          command: "/bin/zsh -lc 'cat app.txt notes.md'",
        }),
      }),
    ]);
  });

  it('keeps the full command when the Agent supplies several actions', (): void => {
    const command = "/bin/zsh -lc 'cat a.txt && cat b.txt'";
    const item: ThreadItem = {
      ...readCommand,
      command,
      commandActions: [
        {
          type: 'read',
          command: 'cat a.txt',
          name: 'a.txt',
          path: '/repo/a.txt',
        },
        {
          type: 'read',
          command: 'cat b.txt',
          name: 'b.txt',
          path: '/repo/b.txt',
        },
      ],
    };
    expect(toolRows(item, false)).toEqual([
      expect.objectContaining({ title: command }),
    ]);
  });
});
