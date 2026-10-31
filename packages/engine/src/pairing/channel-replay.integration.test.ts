import { connect } from 'node:net';
import { PairingWelcome } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice } from '#mocks/engine-channel';
import { channelMagic } from './channel-door';
import { FrameReader, frameRecord } from './frames';
import { startHandshake } from './handshake-initiator';
import { generateKeypair, rawFromStoredPublicKey } from './x25519';

// One socket, the given first message, and whatever single record the Server answers with.
const sendHandshake = (port: number, message: Buffer): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject): void => {
    const records = new FrameReader();

    const socket = connect(port, '127.0.0.1', (): void => {
      socket.write(Buffer.concat([channelMagic, frameRecord(message)]));
    });

    socket.on('data', (chunk: Buffer): void => {
      const [record] = records.push(chunk);

      if (!record) return;
      socket.destroy();
      resolve(record);
    });

    socket.once('error', reject);
  });

it('refuses a first message it has already answered, and the same Device on a fresh one', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const port = Number(new URL(host.url).port);
  const { publicKey } = await host.caller.devices.serverKey();
  const deviceKey = generateKeypair();
  const { ticket } = host.pairing.mint();

  const handshake = startHandshake({
    deviceKey,
    serverPublicKey: rawFromStoredPublicKey(publicKey),
    claim: Buffer.from(
      JSON.stringify({ ticket, name: 'Test iPhone', platform: 'ios' }),
    ),
  });

  await sendHandshake(port, handshake.message);
  const answer = handshake.accept(await sendHandshake(port, handshake.message));

  expect(PairingWelcome.parse(JSON.parse(answer.welcome.toString()))).toEqual({
    paired: false,
    refusal: 'replayed',
  });

  const again = await connectAsDevice(host, { deviceKey });

  expect(await again.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
});

it('answers no Device that was given another Server static key', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const other = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  await expect(
    connectAsDevice(host, {
      ticket,
      serverPublicKey: (await other.caller.devices.serverKey()).publicKey,
    }),
  ).rejects.toThrow(/closed the channel/);
  expect(await host.caller.devices.list()).toHaveLength(1);
});
