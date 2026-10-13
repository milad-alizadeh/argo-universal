import { createAgentMetadata } from '@repo/mocks/agent';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { startEngineTestHost } from '#mocks/engine';

const attachment = {
  type: 'image' as const,
  mimeType: 'image/png',
  blob: { blobId: 'a'.repeat(64), mime: 'image/png', bytes: 1 },
};

it('an Agent without an ACP launch refuses an attachment instead of dropping it', async () => {
  const host = await startEngineTestHost({
    adapters: [{ ...createAgentMetadata(), agent: 'mock' }],
    resolveAgentLaunch: undefined,
  });
  const listed = async (): Promise<unknown> =>
    (await host.caller.session.list({ archived: false })).sessions;
  const before = await listed();
  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Look at this' }, attachment],
    }),
  ).rejects.toThrow("This Agent can't receive attachments yet");
  expect(await listed()).toEqual(before);
});
