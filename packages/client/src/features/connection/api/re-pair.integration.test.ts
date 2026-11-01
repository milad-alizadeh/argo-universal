import { startEngineTestHost } from '@repo/engine/mocks';
import { expect, it } from 'vitest';
import {
  endpointOf,
  nodeChannelPlatform,
} from '../../../../mocks/node-channel-platform';
import { pairWithServer } from './pair-with-server';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

async function allow(host: Host): Promise<void> {
  for await (const asking of await host.caller.pairing.registered()) {
    await host.caller.pairing.allow({ deviceId: asking.deviceId });

    return;
  }
}

// The same phone pairs, is unpaired on the Server Device, and pairs again with a new code: its Device Key is the one the Server just forgot.
it('pairs again with the same Device Key after the owner unpaired it', async () => {
  const host = await startEngineTestHost();
  const endpoint = await endpointOf(host);
  const platform = nodeChannelPlatform();

  const [first] = await Promise.all([
    pairWithServer(endpoint, host.pairing.mint().ticket, { platform }),
    allow(host),
  ]);

  await host.caller.devices.unpair({ deviceId: first.deviceId });
  expect(await host.caller.devices.list()).toHaveLength(1);

  const [again] = await Promise.all([
    pairWithServer(endpoint, host.pairing.mint().ticket, { platform }),
    allow(host),
  ]);

  expect(again.deviceId).toEqual(expect.any(String));
  expect(await host.caller.devices.list()).toHaveLength(2);
}, 15000);
