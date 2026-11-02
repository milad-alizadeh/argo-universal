import { expect, it } from 'vitest';
import { sentHeaders, type TokenisedServer } from './server-token';

const server: TokenisedServer = { port: 7337, token: 'control-token' };

const asked = { accept: 'image/*' };

const headersSentTo = (url: string): Record<string, string> =>
  sentHeaders({ url, requestHeaders: asked }, server);

it.each([
  `http://127.0.0.1:${server.port}/blobs/abc`,
  `http://127.0.0.1:${server.port}/plugin-assets/notes/icon.png`,
])('shows the user token on the media load %s', (url): void => {
  expect(headersSentTo(url)).toEqual({
    ...asked,
    authorization: `Bearer ${server.token}`,
  });
});

// Everything else a page asks for proves itself by its Origin, and a token on those calls would hand the page the owner's own scope over operations.
it.each([
  `http://127.0.0.1:${server.port}/trpc/session.prompt`,
  `http://127.0.0.1:${server.port + 1}/blobs/abc`,
  'http://localhost:8081/blobs/abc',
])('shows no token on %s', (url): void => {
  expect(headersSentTo(url)).toEqual(asked);
});
