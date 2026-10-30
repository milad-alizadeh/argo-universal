import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PluginCapability } from '@repo/contracts/plugins';
import { httpsServer } from './probe-plugin';

export const fetchLimit = 5_242_880;

const redirectPrefix = '/to/';

type Route = (response: ServerResponse, request: IncomingMessage) => void;

const redirect =
  (status: number, location: string): Route =>
  (response): void =>
    void response.writeHead(status, { location }).end();

/*
 * `/big` is over the cap, `/same` redirects home, `/see-other` answers 303, `/loop` redirects to
 * itself, `/headers` echoes the credentials it got, `/to/<url>` redirects to the URL; anything else
 * echoes the method and path.
 */
const routes = new Map<string, Route>([
  ['/big', (response): void => void response.end('x'.repeat(fetchLimit + 1))],
  ['/same', redirect(302, '/')],
  ['/see-other', redirect(303, '/')],
  ['/loop', redirect(302, '/loop')],
  [
    '/headers',
    (response, { headers }): void =>
      void response.end(JSON.stringify(fixtureHeaders(headers))),
  ],
]);

const nullIfMissing = <T>(value: T | undefined): T | null => value ?? null;

type EchoHeaders = {
  authorization: string | null;
  cookie: string | null;
  custom: string | string[] | null;
};

const fixtureHeaders = (headers: IncomingMessage['headers']): EchoHeaders => ({
  authorization: nullIfMissing(headers.authorization),
  cookie: nullIfMissing(headers.cookie),
  custom: nullIfMissing(headers['x-custom']),
});

export const serving = (): Promise<number> =>
  httpsServer((request, response) => {
    const route = routes.get(request.url ?? '');

    if (route) return route(response, request);

    redirectOrEcho(request, response);
  });

function redirectOrEcho(
  { url = '', method }: IncomingMessage,
  response: ServerResponse,
): void {
  if (!url.startsWith(redirectPrefix))
    return void response.end(JSON.stringify({ method, url }));

  response
    .writeHead(307, {
      location: decodeURIComponent(url.slice(redirectPrefix.length)),
    })
    .end();
}

export const localhost = (port: number): PluginCapability => ({
  kind: 'fetch',
  host: `localhost:${port}`,
  reason: 'The fixture server',
});

export const redirectTo = (port: number, target: string): string =>
  `https://localhost:${port}${redirectPrefix}${encodeURIComponent(target)}`;
