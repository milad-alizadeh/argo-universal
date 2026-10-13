import { expect, it } from 'vitest';
import {
  blobId,
  infoRoute,
  uploadRoute,
  host,
  sendHttpRequest,
  sendFormRequest,
  createUploadForm,
} from '#mocks/engine-request';

it.each([
  ['the desktop app', 'app://app'],
  ['Expo web on localhost', 'http://localhost:8081'],
])(
  'lets %s call tRPC and read the answer',
  async (_name, origin): Promise<void> => {
    const response = await sendFormRequest(
      uploadRoute,
      createUploadForm(),
      origin,
    );

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  },
);

it.each(['https://evil.example', 'null'])(
  'refuses a tRPC call from the Origin %s and counts it',
  async (origin): Promise<void> => {
    const response = await sendFormRequest(
      uploadRoute,
      createUploadForm(),
      origin,
    );

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      `engine: rejected Origin ${JSON.stringify(origin)} #1`,
    );
  },
);

it.each([`/blobs/${blobId}`, infoRoute])(
  'answers 403 to %s from another Host and counts it',
  async (path): Promise<void> => {
    const response = await sendHttpRequest({
      path,
      headers: { host: 'evil.example:7337' },
    });

    expect(response.status).toBe(403);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'engine: rejected Host "evil.example:7337" #1',
    );
  },
);

it('answers 403 to a Host that is not a plain host and port', async (): Promise<void> => {
  const response = await sendHttpRequest({
    path: infoRoute,
    headers: { host: `evil.example@${host}` },
  });

  expect(response.status).toBe(403);
});
