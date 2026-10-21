import { lookup } from 'node:dns';
import {
  request as httpRequest,
  type IncomingMessage,
  type RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
import {
  allowLiteral,
  checkedLookup,
} from '../plugins/access/plugin-addresses';

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

export function previewUrl(href: string): URL {
  const url = new URL(href);
  requireProtocol(url);
  requireAnonymous(url);
  allowLiteral(url, publicHost);
  url.hash = '';

  return url;
}

function requireProtocol(url: URL): void {
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Unsupported preview protocol');
}

function requireAnonymous(url: URL): void {
  if ([url.username, url.password, url.port].some(Boolean))
    throw new Error('Unsupported preview authority');
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
  if (redirects >= redirectLimit) throw new Error('Too many preview redirects');

  if (!response.headers.location) throw new Error('Missing redirect location');

  return previewUrl(new URL(response.headers.location, url).href);
}

async function readResponse(
  response: IncomingMessage,
  url: URL,
): Promise<PreviewResponse> {
  if (response.statusCode !== ok) throw new Error('Preview fetch failed');

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
    outgoing.once('error', reject);
    outgoing.end();
  });
}

async function readBytes(response: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of response) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;

    if (size > byteLimit) throw new Error('Preview exceeds byte limit');
    chunks.push(bytes);
  }

  return Buffer.concat(chunks);
}
