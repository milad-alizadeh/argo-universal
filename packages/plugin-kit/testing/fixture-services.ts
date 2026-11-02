import type { IncomingHttpHeaders, ServerResponse } from 'node:http';
import { request } from 'node:https';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import type { PluginNetwork } from '../../engine/src/plugins';

// One request a Plugin made to a service the test stands in for.
export type FixtureRequest = {
  host: string;
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: string;
};

export type FixtureAnswer = {
  status?: number;
  // Sent as JSON unless `text` is given.
  json?: unknown;
  text?: string;
};

export type FixtureServices = {
  // Pass as `network` to `startPluginTest`: every host a Plugin names reaches the handler, over a certificate the test trusts.
  network: PluginNetwork;
  requests: FixtureRequest[];
};

async function bodyOf(
  incoming: AsyncIterable<Buffer | string>,
): Promise<string> {
  let body = '';

  for await (const chunk of incoming) body += chunk.toString();

  return body;
}

function answer(
  response: ServerResponse,
  { status = 200, json, text }: FixtureAnswer,
): void {
  response.writeHead(status, {
    'content-type': text === undefined ? 'application/json' : 'text/plain',
  });
  response.end(text ?? JSON.stringify(json ?? {}));
}

/*
 * Stands in for the public services a Plugin reaches, such as `github.com` and `api.github.com`: the Plugin uses their
 * real names, and the Server's network sends them all to one local server whose handler plays every service.
 */
export async function fixtureServices(
  handler: (request: FixtureRequest) => FixtureAnswer | Promise<FixtureAnswer>,
): Promise<FixtureServices> {
  const requests: FixtureRequest[] = [];

  const port = await httpsServer((incoming, response) => {
    void bodyOf(incoming)
      .then(async (body) => {
        const seen = {
          host: incoming.headers.host ?? '',
          method: incoming.method ?? 'GET',
          path: incoming.url ?? '/',
          headers: incoming.headers,
          body,
        };

        requests.push(seen);
        answer(response, await handler(seen));
      })
      .catch((cause: unknown) => {
        answer(response, { status: 500, text: String(cause) });
      });
  });

  const network: PluginNetwork = {
    ...(await fixtureNetwork()),
    request: (url, options) =>
      request(
        new URL(`https://127.0.0.1:${port}${url.pathname}${url.search}`),
        {
          ...options,
          servername: 'localhost',
          headers: { ...options.headers, host: url.host },
        },
      ),
  };

  return { network, requests };
}
