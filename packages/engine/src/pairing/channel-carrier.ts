import type { Duplex } from 'node:stream';

/*
 * What a channel's bytes arrive on: a raw TCP socket, or a WebSocket at the channel path that carries the same bytes (ADR-0045).
 * The doors read and write it as a stream, and learn only where its peer knocked from, which is what a Ticket's wrong guesses are held against.
 */
export type ChannelCarrier = Duplex & {
  readonly remoteAddress?: string;
  readonly localAddress?: string;
};
