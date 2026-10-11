import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { uploadBlob, blobsFolderIn } from '../blob';

const imageInitialization = {
  protocolVersion: 1,
  agentCapabilities: {
    promptCapabilities: { image: true },
    sessionCapabilities: { close: {} },
  },
};
it.each(['unavailable', 'corrupt'])(
  'an %s image rejects instead of dropping a block or returning success',
  async (failure) => {
    const requests: PromptRequest[] = [];
    const host = await startAcpEngine({
      initialize: imageInitialization,
      steps: [],
      responses: { 'session/prompt': [{ requests }] },
    });
    const blobsFolder = blobsFolderIn(host.home);
    const blob = await uploadBlob(
      { databaseWriter: host.databaseWriter, blobsFolder },
      new Blob(['complete original bytes'], { type: 'image/png' }),
    );
    if (failure === 'corrupt')
      await writeFile(join(blobsFolder, blob.blobId), 'truncated');
    const created = await host.caller.session.new(emptySessionInput);
    const reference =
      failure === 'unavailable' ? { ...blob, blobId: '0'.repeat(64) } : blob;
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'image', mimeType: 'image/png', blob: reference }],
      }),
    ).rejects.toThrow(
      failure === 'unavailable' ? 'unavailable' : 'contents do not match',
    );
    expect(requests).toEqual([]);
    expect(
      host.database.$client
        .prepare('SELECT COUNT(*) AS count FROM feed_row')
        .get(),
    ).toEqual({ count: 0 });
  },
);

it('thoughts and messages keep separate identities while an Agent user echo adds no human row', async () => {
  const host = await startAcpEngine({
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_thought_chunk',
          messageId: 'shared-id',
          content: { type: 'text', text: 'Thinking' },
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: 'shared-id',
          content: { type: 'text', text: 'Answer' },
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'user_message_chunk',
          content: { type: 'text', text: 'Injected user echo' },
        },
      },
    ],
  });
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Human prompt' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(page.rows).toMatchObject([
    { sessionUpdate: 'user_message', content: [{ text: 'Human prompt' }] },
    {
      sessionUpdate: 'agent_thought',
      state: 'settled',
      content: [{ text: 'Thinking' }],
    },
    {
      sessionUpdate: 'agent_message',
      state: 'settled',
      content: [{ text: 'Answer' }],
    },
  ]);
  expect(page.rows[1]?.id).not.toBe(page.rows[2]?.id);
  expect(page.rows[1]?.turnId).toBe(page.rows[2]?.turnId);
});
