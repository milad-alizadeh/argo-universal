import { expect, it } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';

it.each(['agent-1', 'agent-2'])(
  '%s retains omitted/null tool fields while explicit empty arrays clear collections after settlement',
  async (agentId) => {
    const { host, sessionId } = await openAcpFeedSession(
      [
        {
          sessionUpdate: 'tool_call',
          toolCallId: 'patch-1',
          title: 'Read once',
          kind: 'read',
          status: 'completed',
          name: 'read_file',
          rawInput: { path: '/source' },
          rawOutput: { bytes: 6 },
          content: [
            { type: 'content', content: { type: 'text', text: 'source' } },
          ],
          locations: [{ path: '/source', line: 9 }],
        },
        {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'patch-1',
          title: null,
          kind: null,
          status: null,
          name: null,
          rawInput: null,
          rawOutput: null,
          content: null,
          locations: null,
        },
        {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'patch-1',
          content: [],
          locations: [],
        },
      ],
      agentId,
    );
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
    expect(page.rows).toMatchObject([
      { sessionUpdate: 'user_message' },
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'patch-1',
        title: 'Read once',
        name: 'read_file',
        kind: 'read',
        status: 'completed',
        state: 'settled',
        rawInput: { path: '/source' },
        rawOutput: { bytes: 6 },
        content: [],
        locations: [],
        position: 1,
        revision: 4,
      },
    ]);
    expect(page.rows[1]?.turnId).toBe(page.rows[0]?.turnId);
  },
);

it('a first partial tool update shows supplied information without inventing a command', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'partial',
      status: 'failed',
      rawOutput: { error: 'Missing' },
    },
  ]);
  expect(
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toMatchObject([
    { sessionUpdate: 'user_message' },
    {
      sessionUpdate: 'tool_call_update',
      title: 'Tool call',
      status: 'failed',
      kind: 'other',
      rawOutput: { error: 'Missing' },
      content: [],
      position: 1,
    },
  ]);
});
