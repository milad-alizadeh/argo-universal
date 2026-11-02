import { expect, it } from 'vitest';
import { answerOverChannel } from '#mocks/channel-fetch';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice, type TestDevice } from '#mocks/engine-channel';
import { PairingRefused } from './connect-channel';

it('carries the key, the name and the Ticket a Device needs to find and prove this Server', async (): Promise<void> => {
  const { caller } = await startEngineTestHost({ discoveryName: 'Studio Mac' });

  const minted = await caller.pairing.mint();

  expect(minted.invite).toEqual({
    key: (await caller.devices.serverKey()).publicKey,
    server: 'Studio Mac',
    ticket: expect.stringMatching(/^\d{6}$/),
  });
  expect(Date.parse(minted.expiresAt)).toBeGreaterThan(Date.now());
});

it('pairs a Device with a Ticket the sheet minted, and no Device without one', async (): Promise<void> => {
  const host = await startEngineTestHost();

  await expect(connectAsDevice(host)).rejects.toThrow(PairingRefused);

  const { invite } = await host.caller.pairing.mint();
  const device = await connectAsDevice(host, { ticket: invite.ticket });

  expect(await device.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
});

it('mints a fresh Ticket each time the sheet redraws the code', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();

  const first = await caller.pairing.mint();
  const second = await caller.pairing.mint();

  expect(second.invite.ticket).not.toBe(first.invite.ticket);
});

it('says a Ticket has expired once its two minutes are up', async (): Promise<void> => {
  let clock = 1_700_000_000_000;
  const host = await startEngineTestHost({ now: (): number => clock });
  const { invite, expiresAt } = await host.caller.pairing.mint();

  clock = Date.parse(expiresAt) + 1;

  await expect(
    connectAsDevice(host, { ticket: invite.ticket }),
  ).rejects.toMatchObject({ refusal: 'ticket-expired' });
});

it('leaves a revoked Ticket good for nothing, so the closed sheet outlives nothing', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { invite } = await host.caller.pairing.mint();

  await host.caller.pairing.revoke();

  await expect(
    connectAsDevice(host, { ticket: invite.ticket }),
  ).rejects.toMatchObject({ refusal: 'ticket-unknown' });
  expect(await host.caller.devices.list()).toHaveLength(1);
});

it('declines nothing when asked for a Device that is not asking to pair', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  const [serverDevice] = await caller.devices.list();

  await expect(
    caller.pairing.decline({ deviceId: serverDevice?.id ?? '' }),
  ).rejects.toThrow('That Device is not asking to pair');

  expect(await caller.devices.list()).toEqual([serverDevice]);
});

// Pairing is the Server Device's alone: a Paired Device that could mint a Ticket could pair another Device, which is the lost-phone case ADR-0022 forbids.
it('lets no Paired Device pair another, watch who is pairing, or answer for one', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  const paired = await connectAsDevice(host, { ticket });
  const forbidden = { data: { code: 'FORBIDDEN' } };

  await expect(paired.caller.pairing.mint.mutate()).rejects.toMatchObject(
    forbidden,
  );
  await expect(paired.caller.pairing.revoke.mutate()).rejects.toMatchObject(
    forbidden,
  );
  await expect(
    paired.caller.pairing.allow.mutate({ deviceId: paired.deviceId }),
  ).rejects.toMatchObject(forbidden);
  await expect(
    paired.caller.pairing.decline.mutate({ deviceId: paired.deviceId }),
  ).rejects.toMatchObject(forbidden);
  expect(await watching(host, paired)).toContain('FORBIDDEN');
});

/*
 * Asking to watch the registrations, as its own request over the Device's channel: `httpLink` refuses a subscription in the App, so a test that wants the Server's answer has to send one.
 */
const watching = (host: { url: string }, paired: TestDevice): Promise<string> =>
  answerOverChannel(paired.channel, `${host.url}/trpc/pairing.registered`, {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
  });
