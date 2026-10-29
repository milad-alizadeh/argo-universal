import { expect, it } from 'vitest';
import type { AttachmentStorage } from '../../../blob';
import { readAcpPromptContent } from './prompt-content';

it('hands the Agent a link that is no uploaded file as it was chosen', async () => {
  const link = {
    type: 'resource_link' as const,
    name: 'ITEM-7',
    uri: 'example://items/7',
    title: 'Seventh item',
  };

  await expect(
    readAcpPromptContent({
      content: [{ type: 'text', text: 'See ITEM-7 ' }, link],
      capabilities: {},
      // A plain link reads no file, so the storage is never touched.
      storage: {} as AttachmentStorage,
    }),
  ).resolves.toMatchObject([{ type: 'text', text: 'See ITEM-7 ' }, link]);
});
