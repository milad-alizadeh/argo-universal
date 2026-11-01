import { exchange, type HttpRequest } from './http-exchange';
import type { OpenedChannel } from './open-channel';

export interface ChannelFetchDeps {
  readonly openChannel: () => Promise<OpenedChannel>;
}

// Nothing is ever fetched from this name; it only gives a path somewhere to be relative to.
const channelBase = 'https://argo.channel';

const absolute = (input: RequestInfo | URL): string =>
  new URL(input instanceof Request ? input.url : input, channelBase).href;

// The request as bytes on a channel. Reading it through `Request` is what writes a form's multipart body and sets its boundary.
async function httpRequest(request: Request): Promise<HttpRequest> {
  const url = new URL(request.url);

  return {
    method: request.method,
    path: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
    body: new Uint8Array(await request.arrayBuffer()),
  };
}

/*
 * `fetch`, answered by the Server inside an open channel instead of over HTTP to an address (ADR-0045). A tRPC upload, a Blob and a Plugin asset all go through it, so no URL is built for a paired Server.
 * Each call opens its own channel with the same Device Key, which costs one handshake and keeps one slow download from holding up the tRPC socket.
 */
export const channelFetch =
  (deps: ChannelFetchDeps): typeof fetch =>
  async (input, init) => {
    const request = await httpRequest(new Request(absolute(input), init));
    const { head, body } = await exchange(await deps.openChannel(), request);

    return new Response(body.length > 0 ? new Uint8Array(body) : null, {
      status: head.status,
      headers: Object.fromEntries(head.headers),
    });
  };
