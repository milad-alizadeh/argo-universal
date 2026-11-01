import { pairingAnswerLifetimeMs } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice } from '#mocks/engine-channel';
import { PairingRefused } from './connect-channel';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

// A Device has scanned and the owner has not answered, so the Server is holding its registration and the connection the Device is waiting on has not settled.
async function waiting(
  host: Host,
  name = 'Test iPhone',
): Promise<{
  connecting: ReturnType<typeof connectAsDevice>;
  deviceId: string;
  claimedName: string;
}> {
  const { invite } = await host.caller.pairing.mint();

  const connecting = connectAsDevice(host, {
    name,
    ticket: invite.ticket,
    answer: 'none',
  });

  for await (const asking of await host.caller.pairing.registered())
    return { connecting, ...asking };

  throw new Error('The Server held no registration');
}

async function onlyTheServerDevice(host: Host): Promise<void> {
  expect(await host.caller.devices.list()).toEqual([
    expect.objectContaining({ serverDevice: true }),
  ]);
}

it('holds a Device that has only scanned: no row, until the owner allows it', async (): Promise<void> => {
  const host = await startEngineTestHost();

  const { connecting, deviceId, claimedName } = await waiting(
    host,
    'iPhone 15 Pro',
  );

  expect(claimedName).toBe('iPhone 15 Pro');
  await onlyTheServerDevice(host);

  await host.caller.pairing.allow({ deviceId });
  const device = await connecting;

  expect(device.deviceId).toBe(deviceId);
  expect(await host.caller.devices.list()).toHaveLength(2);
  expect(await device.caller.system.info.query()).toMatchObject({
    version: '1.2.3',
  });
});

it('leaves a declined Device with no row, no Connection and no way back in', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { connecting, deviceId } = await waiting(host);

  await Promise.all([
    expect(connecting).rejects.toMatchObject({ refusal: 'declined' }),
    host.caller.pairing.decline({ deviceId }),
  ]);

  await onlyTheServerDevice(host);
});

it('leaves a Device nobody answered with no row once the sheet closes', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { connecting } = await waiting(host);

  await Promise.all([
    expect(connecting).rejects.toMatchObject({ refusal: 'unanswered' }),
    host.caller.pairing.revoke(),
  ]);

  await onlyTheServerDevice(host);
});

it('leaves a Device nobody answered with no row once the Server stops holding it', async (): Promise<void> => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });

  try {
    const host = await startEngineTestHost();
    const { connecting } = await waiting(host);

    await Promise.all([
      expect(connecting).rejects.toMatchObject({ refusal: 'unanswered' }),
      vi.advanceTimersByTimeAsync(pairingAnswerLifetimeMs),
    ]);

    await onlyTheServerDevice(host);
  } finally {
    vi.useRealTimers();
  }
});

it('answers one prompt once, so Allow after No pairs nothing', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { connecting, deviceId } = await waiting(host);

  await Promise.all([
    expect(connecting).rejects.toThrow(PairingRefused),
    host.caller.pairing.decline({ deviceId }),
  ]);

  await expect(host.caller.pairing.allow({ deviceId })).rejects.toThrow(
    'That Device is not asking to pair',
  );
  await onlyTheServerDevice(host);
});
