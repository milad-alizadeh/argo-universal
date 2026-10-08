import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '../fixtures';
import { readFeed } from './feed';
import { When, Then } from './fixtures';

const imagePath = path.resolve(
  import.meta.dirname,
  '../../mocks/cli/red-square.png',
);
const imageMime = 'image/png';
const imagePrompt = 'Name the dominant color in this image.';

async function imageBlob(): Promise<{
  image: Buffer;
  blob: { blobId: string; mime: string; bytes: number };
}> {
  const image = await readFile(imagePath);
  return {
    image,
    blob: {
      blobId: createHash('sha256').update(image).digest('hex'),
      mime: imageMime,
      bytes: image.byteLength,
    },
  };
}

When('I attach the red square image', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Attach images' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Photos' }).click();
  await (await chooser).setFiles(imagePath);
  await expect(page.getByRole('img', { name: 'red-square.png' })).toBeVisible();
});

Then(
  'the Session Feed contains the image prompt',
  async ({ page, server }): Promise<void> => {
    const { blob } = await imageBlob();
    const [prompt] = await readFeed(page, server.httpUrl);
    expect(prompt).toMatchObject({
      sessionUpdate: 'user_message',
      content: [
        { type: 'text', text: imagePrompt },
        { type: 'image', mimeType: imageMime, blob },
      ],
    });
  },
);

Then(
  'the Server preserves the attached image',
  async ({ page, server }): Promise<void> => {
    const { image, blob } = await imageBlob();
    const stored = await page.request.get(
      `${server.httpUrl}/blobs/${blob.blobId}`,
    );
    expect(Buffer.from(await stored.body())).toEqual(image);
  },
);
