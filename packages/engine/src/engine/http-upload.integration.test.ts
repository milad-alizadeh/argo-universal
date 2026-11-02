import { join } from 'node:path';
import { BlobUploadOutput, maxBlobUploadBytes } from '@repo/contracts';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { home, port, readdirSafe } from '#mocks/engine-http';
import { appOrigin } from '#mocks/plugin-assets';

it('stores an upload sent as multipart FormData over HTTP', async (): Promise<void> => {
  const form = new FormData();
  form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');

  const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
    method: 'POST',
    headers: appOrigin,
    body: form,
  });

  const { result } = z
    .object({ result: z.object({ data: BlobUploadOutput }) })
    .parse(await response.json());

  expect(response.status).toBe(200);
  expect(result.data).toMatchObject({ bytes: 3 });
  expect(result.data.blobId).toMatch(/^[0-9a-f]{64}$/);

  const stored = await fetch(
    `http://127.0.0.1:${port}/blobs/${result.data.blobId}`,
    { headers: appOrigin },
  );

  expect(await stored.text()).toBe('png');
});

it('refuses an upload over 20 MB before reading all of it', async (): Promise<void> => {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(maxBlobUploadBytes + 1)]));

  const response = await fetch(`http://127.0.0.1:${port}/trpc/blob.upload`, {
    method: 'POST',
    headers: appOrigin,
    body: form,
  });

  expect(response.status).toBe(413);
  expect(readdirSafe(join(home, 'blobs'))).toEqual([]);
});
