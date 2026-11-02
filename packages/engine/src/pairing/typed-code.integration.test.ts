import { randomBytes } from 'node:crypto';
import { pairingTicketAttempts } from '@repo/contracts';
import { startRun } from '@repo/contracts/pake';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { askForServerKey, connectWithTypedCode } from '#mocks/engine-channel';
import type { ChannelAddress } from './connect-channel';
import { exchange } from './request-server-key';

// Never a Ticket the host minted, however it came out.
const wrongFor = (ticket: string): string =>
  ticket === '000000' ? '111111' : '000000';

const studioMac = 'Studio Mac';

const unknown = 'ticket-unknown';

const ignore = (): void => {};

const addressOf = (host: { url: string }): ChannelAddress => ({
  host: '127.0.0.1',
  port: Number(new URL(host.url).port),
});

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

  await expect(askForServerKey(host, wrongFor(ticket))).rejects.toMatchObject({
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
    await askForServerKey(host, wrongFor(ticket)).catch(ignore);

  await expect(askForServerKey(host, ticket)).rejects.toMatchObject({
    refusal: 'ticket-attempts',
  });
});

it('counts nothing against a Device that proves it holds the code', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  for (let time = 0; time < pairingTicketAttempts * 2; time += 1)
    expect(await askForServerKey(host, ticket)).toEqual(expect.any(String));
});

it('gives nothing to someone who repeats what they watched go by, and counts them', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  const device = startRun(ticket, randomBytes);
  const address = addressOf(host);

  const first = await exchange(
    address,
    device.ask,
    (reply) => device.read(reply).confirm,
  );

  const watched = device.read(first).confirm;

  for (let time = 0; time < pairingTicketAttempts; time += 1)
    await exchange(address, device.ask, () => watched);

  await expect(askForServerKey(host, ticket)).rejects.toMatchObject({
    refusal: 'ticket-attempts',
  });
});

it('does not put the Server key on the wire where a watcher could read it', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  const key = Buffer.from(
    (await host.caller.devices.serverKey()).publicKey,
    'base64url',
  ).subarray(-32);

  const reply = await exchange(
    addressOf(host),
    startRun(ticket, randomBytes).ask,
  );

  expect(reply.length).toBeGreaterThan(0);
  expect(reply.includes(key)).toBe(false);
});

it('answers the same size whether or not any Ticket is outstanding', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const ask = startRun('123456', randomBytes).ask;
  const none = await exchange(addressOf(host), ask);

  host.pairing.mint();

  expect(await exchange(addressOf(host), ask)).toHaveLength(none.length);
});
