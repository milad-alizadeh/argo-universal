import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { rejectedProcedureCode } from '#mocks/procedure-request';

it.each(['missing', 'text', 'extra'])(
  'rejects the %s file through the real Blob upload router',
  async (invalidUpload): Promise<void> => {
    const { caller } = await startEngineTestHost();
    const uploadForm = new FormData();

    if (invalidUpload === 'text') uploadForm.set('file', 'plain text');

    if (invalidUpload === 'extra') {
      uploadForm.set('file', new Blob(['png']));
      uploadForm.append('extra', new Blob(['second']));
    }

    await expect(caller.blob.upload(uploadForm)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  },
);

it('rejects JSON through the real Blob upload router', async (): Promise<void> => {
  const { url } = await startEngineTestHost();
  expect(
    await rejectedProcedureCode(url, {
      path: 'blob.upload',
      type: 'mutation',
      input: JSON.stringify({ file: 'image' }),
    }),
  ).toBe('BAD_REQUEST');
});
