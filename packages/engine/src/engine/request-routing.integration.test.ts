import { expect, it } from 'vitest';
import {
  binaryMime,
  systemInfo,
  infoRoute,
  uploadRoute,
  sendHttpRequest,
  sendFormRequest,
  createUploadForm,
} from '#mocks/engine-request';

it('answers a tRPC query over HTTP at /trpc/', async (): Promise<void> => {
  const response = await sendHttpRequest({ path: infoRoute });
  expect(response.status).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ result: { data: systemInfo } });
});

it('hands an upload body to tRPC unread', async (): Promise<void> => {
  const response = await sendFormRequest(
    uploadRoute,
    createUploadForm(),
    'app://app',
  );

  expect(response.status).toBe(200);
  expect(JSON.parse(response.body)).toEqual({
    result: {
      data: {
        blobId:
          'e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c',
        mime: binaryMime,
        bytes: 12,
      },
    },
  });
});

it.each(['/health', '/'])(
  'sends %s to tRPC, which finds no procedure',
  async (path): Promise<void> => {
    const response = await sendHttpRequest({ path });
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: { data: { code: 'NOT_FOUND' } },
    });
  },
);
