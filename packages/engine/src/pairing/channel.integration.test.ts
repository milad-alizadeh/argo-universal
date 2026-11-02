import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice } from '#mocks/engine-channel';
import { PairingRefused } from './connect-channel';

it('gives a Device that spends a Pairing Ticket its own row and a Connection', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  const device = await connectAsDevice(host, { ticket, name: 'Milad iPhone' });

  expect(await device.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
  expect(await host.caller.devices.list()).toEqual([
    expect.objectContaining({ serverDevice: true }),
    expect.objectContaining({
      id: device.deviceId,
      name: 'Milad iPhone',
      platform: 'ios',
      serverDevice: false,
    }),
  ]);
});

it('keeps answering a Device that paired once and no longer holds a Ticket', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  const paired = await connectAsDevice(host, { ticket });

  const again = await connectAsDevice(host, { deviceKey: paired.deviceKey });

  expect(again.deviceId).toBe(paired.deviceId);
  expect(await again.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
});

it('lets a Pairing Ticket pair one Device and no second one', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();
  await connectAsDevice(host, { ticket });

  await expect(connectAsDevice(host, { ticket })).rejects.toMatchObject({
    refusal: 'ticket-spent',
  });
  expect(await host.caller.devices.list()).toHaveLength(2);
});

it('tells a Device that brings no Pairing Ticket that it needs one', async (): Promise<void> => {
  const host = await startEngineTestHost();

  await expect(connectAsDevice(host)).rejects.toThrow(PairingRefused);
  expect(await host.caller.devices.list()).toHaveLength(1);
});

it('refuses a Pairing Ticket nobody minted without spending a real one', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  await expect(
    connectAsDevice(host, { ticket: '000000' }),
  ).rejects.toMatchObject({ refusal: 'ticket-unknown' });

  const device = await connectAsDevice(host, { ticket });

  expect(device.deviceId).toEqual(expect.any(String));
});

it('follows the row of the paired Device it recognises, and leaves the Server Device alone', async (): Promise<void> => {
  let clock = 1_700_000_000_000;
  const host = await startEngineTestHost({ now: (): number => clock });
  const { ticket } = host.pairing.mint();
  const paired = await connectAsDevice(host, { ticket });

  clock += 60_000;
  await paired.caller.system.info.query();

  const [serverDevice, device] = await host.caller.devices.list();

  expect(device).toMatchObject({
    id: paired.deviceId,
    lastSeenAt: new Date(clock).toISOString(),
  });
  expect(serverDevice).toMatchObject({ serverDevice: true, lastSeenAt: null });
});

it('refuses a Pairing Ticket that has run out of time with its own reason', async (): Promise<void> => {
  let clock = 1_000_000;
  const host = await startEngineTestHost({ now: (): number => clock });
  const { ticket, expiresAt } = host.pairing.mint();

  clock = expiresAt + 1;

  await expect(connectAsDevice(host, { ticket })).rejects.toMatchObject({
    refusal: 'ticket-expired',
  });
  expect(await host.caller.devices.list()).toHaveLength(1);
});
