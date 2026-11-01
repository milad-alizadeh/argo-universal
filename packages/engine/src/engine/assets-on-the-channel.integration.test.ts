import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { blobPath } from '@repo/contracts';
import { pluginAssetPath } from '@repo/contracts/plugins/assets';
import { expect, it } from 'vitest';
import { readAsDevice } from '#mocks/engine-channel';
import { blobBytes, blobId } from '#mocks/engine-request';
import { assetProbe, image, imageReference } from '#mocks/plugin-assets';

const assetPath = pluginAssetPath(imageReference);

async function hostWithBlob(): Promise<Awaited<ReturnType<typeof assetProbe>>> {
  const host = await assetProbe();

  await mkdir(join(host.home, 'blobs'), { recursive: true });
  await writeFile(join(host.home, 'blobs', blobId), blobBytes);

  return host;
}

const bytesOf = async (response: Response): Promise<Buffer> =>
  Buffer.from(await response.arrayBuffer());

it('lets a paired Device read a Blob inside its channel', async (): Promise<void> => {
  const host = await hostWithBlob();
  const { ticket } = host.pairing.mint();

  const response = await readAsDevice(host, { ticket, path: blobPath(blobId) });

  expect(response.status).toBe(200);
  expect(await bytesOf(response)).toEqual(Buffer.from(blobBytes));
});

it('lets a paired Device read a Plugin asset inside its channel', async (): Promise<void> => {
  const host = await hostWithBlob();
  const { ticket } = host.pairing.mint();

  const response = await readAsDevice(host, { ticket, path: assetPath });

  expect(response.status).toBe(200);
  expect(await bytesOf(response)).toEqual(image);
});

it.each([
  ['a Blob', blobPath(blobId)],
  ['a Plugin asset', assetPath],
])(
  'gives %s to nobody outside a channel who cannot prove the Server Device',
  async (_name, path): Promise<void> => {
    const host = await hostWithBlob();

    const response = await fetch(`${host.url}${path}`);

    expect(response.status).toBe(403);
  },
);
