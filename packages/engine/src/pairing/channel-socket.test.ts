import { randomBytes } from 'node:crypto';
import { Duplex } from 'node:stream';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { ChannelCipher } from './channel-cipher';
import { ChannelSocket } from './channel-socket';
import { CipherState } from './cipher-state';
import { FrameReader, frameRecord } from './frames';

interface OpenChannel {
  socket: ChannelSocket;
  carrier: Duplex;
  writes: Buffer[];
  peer: ChannelCipher;
}

function openChannel(compression = false): OpenChannel {
  const key = randomBytes(32);
  const receiveKey = randomBytes(32);

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
    new ChannelCipher(new CipherState(key), new CipherState(receiveKey)),
    compression,
  );

  return {
    socket,
    carrier,
    writes,
    peer: new ChannelCipher(new CipherState(receiveKey), new CipherState(key)),
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

const json = (rows: number): Buffer =>
  Buffer.from(
    JSON.stringify(
      Array.from({ length: rows }, (_, id) => ({
        id,
        kind: 'agent_message',
        text: 'The quick brown fox jumps over the lazy dog',
      })),
    ),
  );

const sentRecords = (writes: Buffer[], peer: ChannelCipher): Buffer[] =>
  new FrameReader().push(Buffer.concat(writes)).map((r) => peer.open(r));

// The leading byte says whether the rest is deflated: 0 as it is, 1 raw deflate.
it('sends a large message deflated, behind a leading byte, when the peer offered compression', () => {
  const { socket, writes, peer } = openChannel(true);
  const message = json(600);

  socket.write(message);

  const [record, ...more] = sentRecords(writes, peer);

  expect(more).toEqual([]);
  expect(record?.[0]).toBe(1);
  expect(inflateRawSync(record?.subarray(1) ?? Buffer.alloc(0))).toEqual(
    message,
  );
  expect(writes.reduce((sum, w) => sum + w.length, 0)).toBeLessThan(
    message.length / 5,
  );
});

it('cuts a large message into records that are each deflated alone', () => {
  const { socket, writes, peer } = openChannel(true);
  const message = json(40_000);

  socket.write(message);

  const records = sentRecords(writes, peer);

  expect(records.length).toBeGreaterThan(1);
  expect(records.every((record) => record[0] === 1)).toBe(true);
  expect(
    Buffer.concat(records.map((record) => inflateRawSync(record.subarray(1)))),
  ).toEqual(message);
});

it('sends a message under a kilobyte as it is, behind a zero byte', () => {
  const { socket, writes, peer } = openChannel(true);

  socket.write(Buffer.from('a'.repeat(1000)));

  expect(sentRecords(writes, peer)).toEqual([
    Buffer.concat([Buffer.from([0]), Buffer.from('a'.repeat(1000))]),
  ]);
});

it('sends a message that is already compressed as it is', () => {
  const { socket, writes, peer } = openChannel(true);
  const image = randomBytes(5000);

  socket.write(image);

  expect(sentRecords(writes, peer)).toEqual([
    Buffer.concat([Buffer.from([0]), image]),
  ]);
});

it('sends plain records, with no leading byte, when the peer did not offer compression', () => {
  const { socket, writes, peer } = openChannel(false);
  const message = json(600);

  socket.write(message);

  const records = sentRecords(writes, peer);

  expect(Buffer.concat(records)).toEqual(message);
});

it('reads deflated and stored records from the peer as one stream', async () => {
  const { socket, carrier, peer } = openChannel(true);
  const message = json(600);

  const record = (body: Buffer): Buffer => frameRecord(peer.seal(body));

  const read = new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];

    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk);

      if (Buffer.concat(chunks).length === message.length + 3)
        resolve(Buffer.concat(chunks));
    });
  });

  carrier.push(
    Buffer.concat([
      record(Buffer.concat([Buffer.from([0]), Buffer.from('abc')])),
      record(Buffer.concat([Buffer.from([1]), deflateRawSync(message)])),
    ]),
  );

  expect(await read).toEqual(Buffer.concat([Buffer.from('abc'), message]));
});

it('ends the channel on a record that inflates to more than a record holds', async () => {
  const { socket, carrier, peer } = openChannel(true);
  const bomb = deflateRawSync(Buffer.alloc(10_000_000));

  const closed = new Promise<Error>((resolve) => socket.once('error', resolve));

  carrier.push(frameRecord(peer.seal(Buffer.concat([Buffer.from([1]), bomb]))));

  expect(await closed).toBeInstanceOf(Error);
});
