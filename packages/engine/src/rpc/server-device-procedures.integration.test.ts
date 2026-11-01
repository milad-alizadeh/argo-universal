import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectAsDevice, type TestDevice } from '#mocks/engine-channel';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

// A Server with one Paired Device, reached the way an App reaches it: a real socket and the shipped handshake.
const serverWithPairedDevice = async (): Promise<{
  host: Host;
  paired: TestDevice;
}> => {
  const host = await startEngineTestHost();
  const { ticket } = host.pairing.mint();

  return { host, paired: await connectAsDevice(host, { ticket }) };
};

const forbidden = { data: { code: 'FORBIDDEN' } };

it('tells a Paired Device nothing about the other Devices', async (): Promise<void> => {
  const { host, paired } = await serverWithPairedDevice();

  await expect(paired.caller.devices.list.query()).rejects.toMatchObject(
    forbidden,
  );
  await expect(paired.caller.devices.serverKey.query()).rejects.toMatchObject(
    forbidden,
  );
  expect(await host.caller.devices.list()).toHaveLength(2);
  expect(await host.caller.devices.serverKey()).toEqual({
    publicKey: expect.any(String),
  });
});

it('keeps the Local network access switch out of a Paired Device’s reach', async (): Promise<void> => {
  const { host, paired } = await serverWithPairedDevice();

  await expect(paired.caller.network.localAccess.query()).rejects.toMatchObject(
    forbidden,
  );
  await expect(
    paired.caller.network.setLocalAccess.mutate({ enabled: false }),
  ).rejects.toMatchObject(forbidden);
  expect(await host.caller.network.localAccess()).toEqual({ enabled: false });
  expect(await host.caller.network.setLocalAccess({ enabled: true })).toEqual({
    enabled: true,
  });
});

it('tells a Paired Device neither whether the Server keeps running nor otherwise', async (): Promise<void> => {
  const { host, paired } = await serverWithPairedDevice();

  await expect(paired.caller.system.keepRunning.query()).rejects.toMatchObject(
    forbidden,
  );
  await expect(
    paired.caller.system.setKeepRunning.mutate({ enabled: true }),
  ).rejects.toMatchObject(forbidden);
  expect(await host.caller.system.setKeepRunning({ enabled: true })).toEqual({
    enabled: true,
  });
  expect(await host.caller.system.keepRunning()).toEqual({ enabled: true });
});

// The Server Device's own settings are the narrow list; what a Paired Device is for still answers it.
it('still tells a Paired Device about the Server it is paired to', async (): Promise<void> => {
  const { host, paired } = await serverWithPairedDevice();

  expect(await paired.caller.system.info.query()).toEqual(
    await host.caller.system.info(),
  );
});

it('answers a Paired Device’s Agents and Projects calls as it answers the Server Device’s', async (): Promise<void> => {
  const { host, paired } = await serverWithPairedDevice();

  expect(await paired.caller.agent.list.query()).toEqual(
    await host.caller.agent.list(),
  );
  expect(await paired.caller.project.list.query()).toEqual(
    await host.caller.project.list(),
  );
});
