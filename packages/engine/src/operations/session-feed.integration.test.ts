import { SessionFeedOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { openAcpFeedSession } from '#mocks/acp-feed';
import { operationCaller } from '#mocks/operations';

const feedOperationId = 'session.feed';

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
      id: feedOperationId,
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

it('returns the newest messages when a cursor belongs to another epoch', async () => {
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Current result' },
    },
  ]);

  const caller = await operationCaller(host);

  const current = SessionFeedOutput.parse(
    await caller.operations.run.mutate({
      id: feedOperationId,
      params: { sessionId },
    }),
  );

  expect(
    await caller.operations.run.mutate({
      id: feedOperationId,
      params: { sessionId, cursor: 0, epoch: current.epoch + 1 },
    }),
  ).toMatchObject({
    epoch: current.epoch,
    messages: [{ content: [{ type: 'text', text: 'Current result' }] }],
    staleCursor: true,
  });
});

it.each([0, 201])('refuses an invalid message page limit %i', async (limit) => {
  const host = await startAcpEngine({ steps: [] });
  const caller = await operationCaller(host);

  await expect(
    caller.operations.run.mutate({
      id: feedOperationId,
      params: { sessionId: 'session-1', limit },
    }),
  ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  expect(host.agent.processes).toHaveLength(0);
});
