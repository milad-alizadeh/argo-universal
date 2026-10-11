import { expect, it, vi } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';

it('ordered message blocks append text at its actual index and visibly retain unsupported media', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { host, sessionId } = await openAcpFeedSession([
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: { type: 'text', text: 'Hello' },
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: {
        type: 'resource_link',
        name: 'Source',
        uri: 'file:///source.ts',
        mimeType: 'text/typescript',
        _meta: { label: 'upstream', argo: { source: 'pasted' } },
      },
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: { type: 'text', text: 'World 😀' },
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: { type: 'text', text: '!' },
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: { type: 'audio', data: 'Ynl0ZXM=', mimeType: 'audio/wav' },
    },
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'blocks',
      content: {
        type: 'image',
        data: 'Ynl0ZXM=',
        mimeType: 'image/png',
        uri: 'javascript:danger',
      },
    },
  ]);
  const message = (
    await host.caller.feed.page({ sessionId, direction: 'tail' })
  ).rows[1];
  expect(message).toMatchObject({
    sessionUpdate: 'agent_message',
    state: 'settled',
    content: [
      { type: 'text', text: 'Hello' },
      {
        type: 'resource_link',
        name: 'Source',
        uri: 'file:///source.ts',
        _meta: { acp: { label: 'upstream', argo: { source: 'pasted' } } },
      },
      { type: 'text', text: 'World 😀!' },
      {
        type: 'unsupported',
        contentKind: 'audio',
        reason: 'Audio output is not supported',
      },
      {
        type: 'unsupported',
        contentKind: 'image',
        reason: 'Image output requires stored Blob materialization',
      },
    ],
  });
  expect(JSON.stringify(message)).not.toContain('Ynl0ZXM=');
  expect(JSON.stringify(message)).not.toContain('javascript:danger');
  expect(errors).toHaveBeenCalledTimes(2);
  errors.mockRestore();
});
