import { expect, it } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';
import { operationCaller } from '#mocks/operations';

it('reads recent Agent messages without spending its page on thoughts or Tool calls', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'first',
      content: { type: 'text', text: 'First result' },
    },
    {
      sessionUpdate: 'agent_thought_chunk',
      content: { type: 'text', text: 'Private reasoning' },
    },
    {
      sessionUpdate: 'tool_call',
      toolCallId: 'read-file',
      title: 'Read file',
      kind: 'read',
      status: 'completed',
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'second',
      content: { type: 'text', text: 'Second result' },
    },
  ]);
  const caller = await operationCaller(host);

  expect(
    await caller.operations.run.mutate({
      id: 'session.feed',
      params: { sessionId, limit: 1 },
    }),
  ).toMatchObject({
    messages: [
      {
        sessionUpdate: 'agent_message',
        content: [{ type: 'text', text: 'Second result' }],
      },
    ],
    nextCursor: expect.any(Number),
    staleCursor: false,
  });
});
