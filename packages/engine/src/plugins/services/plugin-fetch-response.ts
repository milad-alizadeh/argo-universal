import type { IncomingMessage } from 'node:http';
import type { PluginValue } from '../protocol/runtime';
import { argoFetchLimitBytes } from './plugin-limits';

// One request `argo.fetch` sends: the first, or one a redirect leads to.
export type Hop = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

const movedPermanently = 301;

const found = 302;

const seeOther = 303;

const temporaryRedirect = 307;

const permanentRedirect = 308;

const okFrom = 200;

const okUntil = 300;

const redirectStatuses = new Set([
  movedPermanently,
  found,
  seeOther,
  temporaryRedirect,
  permanentRedirect,
]);

// The two statuses that turn a POST into a GET.
const postToGet = new Set([movedPermanently, found]);

const credentialHeaders = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
]);

const statusOf = (response: IncomingMessage): number =>
  response.statusCode ?? 0;

// Follows the Fetch standard: 303, and 301/302 after a POST, become a GET without a body; credentials stay with their origin.
export function redirected(hop: Hop, response: IncomingMessage): Hop | null {
  const location = locationOf(response);

  if (location === undefined) return null;

  const url = new URL(location, hop.url);
  const next = { ...hop, url, headers: headersFor(hop, url) };

  return becomesGet(hop.method, statusOf(response)) ? asGet(next) : next;
}

const locationOf = (response: IncomingMessage): string | undefined =>
  redirectStatuses.has(statusOf(response))
    ? response.headers.location
    : undefined;

const becomesGet = (method: string, status: number): boolean =>
  status === seeOther
    ? method !== 'HEAD'
    : postToGet.has(status) && method === 'POST';

const headersFor = (hop: Hop, url: URL): Record<string, string> =>
  url.origin === hop.url.origin
    ? hop.headers
    : without(hop.headers, (name) => credentialHeaders.has(name));

const asGet = ({ url, headers }: Hop): Hop => ({
  url,
  method: 'GET',
  headers: without(headers, (name) => name.startsWith('content-')),
});

const without = (
  headers: Record<string, string>,
  dropped: (lowerCaseName: string) => boolean,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(([name]) => !dropped(name.toLowerCase())),
  );

type Received = { chunks: Buffer[]; size: number };

// Reads the body as a stream and stops at the cap, so a huge response is never held whole.
export async function responseValue(
  response: IncomingMessage,
): Promise<PluginValue> {
  const { chunks, size } = await readCapped(response);
  const status = statusOf(response);

  return {
    ok: status >= okFrom && status < okUntil,
    status,
    statusText: response.statusMessage ?? '',
    headers: headersOf(response),
    body: Buffer.concat(chunks).toString('utf8'),
    truncated: size > argoFetchLimitBytes,
  };
}

async function readCapped(response: IncomingMessage): Promise<Received> {
  const received: Received = { chunks: [], size: 0 };

  for await (const chunk of response)
    if (!appendUnderCap(received, chunk)) break;

  return received;
}

// Keeps what fits under the cap; false once the body is past it.
function appendUnderCap(received: Received, chunk: Buffer): boolean {
  received.chunks.push(
    chunk.subarray(0, Math.max(argoFetchLimitBytes - received.size, 0)),
  );
  received.size += chunk.length;

  return received.size <= argoFetchLimitBytes;
}

const headersOf = (response: IncomingMessage): Record<string, string> =>
  Object.fromEntries(
    Object.entries(response.headers).flatMap(([name, value]) =>
      value === undefined
        ? []
        : [[name, Array.isArray(value) ? value.join(', ') : value]],
    ),
  );
