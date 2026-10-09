import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const toolCallId = 'read-1';
const sourcePath = 'src/index.ts';
const toolTitle = 'Read source';

it('official tool updates retain creation fields when a partial update completes the call', async () => {
  const host = await startAcpEngine({
    prompt: async ({ params, client }) => {
      await client.notify('session/update', {
        sessionId: params.sessionId,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: toolCallId,
          title: toolTitle,
          kind: 'read',
          status: 'in_progress',
          rawInput: { path: sourcePath },
          locations: [{ path: sourcePath, line: 3 }],
          content: [
            { type: 'content', content: { type: 'text', text: 'Start' } },
          ],
        },
      });
      await client.notify('session/update', {
        sessionId: params.sessionId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: toolCallId,
          status: 'completed',
          content: [
            { type: 'content', content: { type: 'text', text: 'Done' } },
          ],
        },
      });
      return { stopReason: 'end_turn' };
    },
  });
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: toolTitle }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(page.rows).toMatchObject([
    { sessionUpdate: 'user_message' },
    {
      sessionUpdate: 'tool_call_update',
      toolCallId: toolCallId,
      title: toolTitle,
      kind: 'read',
      status: 'completed',
      state: 'settled',
      rawInput: { path: sourcePath },
      locations: [{ path: sourcePath, line: 3 }],
      content: [{ type: 'content', content: { type: 'text', text: 'Done' } }],
      position: 1,
      revision: 3,
    },
  ]);
  expect(page.rows[1]?.turnId).toBe(page.rows[0]?.turnId);
});
