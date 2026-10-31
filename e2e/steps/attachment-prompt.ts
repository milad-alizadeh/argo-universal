import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { expect } from '../fixtures';
import { readFeed } from './feed';
import { When, Then } from './fixtures';

interface StoredBlob {
  blobId: string;
  mime: string;
  bytes: number;
}

interface ImageBlock {
  type: 'image';
  mimeType: string;
  blob: StoredBlob;
}

interface FileLinkBlock {
  type: 'resource_link';
  name: string;
  uri: string;
  blob: { blobId: string };
}

interface Attachment {
  fileName: string;
  mime: string;
  menuItem: string;
  // The prompt block the Feed stores for the uploaded file.
  block: (blob: StoredBlob) => ImageBlock | FileLinkBlock;
}

const AttachmentName = z.enum(['red square image', 'release notes file']);

// Images reach the Agent as pictures; any other file as the file itself.
const attachments = {
  'red square image': {
    fileName: 'red-square.png',
    mime: 'image/png',
    menuItem: 'Photos',
    block: (blob): ImageBlock => ({
      type: 'image',
      mimeType: blob.mime,
      blob,
    }),
  },
  'release notes file': {
    fileName: 'release-notes.md',
    mime: 'text/markdown',
    menuItem: 'Files',
    block: (blob): FileLinkBlock => ({
      type: 'resource_link',
      name: 'release-notes.md',
      uri: `/blobs/${blob.blobId}`,
      blob: { blobId: blob.blobId },
    }),
  },
} satisfies Record<z.infer<typeof AttachmentName>, Attachment>;

const attachmentNamed = (name: string): Attachment =>
  attachments[AttachmentName.parse(name)];

const filePath = (attachment: Attachment): string =>
  path.resolve(import.meta.dirname, '../../mocks/agent', attachment.fileName);

async function storedFile(attachment: Attachment): Promise<{
  bytes: Buffer;
  blob: StoredBlob;
}> {
  const bytes = await readFile(filePath(attachment));
  const blobId = createHash('sha256').update(bytes).digest('hex');

  return {
    bytes,
    blob: { blobId, mime: attachment.mime, bytes: bytes.byteLength },
  };
}

When(
  /^I attach the (red square image|release notes file)$/,
  async ({ page }, name: string): Promise<void> => {
    const attachment = attachmentNamed(name);
    await page.getByRole('button', { name: 'Attach' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: attachment.menuItem }).click();
    await (await chooser).setFiles(filePath(attachment));
    await expect(
      page.getByRole('img', { name: attachment.fileName }),
    ).toBeVisible();
  },
);

Then(
  /^the Session Feed contains the prompt "([^"]+)" with the (red square image|release notes file)$/,
  async ({ page, server }, text: string, name: string): Promise<void> => {
    const attachment = attachmentNamed(name);
    const { blob } = await storedFile(attachment);
    const [prompt] = await readFeed(page, server.httpUrl);
    expect(prompt).toMatchObject({
      sessionUpdate: 'user_message',
      content: [{ type: 'text', text }, attachment.block(blob)],
    });
  },
);

Then(
  /^the Server preserves the attached (red square image|release notes file)$/,
  async ({ page, server }, name: string): Promise<void> => {
    const { bytes, blob } = await storedFile(attachmentNamed(name));

    const stored = await page.request.get(
      `${server.httpUrl}/blobs/${blob.blobId}`,
      { headers: { origin: 'app://app' } },
    );

    expect(Buffer.from(await stored.body())).toEqual(bytes);
  },
);
