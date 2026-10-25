import { lookup } from 'node:dns';
import {
  request as httpRequest,
  type IncomingMessage,
  type RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
import { CapabilityRefusal } from '../plugins/access/capability-refusal';
import {
  allowLiteral,
  checkedLookup,
} from '../plugins/access/plugin-addresses';
import { PreviewUnavailable, unavailable } from './preview-unavailable';

export type PreviewResponse = { url: string; type: string; bytes: Buffer };

const byteLimit = 1_048_576;

const deadlineMs = 8000;

const redirectLimit = 5;

const ok = 200;

const redirects = {
  movedPermanently: 301,
  found: 302,
  seeOther: 303,
  temporary: 307,
  permanent: 308,
};

const redirectStatuses = new Set(Object.values(redirects));

const publicHost = { private: false };

export function previewUrl(href: string, base?: URL): URL {
  const url = parsedUrl(href, base);
  requireProtocol(url);
  requireAnonymous(url);
  requirePublic(url);
  url.hash = '';

  return url;
}

function parsedUrl(href: string, base?: URL): URL {
  try {
    return new URL(href, base);
  } catch (error) {
    throw unavailable(error);
  }
}

function requirePublic(url: URL): void {
  try {
    allowLiteral(url, publicHost);
  } catch (error) {
    throw error instanceof CapabilityRefusal ? unavailable(error) : error;
  }
}

function requireProtocol(url: URL): void {
  if (!['http:', 'https:'].includes(url.protocol))
    throw new PreviewUnavailable('Unsupported preview protocol');
}

function requireAnonymous(url: URL): void {
  if ([url.username, url.password, url.port].some(Boolean))
    throw new PreviewUnavailable('Unsupported preview authority');
}

// Every redirect and its socket's addresses are checked before the Server connects.
export function readPreviewUrl(
  href: string,
  resolve: LookupFunction = lookup,
): Promise<PreviewResponse> {
  return follow(
    previewUrl(href),
    { signal: AbortSignal.timeout(deadlineMs), resolve },
    0,
  );
}

async function follow(
  url: URL,
  network: PreviewNetwork,
  redirects: number,
): Promise<PreviewResponse> {
  const response = await send(url, network);

  try {
    if (redirectStatuses.has(response.statusCode ?? 0))
      return follow(nextUrl(response, url, redirects), network, redirects + 1);

    return await readResponse(response, url);
  } finally {
    response.destroy();
  }
}

function nextUrl(response: IncomingMessage, url: URL, redirects: number): URL {
  if (redirects >= redirectLimit)
    throw new PreviewUnavailable('Too many preview redirects');

  if (!response.headers.location)
    throw new PreviewUnavailable('Missing redirect location');

  return previewUrl(response.headers.location, url);
}

async function readResponse(
  response: IncomingMessage,
  url: URL,
): Promise<PreviewResponse> {
  if (response.statusCode !== ok)
    throw new PreviewUnavailable('Preview fetch failed');

  return {
    url: url.href,
    type: response.headers['content-type'] ?? '',
    bytes: await readBytes(response),
  };
}

type PreviewNetwork = { signal: AbortSignal; resolve: LookupFunction };

function requestOptions({ signal, resolve }: PreviewNetwork): RequestOptions {
  return {
    signal,
    agent: false,
    lookup: checkedLookup(publicHost, resolve),
    headers: {
      'user-agent': 'Argo-LinkPreview',
      'accept-encoding': 'identity',
    },
  };
}

function send(url: URL, network: PreviewNetwork): Promise<IncomingMessage> {
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const outgoing = request(url, requestOptions(network), resolve);
    outgoing.once('error', (error) => reject(unavailable(error)));
    outgoing.end();
  });
}

async function readBytes(response: IncomingMessage): Promise<Buffer> {
  try {
    return Buffer.concat(await collect(response));
  } catch (cause) {
    throw unavailable(cause);
  }
}

async function collect(response: IncomingMessage): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of response) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;

    if (size > byteLimit)
      throw new PreviewUnavailable('Preview exceeds byte limit');
    chunks.push(bytes);
  }

  return chunks;
}
