import { randomBytes } from 'node:crypto';
import { Duplex } from 'node:stream';
import { expect, it } from 'vitest';
import { ChannelCipher } from './channel-cipher';
import { ChannelSocket } from './channel-socket';
import { CipherState } from './cipher-state';
import { FrameReader } from './frames';

interface OpenChannel {
  socket: ChannelSocket;
  writes: Buffer[];
  peer: ChannelCipher;
}

function openChannel(): OpenChannel {
  const key = randomBytes(32);

  const writes: Buffer[] = [];

  const carrier = new Duplex({
    read: (): void => {},
    write: (chunk: Buffer, _encoding, done): void => {
      writes.push(chunk);
      done();
    },
  });

  const socket = new ChannelSocket(
    carrier,
    new ChannelCipher(new CipherState(key), new CipherState(randomBytes(32))),
  );

  return {
    socket,
    writes,
    peer: new ChannelCipher(
      new CipherState(randomBytes(32)),
      new CipherState(key),
    ),
  };
}

it('sends a message written in two parts as one record', () => {
  const { socket, writes, peer } = openChannel();

  socket.cork();
  socket.write(Buffer.from('header'));
  socket.write(Buffer.from('payload'));
  socket.uncork();

  const records = new FrameReader().push(Buffer.concat(writes));

  expect(records).toHaveLength(1);
  expect(records.map((record) => peer.open(record).toString())).toEqual([
    'headerpayload',
  ]);
});
