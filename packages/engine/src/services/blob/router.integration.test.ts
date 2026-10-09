import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it.each(['missing', 'text', 'extra'])(
  'rejects the %s file through the real Blob upload router',
  async (invalidFileShape): Promise<void> => {
    const { caller } = await startEngineTestHost();
    const uploadForm = new FormData();
    if (invalidFileShape === 'text') uploadForm.set('file', 'plain text');
    if (invalidFileShape === 'extra') {
      uploadForm.set('file', new Blob(['png']));
      uploadForm.append('extra', new Blob(['second']));
    }
    await expect(caller.blob.upload(uploadForm)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  },
);

it('rejects JSON through the real Blob upload router', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  await expect(
    Reflect.apply(caller.blob.upload, undefined, [{ file: 'image' }]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
