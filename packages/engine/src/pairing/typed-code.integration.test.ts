import { connect } from 'node:net';
import { pairingTicketAttempts } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { askForServerKey, connectWithTypedCode } from '#mocks/engine-channel';
import { frameRecord } from './frames';
import { askForKey, keyMagic } from './key-offer';

const wrong = 'ZZZZZZZZZZ';

const studioMac = 'Studio Mac';

const unknown = 'ticket-unknown';

const ignore = (): void => {};

it('pairs a Device that was typed the code, and ends in the same Allow', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  const device = await connectWithTypedCode(host, {
    ticket,
    name: studioMac,
    platform: 'macos',
  });

  expect(await device.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
  expect(await host.caller.devices.list()).toEqual([
    expect.objectContaining({ serverDevice: true }),
    expect.objectContaining({ id: device.deviceId, name: studioMac }),
  ]);
});

it('holds the Device for the owner exactly as a scanned code does', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { invite } = await host.caller.pairing.mint();

  const connecting = connectWithTypedCode(host, {
    ticket: invite.ticket,
    name: studioMac,
    answer: 'none',
  });

  for await (const asking of await host.caller.pairing.registered()) {
    expect(asking.claimedName).toBe(studioMac);
    expect(await host.caller.devices.list()).toHaveLength(1);
    await host.caller.pairing.decline({ deviceId: asking.deviceId });
    break;
  }

  await expect(connecting).rejects.toMatchObject({ refusal: 'declined' });
});

it('gives the Server key the QR would have carried, to a holder of the code', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  expect(await askForServerKey(host, ticket)).toBe(
    (await host.caller.devices.serverKey()).publicKey,
  );
});

it('says a mistyped code is wrong, and takes the right one next without a new code', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  await expect(askForServerKey(host, wrong)).rejects.toMatchObject({
    refusal: unknown,
  });

  const device = await connectWithTypedCode(host, { ticket });

  expect(device.deviceId).toEqual(expect.any(String));
});

it('does not spend the Ticket by being asked for the key', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  await askForServerKey(host, ticket);
  await askForServerKey(host, ticket);

  await connectWithTypedCode(host, { ticket });
  await expect(connectWithTypedCode(host, { ticket })).rejects.toMatchObject({
    refusal: 'ticket-spent',
  });
});

it('tells the holder of a spent code that it is spent', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  await connectWithTypedCode(host, { ticket });

  await expect(askForServerKey(host, ticket)).rejects.toMatchObject({
    refusal: 'ticket-spent',
  });
});

it('tells the holder of a code that has run out of time that it has', async (): Promise<void> => {
  let clock = 1_000_000;
  const host = await startEngineTestHost({ now: (): number => clock });
  const { ticket, expiresAt } = host.pairing.mint();

  clock = expiresAt + 1;

  await expect(askForServerKey(host, ticket)).rejects.toMatchObject({
    refusal: 'ticket-expired',
  });
});

it('turns a source away once it has been wrong as often as a Ticket allows', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  for (let time = 0; time < pairingTicketAttempts; time += 1)
    await askForServerKey(host, wrong).catch(ignore);

  await expect(askForServerKey(host, ticket)).rejects.toMatchObject({
    refusal: 'ticket-attempts',
  });
});

it('does not hand the key to a question someone watched go by and repeated', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  const question = frameRecord(askForKey(ticket));

  expect((await replied(host, question)).length).toBeGreaterThan(0);
  expect(await replied(host, question)).toHaveLength(0);
});

it('does not put the Server key on the wire where a watcher could read it', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  const key = Buffer.from(
    (await host.caller.devices.serverKey()).publicKey,
    'base64url',
  ).subarray(-32);

  const reply = await replied(host, frameRecord(askForKey(ticket)));

  expect(reply.includes(key)).toBe(false);
});

// Whatever the Server sent back to a question sent as it was, before it closed the socket.
function replied(
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  question: Buffer,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve): void => {
    const chunks: Buffer[] = [];

    const socket = connect(Number(new URL(host.url).port), '127.0.0.1', () =>
      socket.write(Buffer.concat([keyMagic, question])),
    );

    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('error', ignore);
    socket.on('close', () => resolve(Buffer.concat(chunks)));
  });
}
