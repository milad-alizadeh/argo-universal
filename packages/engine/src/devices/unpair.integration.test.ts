import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  channelClosed,
  connectAsDevice,
  openChannel,
} from '#mocks/engine-channel';
import { generateKeypair } from '../pairing/x25519';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

const forbidden = { data: { code: 'FORBIDDEN' } };

const refused = { code: 'FORBIDDEN' };

const freshTicket = async (host: Host): Promise<string> =>
  (await host.caller.pairing.mint()).invite.ticket;

// A Paired Device with a channel still open, the way a phone mid-Session has one.
type Connected = Awaited<ReturnType<typeof openChannel>> & {
  deviceKey: ReturnType<typeof generateKeypair>;
};

async function pairedAndConnected(host: Host): Promise<Connected> {
  const deviceKey = generateKeypair();

  const opened = await openChannel(host, {
    deviceKey,
    ticket: await freshTicket(host),
  });

  return { deviceKey, ...opened };
}

it('closes a Device’s open Connection at once when the owner unpairs it, and refuses its next call', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { socket, deviceKey, deviceId } = await pairedAndConnected(host);
  const closed = channelClosed(socket);

  await host.caller.devices.unpair({ deviceId });
  await closed;

  expect(await host.caller.devices.list()).toHaveLength(1);
  await expect(connectAsDevice(host, { deviceKey })).rejects.toMatchObject({
    refusal: 'ticket-required',
  });
});

it('lets an unpaired Device pair again with a fresh code', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { deviceKey, deviceId } = await pairedAndConnected(host);

  await host.caller.devices.unpair({ deviceId });

  const again = await connectAsDevice(host, {
    deviceKey,
    ticket: await freshTicket(host),
  });

  expect(await again.caller.system.info.query()).toBeDefined();
  expect(await host.caller.devices.list()).toHaveLength(2);
});

it('will not unpair the Server Device, or a Device that does not exist', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const [serverDevice] = await host.caller.devices.list();

  await expect(
    host.caller.devices.unpair({ deviceId: serverDevice?.id ?? '' }),
  ).rejects.toMatchObject(refused);
  await expect(
    host.caller.devices.unpair({ deviceId: 'nobody' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  expect(await host.caller.devices.list()).toEqual([serverDevice]);
});

it('refuses a Paired Device that tries to unpair another', async (): Promise<void> => {
  const host = await startEngineTestHost();

  const other = await connectAsDevice(host, {
    ticket: await freshTicket(host),
  });

  const self = await connectAsDevice(host, { ticket: await freshTicket(host) });

  await expect(
    self.caller.devices.unpair.mutate({ deviceId: other.deviceId }),
  ).rejects.toMatchObject(forbidden);
  expect(await host.caller.devices.list()).toHaveLength(3);
});

it('lets a Paired Device unpair itself, closing its Connection and leaving it free to pair again', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const { deviceKey } = await pairedAndConnected(host);
  const watched = await openChannel(host, { deviceKey });
  const closed = channelClosed(watched.socket);
  const self = await connectAsDevice(host, { deviceKey });

  await self.caller.devices.unpairSelf.mutate();
  await closed;

  expect(await host.caller.devices.list()).toHaveLength(1);
  await expect(connectAsDevice(host, { deviceKey })).rejects.toMatchObject({
    refusal: 'ticket-required',
  });
  await connectAsDevice(host, { deviceKey, ticket: await freshTicket(host) });
  expect(await host.caller.devices.list()).toHaveLength(2);
});

it('has no unpair-self for the Server Device', async (): Promise<void> => {
  const host = await startEngineTestHost();

  await expect(host.caller.devices.unpairSelf()).rejects.toMatchObject(refused);
  expect(await host.caller.devices.list()).toHaveLength(1);
});
