import type { SessionNotification } from '@agentclientprotocol/sdk';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

type ToolCall = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' }
>;

const storedToolRow = async (
  update: Omit<ToolCall, 'sessionUpdate' | 'toolCallId' | 'status'>,
): Promise<unknown> => {
  const host = await startAcpEngine(
    feedScenario([
      {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-1',
        status: 'in_progress',
        ...update,
      },
    ]),
  );
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Go' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  return page.rows.find((row) => row.sessionUpdate === 'tool_call_update');
};

it.each([
  {
    agent: 'claude-agent-acp',
    update: {
      title: 'mcp__github__list_issues',
      name: 'mcp__github__list_issues',
      kind: 'other',
      rawInput: { repo: 'argo' },
    },
  },
  {
    agent: 'codex-acp',
    update: {
      title: 'mcp.github.list_issues',
      kind: 'execute',
      rawInput: { server: 'github', tool: 'list_issues', arguments: {} },
    },
  },
] as const)(
  'names an MCP Tool call from $agent by its server and tool',
  async ({ update }): Promise<void> => {
    expect(await storedToolRow(update)).toMatchObject({
      title: 'github: list_issues',
      name: 'list_issues',
    });
  },
);

it.each([
  {
    tool: 'Grep',
    rawInput: { pattern: 'liveHeader', path: 'src' },
    title: 'Search for liveHeader in src',
  },
  {
    tool: 'Grep',
    rawInput: { pattern: 'liveHeader' },
    title: 'Search for liveHeader',
  },
  {
    tool: 'Glob',
    rawInput: { pattern: '**/*.ts', path: 'src' },
    title: 'Find files matching **/*.ts in src',
  },
])(
  'names a $tool search by what it looks for',
  async ({ tool, rawInput, title }): Promise<void> => {
    expect(
      await storedToolRow({
        title: 'grep "liveHeader" src',
        name: tool,
        kind: 'search',
        rawInput,
      }),
    ).toMatchObject({ title });
  },
);

it('keeps the description the Agent wrote for a command', async (): Promise<void> => {
  expect(
    await storedToolRow({
      title: 'pnpm test',
      name: 'Bash',
      kind: 'execute',
      rawInput: { command: 'pnpm test', description: 'Run the tests' },
    }),
  ).toMatchObject({
    title: 'pnpm test',
    _meta: { argo: { description: 'Run the tests' } },
  });
});

it('keeps an adapter title it has no better name for', async (): Promise<void> => {
  expect(
    await storedToolRow({
      title: 'Web search: expo router',
      kind: 'search',
      rawInput: { query: 'expo router' },
    }),
  ).toMatchObject({ title: 'Web search: expo router' });
});
