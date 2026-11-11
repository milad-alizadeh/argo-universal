import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
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

function routeOf(
  incoming: IncomingMessage,
): Pick<FixtureRequest, 'method' | 'path'> {
  return { method: incoming.method ?? 'GET', path: incoming.url ?? '/' };
}

async function recorded(incoming: IncomingMessage): Promise<FixtureRequest> {
  return {
    ...routeOf(incoming),
    host: incoming.headers.host ?? '',
    headers: incoming.headers,
    body: await bodyOf(incoming),
  };
}

const okStatus = 200;

type Rendered = { type: string; body: string };

function rendered({ json, text }: FixtureAnswer): Rendered {
  if (text !== undefined) return { type: 'text/plain', body: text };

  return { type: 'application/json', body: JSON.stringify(json ?? {}) };
}

function answer(response: ServerResponse, given: FixtureAnswer): void {
  const { type, body } = rendered(given);

  response.writeHead(given.status ?? okStatus, { 'content-type': type });
  response.end(body);
}

type Handler = (
  request: FixtureRequest,
) => FixtureAnswer | Promise<FixtureAnswer>;

function serve(handler: Handler, requests: FixtureRequest[]): Promise<number> {
  return httpsServer((incoming, response) => {
    void recorded(incoming)
      .then(async (seen) => {
        requests.push(seen);
        answer(response, await handler(seen));
      })
      .catch((cause: unknown) => {
        answer(response, { status: 500, text: String(cause) });
      });
  });
}

async function networkFor(port: number): Promise<PluginNetwork> {
  return {
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
}

/*
 * Stands in for the public services a Plugin reaches, such as `github.com` and `api.github.com`: the Plugin uses their
 * real names, and the Server's network sends them all to one local server whose handler plays every service.
 */
export async function fixtureServices(
  handler: Handler,
): Promise<FixtureServices> {
  const requests: FixtureRequest[] = [];
  const port = await serve(handler, requests);

  return { network: await networkFor(port), requests };
}
