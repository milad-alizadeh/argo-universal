import { expect, it } from 'vitest';
import { userToken } from '#mocks/engine-proof';
import {
  askOverSocket,
  blobId,
  home,
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
 * The App's own media loads: an `<img>` is not a CORS request, so the browser sends no `Origin`, and the page it came from is what the browser sends instead.
 * A page that rebinds a name cannot forge that: the attack is same-origin, so its own name is what the browser reports.
 */
it.each(['http://localhost:8081/sessions', 'app://app/sessions'])(
  'serves a Blob to a media load from the App page %s',
  async (referer): Promise<void> => {
    const response = await sendHttpRequest({
      path: `/blobs/${blobId}`,
      headers: { referer },
      unproved: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('blob content');
  },
);

/*
 * Every site on the web is cross-site to this Server, so what the browser calls the load is no proof at all: taking it would let any page load a Blob or a Plugin asset, and run one in its own page with `<script src>`.
 * The App's own loads do not need it. A web App's page is on this computer, and the desktop App's main process attaches the user token to these two routes, where its renderer never sees it.
 */
it.each([`/blobs/${blobId}`, '/plugin-assets/probe/x.png'])(
  'refuses %s loaded by a page the browser calls cross-site',
  async (path): Promise<void> => {
    const response = await sendHttpRequest({
      path,
      headers: {
        referer: 'http://evil.example/',
        'sec-fetch-site': 'cross-site',
      },
      unproved: true,
    });

    expect(response.status).toBe(403);
    expect(response.body).not.toBe('blob content');
  },
);

/*
 * A WebSocket carries the same two proofs, and a browser's upgrade from a page elsewhere never gets this far (ADR-0045).
 * The upgrade itself admits nobody: a caller with no page of its own, such as the desktop App's main process or the `argo` CLI, shows the token in the Connection's parameters, and one that shows neither reaches no procedure (#1696).
 */
it('serves no procedure on a WebSocket that shows neither an Origin nor a token', async (): Promise<void> => {
  await expect(askOverSocket({})).resolves.toBe(
    'This Connection has not proved which Device it is',
  );
});

// A Connection is refused by the procedure it called, which is where a subscription's caller hears it; the plain-HTTP door is the one that names the token, because that is where the CLI asks.
it('serves no procedure on a WebSocket that shows a token the Server does not know', async (): Promise<void> => {
  await expect(askOverSocket({ token: 'wrong' })).resolves.toBe(
    'This Connection has not proved which Device it is',
  );
});

it('serves a WebSocket that shows the user token', async (): Promise<void> => {
  await expect(askOverSocket({ token: await userToken(home) })).resolves.toBe(
    '1.2.3',
  );
});

it("serves a WebSocket opened by the App's own page", async (): Promise<void> => {
  await expect(
    askOverSocket({ headers: { origin: 'app://app' } }),
  ).resolves.toBe('1.2.3');
});
