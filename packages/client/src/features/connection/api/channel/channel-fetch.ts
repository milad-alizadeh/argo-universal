import { channelRequest } from './channel-request';
import { exchange } from './http-exchange';
import type { OpenedChannel } from './open-channel';

export interface ChannelFetchDeps {
  readonly openChannel: () => Promise<OpenedChannel>;
  readonly randomBytes: (length: number) => Uint8Array;
}

/*
 * `fetch`, answered by the Server inside an open channel instead of over HTTP to an address (ADR-0045). A tRPC upload, a Blob and a Plugin asset all go through it, so no URL is built for a paired Server.
 * Each call opens its own channel with the same Device Key, which costs one handshake and keeps one slow download from holding up the tRPC socket.
 */
export const channelFetch =
  (deps: ChannelFetchDeps): typeof fetch =>
  async (input, init) => {
    const request = await channelRequest(input, init, deps.randomBytes);
    const { head, body } = await exchange(await deps.openChannel(), request);

    return new Response(body.length > 0 ? new Uint8Array(body) : null, {
      status: head.status,
      headers: Object.fromEntries(head.headers),
    });
  };
