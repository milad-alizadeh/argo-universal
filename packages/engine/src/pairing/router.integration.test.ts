import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice } from '#mocks/engine-channel';
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

it('names the Device that registered, by the name the Device itself claimed', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const registered = await host.caller.pairing.registered();
  const { invite } = await host.caller.pairing.mint();

  const device = await connectAsDevice(host, {
    ticket: invite.ticket,
    name: 'iPhone 15 Pro',
  });

  expect((await registered[Symbol.asyncIterator]().next()).value).toEqual({
    deviceId: device.deviceId,
    claimedName: 'iPhone 15 Pro',
    claimedPlatform: 'ios',
  });
});

it('leaves a declined Device off the Devices list and with no way back in', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { invite } = await host.caller.pairing.mint();
  const device = await connectAsDevice(host, { ticket: invite.ticket });

  await host.caller.pairing.decline({ deviceId: device.deviceId });

  expect(await host.caller.devices.list()).toEqual([
    expect.objectContaining({ serverDevice: true }),
  ]);
  await expect(
    connectAsDevice(host, { deviceKey: device.deviceKey }),
  ).rejects.toMatchObject({ refusal: 'ticket-required' });
});

it('declines nothing when asked for the Server Device, so the owner cannot lock themselves out', async (): Promise<void> => {
  const { caller } = await startEngineTestHost();
  const [serverDevice] = await caller.devices.list();

  await caller.pairing.decline({ deviceId: serverDevice?.id ?? '' });

  expect(await caller.devices.list()).toEqual([serverDevice]);
});
