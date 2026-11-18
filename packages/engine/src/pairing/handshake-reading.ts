import type { ChannelCarrier } from './channel-carrier';
import { HandshakeBuffer } from './handshake-buffer';

export interface Reading {
  readonly socket: ChannelCarrier;
  readonly buffer: HandshakeBuffer;
  readonly proven: () => void;
}

export const readingOf = (
  socket: ChannelCarrier,
  proven: () => void,
): Reading => ({ socket, buffer: new HandshakeBuffer(), proven });

export function readMore(
  reading: Reading,
  read: (reading: Reading, chunk: Buffer) => void,
): void {
  reading.socket.once('data', (more: Buffer): void => read(reading, more));
}
