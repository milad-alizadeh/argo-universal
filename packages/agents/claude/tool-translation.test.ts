import type {
  AgentInput,
  GlobInput,
  GrepInput,
  WebFetchInput,
  WebSearchInput,
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import { expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import { mapAll, feedChanges, foldRows } from './mocks/mapping';
import { assistant } from './mocks/sdk-messages';
import { edits } from './mocks/sdk-tools';
it('maps the edits and the command onto Tool call rows', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  const tools = rows.filter(
    (row): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
      row.sessionUpdate === 'tool_call_update',
  );
  expect(tools).toEqual([
    expect.objectContaining({
      name: 'Write',
      kind: 'edit',
      status: 'completed',
      locations: [{ path: '/project/notes.md' }],
      content: [
        {
          type: 'diff',
          changes: [
            {
              operation: 'add',
              path: '/project/notes.md',
              newText: expect.stringContaining('# Todo'),
            },
          ],
        },
      ],
    }),
    expect.objectContaining({
      name: 'Read',
      kind: 'read',
      status: 'completed',
      locations: [{ path: '/project/hello.txt' }],
      content: [
        { type: 'content', content: { type: 'text', text: 'hello world\n' } },
      ],
    }),
    expect.objectContaining({
      name: 'Edit',
      kind: 'edit',
      status: 'completed',
      content: [
        {
          type: 'diff',
          changes: [
            {
              operation: 'modify',
              path: '/project/hello.txt',
              oldText: 'hello world',
              newText: 'hello Argo',
            },
          ],
        },
      ],
    }),
    expect.objectContaining({
      name: 'Bash',
      kind: 'execute',
      status: 'completed',
      title: 'Show hello.txt and short git status',
      content: [
        {
          type: 'terminal',
          command: 'cat hello.txt && git status --short',
          output: 'hello Argo\n M hello.txt\n?? notes.md',
        },
      ],
    }),
  ]);
});
it('gives text rows message.id#blockIndex, the same with or without streaming', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  const firstMessage = messages.find(
    (message): message is Extract<VendorMessage, { type: 'assistant' }> =>
      message.type === 'assistant',
  );
  expect(rows[0]?.id).toBe(`${firstMessage?.message.id}#0`);

  const recordsOnly = mapAll(
    messages.filter(
      (message): message is Exclude<VendorMessage, { type: 'stream_event' }> =>
        message.type !== 'stream_event',
    ),
  );
  expect(foldRows(feedChanges(recordsOnly.events))).toEqual(rows);
});

const startedTool = (
  name: string,
  input: Record<string, unknown>,
): Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> | undefined =>
  foldRows(
    feedChanges(
      mapAll([
        assistant('msg_tool', [
          {
            type: 'tool_use',
            id: 'toolu_1',
            name,
            input,
            caller: { type: 'direct' },
          },
        ]),
      ]).events,
    ),
  ).find(
    (row): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
      row.sessionUpdate === 'tool_call_update',
  );

it.each([
  {
    name: 'WebSearch',
    input: { query: 'expo router' } satisfies WebSearchInput,
    expected: {
      kind: 'fetch',
      title: 'Search the web for expo router',
      _meta: { argo: { webAction: { type: 'search', query: 'expo router' } } },
    },
  },
  {
    name: 'WebFetch',
    input: {
      url: 'https://docs.expo.dev',
      prompt: 'Summarise',
    } satisfies WebFetchInput,
    expected: {
      kind: 'fetch',
      title: 'Fetch https://docs.expo.dev',
      _meta: {
        argo: { webAction: { type: 'fetch', url: 'https://docs.expo.dev' } },
      },
    },
  },
  {
    name: 'Grep',
    input: { pattern: 'TODO' } satisfies GrepInput,
    expected: { kind: 'search', title: 'Search for TODO' },
  },
  {
    name: 'Grep',
    input: { pattern: 'TODO', path: 'src' } satisfies GrepInput,
    expected: { kind: 'search', title: 'Search for TODO in src' },
  },
  {
    name: 'Glob',
    input: { pattern: '**/*.ts' } satisfies GlobInput,
    expected: { kind: 'search', title: 'Find files matching **/*.ts' },
  },
  {
    name: 'Glob',
    input: { pattern: '*.md', path: 'docs' } satisfies GlobInput,
    expected: { kind: 'search', title: 'Find files matching *.md in docs' },
  },
  {
    name: 'mcp__github__list_issues',
    input: { repo: 'argo' },
    expected: { kind: 'other', title: 'github: list_issues' },
  },
  {
    name: 'Agent',
    input: {
      description: 'Find Feed tests',
      prompt: 'Look',
    } satisfies AgentInput,
    expected: { kind: 'other', title: 'Find Feed tests' },
  },
  {
    name: 'Task',
    input: { description: 'Find Feed tests', prompt: 'Look' },
    expected: { kind: 'other', title: 'Find Feed tests' },
  },
])(
  'names a $name Tool call from its input',
  ({ name, input, expected }): void => {
    expect(startedTool(name, input)).toEqual(expect.objectContaining(expected));
  },
);
