import { lookup as dnsLookup } from 'node:dns';
import type { IncomingMessage } from 'node:http';
import { request, type RequestOptions } from 'node:https';
import type { LookupFunction } from 'node:net';
import { CapabilityRefusal } from './capability-refusal';
import type { PluginAccess } from './plugin-access';
import { checkedLookup } from './plugin-addresses';
import { redirected, responseValue, type Hop } from './plugin-fetch-response';
import type { FetchCall, PluginValue } from './runtime-protocol';

// What the Server decides about TLS and name lookup; tests pass a fixture certificate authority and resolver.
export type PluginNetwork = {
  ca?: string;
  lookup?: LookupFunction;
};

// One `argo.fetch` call: whose Capabilities it is checked against, the Server's network, and its deadline.
export type FetchContext = {
  access: PluginAccess;
  network: PluginNetwork;
  signal: AbortSignal;
};

const maxRedirects = 10;

// Headers that would send a request to another host than the one checked, or past its TLS name.
const refusedHeaders = new Set(['host', ':authority']);

/*
 * `argo.fetch` over HTTPS only. The Server follows redirects itself and checks every hop's host,
 * and checks every address a name resolves to when it connects.
 */
export async function fetchCall(
  hop: Hop,
  context: FetchContext,
): Promise<PluginValue> {
  return follow(hop, context, 0);
}

async function follow(
  hop: Hop,
  context: FetchContext,
  redirects: number,
): Promise<PluginValue> {
  const response = await send(hop, context);
  const next = redirected(hop, response);

  if (!next) return responseValue(response);

  response.resume();

  if (redirects === maxRedirects)
    throw new Error(`More than ${maxRedirects} redirects`);

  return follow(next, context, redirects + 1);
}

function parsedUrl(url: string): URL {
  if (!URL.canParse(url)) throw new CapabilityRefusal(`${url} is not a URL`);

  return new URL(url);
}

// The call as its first request, refused before anything is sent if it names a refused header.
export function firstHop({
  url,
  method = 'GET',
  headers = {},
  body,
}: FetchCall): Hop {
  allowHeaders(headers);

  return { url: parsedUrl(url), method: method.toUpperCase(), headers, body };
}

function allowHeaders(headers: Record<string, string>): void {
  for (const name of Object.keys(headers))
    if (refusedHeaders.has(name.toLowerCase()))
      throw new CapabilityRefusal(`The ${name} header is never allowed`);
}

function send(hop: Hop, context: FetchContext): Promise<IncomingMessage> {
  const options = requestOptions(hop, context);

  return new Promise((resolve, reject) => {
    const outgoing = request(hop.url, options);

    outgoing.once('response', resolve);
    outgoing.once('error', reject);
    outgoing.end(hop.body);
  });
}

// Checks the hop's host before anything is sent, then pins the checks to its socket.
function requestOptions(
  hop: Hop,
  { access, network, signal }: FetchContext,
): RequestOptions {
  const rule = access.checkHost(hop.url);

  return {
    method: hop.method,
    headers: hop.headers,
    signal,
    // A pooled socket could have been connected under another Plugin's rule.
    agent: false,
    lookup: checkedLookup(rule, network.lookup ?? dnsLookup),
    ca: network.ca,
  };
}
