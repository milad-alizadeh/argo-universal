import { expect, it } from 'vitest';
import {
  uploadRoute,
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
