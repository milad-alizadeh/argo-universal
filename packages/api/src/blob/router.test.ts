import type { BlobUploadOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';

it('accepts a file in FormData and returns its BlobRef', async (): Promise<void> => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      blob: {
        upload: async (): Promise<BlobUploadOutput> => ({
          blobId: 'image-1',
          mime: 'image/png',
          bytes: 3,
        }),
      },
    }),
  });
  const form = new FormData();
  form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');
  await expect(caller.blob.upload(form)).resolves.toEqual({
    blobId: 'image-1',
    mime: 'image/png',
    bytes: 3,
  });
});

it.each(['missing', 'text', 'extra'])(
  'rejects %s file input',
  async (shape): Promise<void> => {
    const form = new FormData();
    if (shape === 'text') form.set('file', 'plain text');
    if (shape === 'extra') {
      form.set('file', new Blob(['png']));
      form.append('extra', new Blob(['second']));
    }
    const caller = appRouter.createCaller({ services: unreachableServices() });
    await expect(caller.blob.upload(form)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  },
);

it('rejects JSON input in place of multipart FormData', async (): Promise<void> => {
  const caller = appRouter.createCaller({ services: unreachableServices() });
  await expect(
    caller.blob.upload({ file: 'image' } as never),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
