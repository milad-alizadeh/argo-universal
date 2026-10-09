import { expect, it } from 'vitest';
import { createRouterHost } from '#mocks/router';

it.each(['missing', 'text', 'extra'])(
  'rejects the %s file through the real Blob upload router',
  async (shape): Promise<void> => {
    const { caller } = createRouterHost();
    const form = new FormData();
    if (shape === 'text') form.set('file', 'plain text');
    if (shape === 'extra') {
      form.set('file', new Blob(['png']));
      form.append('extra', new Blob(['second']));
    }
    await expect(caller.blob.upload(form)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  },
);

it('rejects JSON through the real Blob upload router', async (): Promise<void> => {
  const { caller } = createRouterHost();
  await expect(
    Reflect.apply(caller.blob.upload, undefined, [{ file: 'image' }]),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
