import { expect, it } from 'vitest';
import {
  blobId,
  infoRoute,
  uploadRoute,
  sendFormRequest,
  sendHttpRequest,
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

    // A page from elsewhere proves nothing, so it reaches no procedure and is not addressed in the answer either.
    expect(response.status).toBe(401);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      `engine: rejected Origin ${JSON.stringify(origin)} #1`,
    );
  },
);

/*
 * A page on a name that resolves to this computer: its requests arrive on the loopback door, same-origin to the page, so a browser sends no `Origin` on them and the page reads every answer.
 * It has no token, because the file a token lives in is not something a page can read, so the door answers it nothing (#1696).
 */
const rebinding = { host: 'evil.example:7337' };

// A route that answers bytes has no procedure behind it, so the refusal is the door's; a tRPC query reaches no procedure and tRPC says so.
it.each([
  [infoRoute, 401],
  [`/blobs/${blobId}`, 403],
  ['/plugin-assets/probe/x.png', 403],
])(
  'refuses %s from a page on a name that resolves here, and counts it',
  async (path, status): Promise<void> => {
    const response = await sendHttpRequest({
      path,
      headers: rebinding,
      unproved: true,
    });

    expect(response.status).toBe(status);
    expect(response.body).not.toContain('1.2.3');
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      `engine: rejected unproved request ${JSON.stringify(path)} #1`,
    );
  },
);

it('refuses a tRPC query whose own page is where it came from', async (): Promise<void> => {
  const response = await sendHttpRequest({
    path: infoRoute,
    headers: {
      ...rebinding,
      referer: 'http://evil.example/',
      'sec-fetch-site': 'same-origin',
    },
    unproved: true,
  });

  expect(response.status).toBe(401);
  expect(response.body).not.toContain('1.2.3');
});

// A token the Server never issued proves nothing either, and the caller is told which refusal this is.
it('refuses a tRPC query that shows a token the Server does not know', async (): Promise<void> => {
  const response = await sendHttpRequest({
    path: infoRoute,
    headers: { ...rebinding, authorization: 'Bearer wrong' },
    unproved: true,
  });

  expect(response.status).toBe(401);
  expect(response.body).toContain('An Argo token is required');
});

it.each([infoRoute, `/blobs/${blobId}`])(
  'answers %s asked with the user token, whatever Host it names',
  async (path): Promise<void> => {
    const response = await sendHttpRequest({ path, headers: rebinding });

    expect(response.status).toBe(200);
  },
);

/*
 * The App's own media loads: an `<img>` is not a CORS request, so the browser sends no `Origin`, and these are what it sends instead.
 * A page that rebinds a name can forge neither, because the attack is same-origin and a browser attaches `Sec-Fetch-Site` only to an address it already trusts.
 */
it.each([
  [
    'the browser calling the load cross-site',
    { 'sec-fetch-site': 'cross-site' },
  ],
  ['the page it came from', { referer: 'http://localhost:8081/sessions' }],
])('serves a Blob to the App on %s', async (_name, headers): Promise<void> => {
  const response = await sendHttpRequest({
    path: `/blobs/${blobId}`,
    headers,
    unproved: true,
  });

  expect(response.status).toBe(200);
  expect(response.body).toBe('blob content');
});
